// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SeasonBadge - huy hiệu mùa (NFT soulbound, không chuyển được)
/// @notice Mỗi (user, mùa) có đúng 1 huy hiệu, ghi hạng CAO NHẤT đạt được trong mùa đó.
contract SeasonBadge is ERC721, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public nextTokenId = 1;
    /// user => season => tokenId (0 = chưa có)
    mapping(address => mapping(uint256 => uint256)) public badgeOf;
    mapping(uint256 => uint8) public rankOf;
    mapping(uint256 => uint256) public seasonOf;

    event BadgeRecorded(address indexed user, uint256 indexed season, uint256 indexed tokenId, uint8 rank);

    error Soulbound();
    error BadRank(uint8 rank);
    error LengthMismatch();

    constructor(address admin, address operator) ERC721("KILOMeet Season Badge", "KMBADGE") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /// Ghi/nâng huy hiệu. Mint lần đầu, các lần sau chỉ cập nhật nếu hạng cao hơn.
    function recordBadge(address user, uint256 season, uint8 rank) external onlyRole(OPERATOR_ROLE) {
        _record(user, season, rank);
    }

    /// Bản theo lô của recordBadge (cuối mùa ghi huy hiệu cho nhiều người một lúc).
    function recordBadges(address[] calldata users, uint256 season, uint8[] calldata ranks)
        external
        onlyRole(OPERATOR_ROLE)
    {
        if (users.length != ranks.length) revert LengthMismatch();
        for (uint256 i; i < users.length; ++i) _record(users[i], season, ranks[i]);
    }

    function _record(address user, uint256 season, uint8 rank) internal {
        if (rank > 5) revert BadRank(rank);
        uint256 id = badgeOf[user][season];
        if (id == 0) {
            id = nextTokenId++;
            badgeOf[user][season] = id;
            seasonOf[id] = season;
            rankOf[id] = rank;
            _mint(user, id);
            emit BadgeRecorded(user, season, id, rank);
        } else if (rank > rankOf[id]) {
            rankOf[id] = rank;
            emit BadgeRecorded(user, season, id, rank);
        }
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 id) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(id);
    }
}
