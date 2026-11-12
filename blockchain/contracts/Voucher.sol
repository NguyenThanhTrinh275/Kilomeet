// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IRunToken {
    function burnForPurchase(address from, uint256 amount) external;
}

/// @title Voucher - voucher cửa hàng (ERC-1155, mỗi id = một loại voucher)
/// @notice Mua = đốt RunToken. Tặng được đúng 1 lần. Quét QR = đốt voucher + ghi nhận phí (căn cứ tính phí).
///         Chuyển trực tiếp (safeTransferFrom) bị chặn; chỉ gift()/giftFor() mới chuyển được.
contract Voucher is ERC1155, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct VoucherType {
        address merchant;
        uint32 basePrice;    // giá gốc (token)
        uint16 discountBps;  // giảm khi làm xong nhiệm vụ, 5000 = 50%; 0 = không có nhiệm vụ
        uint32 maxSupply;
        uint32 sold;
        uint64 expiry;       // unix; 0 = không hết hạn
        bool active;
    }

    /// Mẫu số của discountBps: 10_000 bps = 100%.
    uint256 private constant BPS = 10_000;

    IRunToken public immutable runToken;
    uint256 public nextTypeId = 1;
    /// Phí mỗi lượt dùng (đồng VND, giả định 5.000). Chỉ để ghi nhận trong event.
    uint256 public feePerRedeemVnd = 5000;

    mapping(uint256 => VoucherType) private _types;
    mapping(address => bool) public approvedMerchant;
    /// user => typeId => đã dùng lượt giảm giá chưa (mỗi người giảm 1 lần/voucher)
    mapping(address => mapping(uint256 => bool)) public discountUsed;
    /// user => typeId => số voucher còn tặng được (chỉ voucher MUA, không phải voucher được tặng)
    mapping(address => mapping(uint256 => uint256)) public giftable;
    /// merchant => số lượt đã dùng / tổng phí ghi nhận (VND)
    mapping(address => uint256) public redeemCount;
    mapping(address => uint256) public feeAccruedVnd;

    bool private _internalTransfer;

    event MerchantApproved(address indexed merchant, bool approved);
    event VoucherTypeCreated(
        uint256 indexed typeId, address indexed merchant, uint32 basePrice, uint16 discountBps, uint32 maxSupply, uint64 expiry
    );
    event VoucherTypeActive(uint256 indexed typeId, bool active);
    event VoucherPurchased(uint256 indexed typeId, address indexed buyer, uint256 price, bool discounted);
    event VoucherGifted(uint256 indexed typeId, address indexed from, address indexed to);
    event VoucherRedeemed(
        uint256 indexed typeId, address indexed holder, address indexed merchant, uint256 feeVnd, uint256 redeemCount
    );
    event FeeUpdated(uint256 feeVnd);

    error NotMerchantOrOperator();
    error MerchantNotApproved();
    error UnknownType();
    error TypeInactive();
    error Expired();
    error SoldOut();
    error DiscountNotAvailable();
    error DiscountAlreadyUsed();
    error NotGiftable();
    error SelfGift();
    error NoVoucher();
    error TransfersDisabled();
    error BadParams();

    constructor(address admin, address operator, address runToken_) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        runToken = IRunToken(runToken_);
    }

    // ───────────── Cửa hàng ─────────────

    function setMerchantApproved(address merchant, bool approved) external onlyRole(OPERATOR_ROLE) {
        approvedMerchant[merchant] = approved;
        emit MerchantApproved(merchant, approved);
    }

    /// Cửa hàng (đã duyệt) hoặc backend thay mặt cửa hàng tạo loại voucher.
    function createVoucherType(address merchant, uint32 basePrice, uint16 discountBps, uint32 maxSupply, uint64 expiry)
        external
        returns (uint256 typeId)
    {
        if (msg.sender != merchant && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotMerchantOrOperator();
        if (!approvedMerchant[merchant]) revert MerchantNotApproved();
        if (basePrice == 0 || maxSupply == 0 || discountBps > BPS) revert BadParams();
        if (expiry != 0 && expiry <= block.timestamp) revert BadParams();

        typeId = nextTypeId++;
        _types[typeId] = VoucherType(merchant, basePrice, discountBps, maxSupply, 0, expiry, true);
        emit VoucherTypeCreated(typeId, merchant, basePrice, discountBps, maxSupply, expiry);
    }

    function setTypeActive(uint256 typeId, bool active) external {
        VoucherType storage t = _mustGet(typeId);
        if (msg.sender != t.merchant && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotMerchantOrOperator();
        t.active = active;
        emit VoucherTypeActive(typeId, active);
    }

    // ───────────── Mua ─────────────

    /// Giá phải trả (token).
    function priceOf(uint256 typeId, bool applyDiscount) public view returns (uint256) {
        VoucherType storage t = _mustGet(typeId);
        if (!applyDiscount) return t.basePrice;
        return (uint256(t.basePrice) * (BPS - t.discountBps)) / BPS;
    }

    /// Backend gọi sau khi đã xác minh: hạng, khu vực, nhiệm vụ voucher (GPS), trong hạn 7 ngày.
    /// Token của buyer bị đốt, 1 voucher vào ví buyer.
    function purchase(address buyer, uint256 typeId, bool applyDiscount) external onlyRole(OPERATOR_ROLE) {
        VoucherType storage t = _mustGet(typeId);
        if (!t.active) revert TypeInactive();
        if (t.expiry != 0 && block.timestamp > t.expiry) revert Expired();
        if (t.sold >= t.maxSupply) revert SoldOut();

        if (applyDiscount) {
            if (t.discountBps == 0) revert DiscountNotAvailable();
            if (discountUsed[buyer][typeId]) revert DiscountAlreadyUsed();
            discountUsed[buyer][typeId] = true;
        }

        uint256 price = priceOf(typeId, applyDiscount);
        t.sold += 1;
        runToken.burnForPurchase(buyer, price); // revert nếu thiếu token
        giftable[buyer][typeId] += 1;
        _mint(buyer, typeId, 1, "");
        emit VoucherPurchased(typeId, buyer, price, applyDiscount);
    }

    // ───────────── Tặng (1 lần) ─────────────

    /// Người giữ tự tặng. Voucher nhận được KHÔNG tặng tiếp được.
    function gift(address to, uint256 typeId) external {
        _gift(msg.sender, to, typeId);
    }

    /// Backend tặng thay (ví nhúng, gas do hệ thống trả). Chỉ dùng khi người giữ đã ký yêu cầu ở backend.
    function giftFor(address from, address to, uint256 typeId) external onlyRole(OPERATOR_ROLE) {
        _gift(from, to, typeId);
    }

    function _gift(address from, address to, uint256 typeId) internal {
        if (to == from || to == address(0)) revert SelfGift();
        VoucherType storage t = _mustGet(typeId);
        if (t.expiry != 0 && block.timestamp > t.expiry) revert Expired(); // không tặng voucher đã hết hạn
        if (giftable[from][typeId] == 0 || balanceOf(from, typeId) == 0) revert NotGiftable();
        giftable[from][typeId] -= 1;
        _internalTransfer = true;
        _safeTransferFrom(from, to, typeId, 1, "");
        _internalTransfer = false;
        emit VoucherGifted(typeId, from, to);
    }

    // ───────────── Dùng tại quầy ─────────────

    /// Cửa hàng (hoặc backend thay mặt) quét QR: đốt 1 voucher của holder, ghi nhận phí.
    function redeem(address holder, uint256 typeId) external {
        VoucherType storage t = _mustGet(typeId);
        if (msg.sender != t.merchant && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotMerchantOrOperator();
        if (t.expiry != 0 && block.timestamp > t.expiry) revert Expired();
        if (balanceOf(holder, typeId) == 0) revert NoVoucher();

        _burn(holder, typeId, 1);
        // giữ bất biến giftable <= số dư (voucher được tặng bị dùng trước)
        uint256 bal = balanceOf(holder, typeId);
        if (giftable[holder][typeId] > bal) giftable[holder][typeId] = bal;
        uint256 n = ++redeemCount[t.merchant];
        uint256 fee = feePerRedeemVnd;
        feeAccruedVnd[t.merchant] += fee;
        emit VoucherRedeemed(typeId, holder, t.merchant, fee, n);
    }

    function setFeePerRedeemVnd(uint256 feeVnd) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feePerRedeemVnd = feeVnd;
        emit FeeUpdated(feeVnd);
    }

    // ───────────── View ─────────────

    function getType(uint256 typeId) external view returns (VoucherType memory) {
        return _mustGet(typeId);
    }

    function _mustGet(uint256 typeId) internal view returns (VoucherType storage t) {
        t = _types[typeId];
        if (t.merchant == address(0)) revert UnknownType();
    }

    // ───────────── Chặn chuyển tự do ─────────────

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0) && !_internalTransfer) revert TransfersDisabled();
        // Dùng xong là tắt NGAY (trước khi OpenZeppelin gọi callback onERC1155Received của người nhận),
        // để hợp đồng người nhận không lợi dụng cờ này chuyển voucher tự do trong callback.
        _internalTransfer = false;
        super._update(from, to, ids, values);
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TransfersDisabled();
    }

    function supportsInterface(bytes4 id) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(id);
    }
}
