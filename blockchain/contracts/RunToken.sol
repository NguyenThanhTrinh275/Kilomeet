// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RunToken - token KILOMeet (ERC-20, KHÔNG chuyển được giữa người dùng)
/// @notice Chỉ được: mint khi hoàn thành nhiệm vụ, burn khi mua voucher, burn phần vượt mức khi chốt mùa.
///         decimals = 0 nên 10 token = 10 đơn vị (khớp tài liệu: 10 token/ngày, 7 token/km).
contract RunToken is ERC20, AccessControl {
    /// Backend (relayer): phát token khi nhiệm vụ đạt, mở/đóng/chốt mùa.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    /// Hợp đồng Voucher: được đốt token của người mua.
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// Số token giữ lại tối đa theo hạng: 0 Đồng, 1 Bạc, 2 Vàng, 3 Bạch kim, 4 Kim cương, 5 Cao thủ.
    uint256[6] public rankCap = [0, 100, 200, 300, 400, 500];

    uint256 public currentSeason;
    bool public seasonActive;

    /// rewardId (vd keccak256 của userId+missionId) đã phát -> chống phát trùng khi backend retry.
    mapping(bytes32 => bool) public rewarded;
    /// season => user => đã chốt chưa
    mapping(uint256 => mapping(address => bool)) public settled;

    event Rewarded(address indexed to, uint256 amount, bytes32 indexed rewardId, uint256 indexed season);
    event SeasonStarted(uint256 indexed season);
    event SeasonEnded(uint256 indexed season);
    event Settled(address indexed user, uint256 indexed season, uint8 rank, uint256 burned, uint256 kept);
    event RankCapUpdated(uint8 rank, uint256 cap);

    error NonTransferable();
    error AlreadyRewarded(bytes32 rewardId);
    error SeasonNotActive();
    error SeasonStillActive();
    error LengthMismatch();
    error BadRank(uint8 rank);

    constructor(address admin, address operator) ERC20("KILOMeet Run Token", "RUN") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ───────────── Phát token ─────────────

    /// @param rewardId id duy nhất của phần thưởng (nhiệm vụ ngày/tuần của 1 user) để idempotent.
    function reward(address to, uint256 amount, bytes32 rewardId) external onlyRole(OPERATOR_ROLE) {
        if (!seasonActive) revert SeasonNotActive();
        _reward(to, amount, rewardId);
    }

    function rewardBatch(address[] calldata to, uint256[] calldata amount, bytes32[] calldata rewardId)
        external
        onlyRole(OPERATOR_ROLE)
    {
        if (!seasonActive) revert SeasonNotActive();
        if (to.length != amount.length || to.length != rewardId.length) revert LengthMismatch();
        for (uint256 i; i < to.length; ++i) _reward(to[i], amount[i], rewardId[i]);
    }

    function _reward(address to, uint256 amount, bytes32 rewardId) internal {
        if (rewarded[rewardId]) revert AlreadyRewarded(rewardId);
        rewarded[rewardId] = true;
        _mint(to, amount);
        emit Rewarded(to, amount, rewardId, currentSeason);
    }

    // ───────────── Đốt token (mua voucher) ─────────────

    /// Khác ERC20Burnable.burnFrom: KHÔNG cần allowance, vì token không chuyển được nên người dùng
    /// không có gì để "cấp quyền". Chỉ hợp đồng Voucher (BURNER_ROLE) gọi được.
    function burnForPurchase(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    // ───────────── Mùa ─────────────

    function startSeason() external onlyRole(OPERATOR_ROLE) returns (uint256) {
        if (seasonActive) revert SeasonStillActive();
        currentSeason += 1;
        seasonActive = true;
        emit SeasonStarted(currentSeason);
        return currentSeason;
    }

    /// Đóng mùa: dừng phát token. Sau đó gọi settleSeason theo lô để cắt phần vượt mức.
    function endSeason() external onlyRole(OPERATOR_ROLE) {
        if (!seasonActive) revert SeasonNotActive();
        seasonActive = false;
        emit SeasonEnded(currentSeason);
    }

    /// Chốt mùa: mỗi user giữ tối đa rankCap[rank], phần vượt bị đốt. Gọi theo lô sau endSeason().
    /// @param ranks hạng LÚC HẾT MÙA (trước khi tụt 2 bậc).
    function settleSeason(address[] calldata users, uint8[] calldata ranks) external onlyRole(OPERATOR_ROLE) {
        if (seasonActive) revert SeasonStillActive();
        if (users.length != ranks.length) revert LengthMismatch();
        uint256 s = currentSeason;
        for (uint256 i; i < users.length; ++i) {
            address u = users[i];
            uint8 r = ranks[i];
            if (r > 5) revert BadRank(r);
            if (settled[s][u]) continue; // idempotent
            settled[s][u] = true;
            uint256 bal = balanceOf(u);
            uint256 cap = rankCap[r];
            uint256 burned = bal > cap ? bal - cap : 0;
            if (burned > 0) _burn(u, burned);
            emit Settled(u, s, r, burned, bal - burned);
        }
    }

    function setRankCap(uint8 rank, uint256 cap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (rank > 5) revert BadRank(rank);
        rankCap[rank] = cap;
        emit RankCapUpdated(rank, cap);
    }

    // ───────────── Không chuyển được ─────────────

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) revert NonTransferable();
        super._update(from, to, value);
    }
}
