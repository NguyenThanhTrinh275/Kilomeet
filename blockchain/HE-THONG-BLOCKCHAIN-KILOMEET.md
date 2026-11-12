# Hệ thống Blockchain KILOMeet: giải thích từ đầu đến cuối

> Đọc file này từ trên xuống là hiểu toàn bộ phần blockchain của dự án, từ khái niệm nền tảng đến từng dòng code, rồi cách chạy, cách sửa, cách bảo vệ trước giám khảo.
> Bảng hàm backend gọi nằm ngay trong [sdk/api.ts](sdk/api.ts) (mỗi hàm có chú thích). Tóm tắt nhanh: [README.md](README.md).

## Mục lục
1. [Bức tranh tổng thể](#1-bức-tranh-tổng-thể)
2. [Kiến thức blockchain nền tảng](#2-kiến-thức-blockchain-nền-tảng)
3. [Avalanche, C-Chain, Fuji, Snowtrace](#3-avalanche-c-chain-fuji-snowtrace)
4. [Chuẩn token: ERC-20, ERC-1155, ERC-721, OpenZeppelin](#4-chuẩn-token-erc-20-erc-1155-erc-721-openzeppelin)
5. [Chuỗi làm gì, backend làm gì](#5-chuỗi-làm-gì-backend-làm-gì)
6. [Solidity đủ để đọc code](#6-solidity-đủ-để-đọc-code)
7. [RunToken.sol, giải thích từng phần](#7-runtokensol-giải-thích-từng-phần)
8. [Voucher.sol, giải thích từng phần](#8-vouchersol-giải-thích-từng-phần)
9. [SeasonBadge.sol, giải thích từng phần](#9-seasonbadgesol-giải-thích-từng-phần)
10. [Ba hợp đồng nối với nhau thế nào](#10-ba-hợp-đồng-nối-với-nhau-thế-nào)
11. [SDK TypeScript, giải thích từng phần](#11-sdk-typescript-giải-thích-từng-phần)
12. [Công cụ: Hardhat, test, deploy, ABI](#12-công-cụ-hardhat-test-deploy-abi)
13. [Truy vết toàn bộ kịch bản demo](#13-truy-vết-toàn-bộ-kịch-bản-demo)
14. [Bảo mật, niềm tin và giới hạn](#14-bảo-mật-niềm-tin-và-giới-hạn)
15. [Cách sửa code](#15-cách-sửa-code)
16. [Khắc phục sự cố](#16-khắc-phục-sự-cố)
17. [Câu hỏi giám khảo có thể hỏi](#17-câu-hỏi-giám-khảo-có-thể-hỏi)
18. [Từ điển thuật ngữ](#18-từ-điển-thuật-ngữ)
19. [Việc còn lại cho bạn](#19-việc-còn-lại-cho-bạn)

---

## 1. Bức tranh tổng thể

KILOMeet là app chạy bộ theo mùa (4 tháng). Người chạy làm nhiệm vụ → nhận token → dùng token mua voucher của quán → quán quét QR → quán trả phí 5.000đ mỗi lượt dùng.

Hệ thống chia 2 thế giới:

```
┌─────────────────────── NGOÀI CHUỖI (backend, DB) ───────────────────────┐
│ GPS, ghi buổi chạy, chấm nhiệm vụ, tính hạng, ghép nhóm, thông báo,      │
│ kiểm tra hạng/khu vực khi mua, xác thực QR, thanh toán Hội viên          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ gọi SDK (sdk/kilomeet.ts)
┌───────────────────────────────▼─────────────────────────────────────────┐
│ TRÊN CHUỖI (Avalanche C-Chain / Fuji)                                    │
│  RunToken   : sổ cái token (ai có bao nhiêu), phát/đốt/cắt cuối mùa      │
│  Voucher    : sổ cái voucher (mua, tặng 1 lần, dùng 1 lần, ghi phí)      │
│  SeasonBadge: huy hiệu mùa (NFT không chuyển được)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

Vì sao có blockchain? Để các bên **không cần tin nhau**: voucher không thể bán quá số lượng, không dùng 2 lần, quán tự đối chiếu số lượt dùng trước khi trả phí, reset mùa công khai cho tất cả. Ai cũng kiểm chứng được trên Snowtrace.

Phần của bạn gồm 4 thứ: **3 hợp đồng (Solidity)**, **SDK (TypeScript)**, **test**, **script deploy/demo**.

---

## 2. Kiến thức blockchain nền tảng

**Blockchain** là một cuốn sổ cái dùng chung, do hàng nghìn máy (nút/node) cùng giữ bản sao. Dữ liệu ghi vào được gom thành **khối (block)** nối nhau thành chuỗi; muốn sửa dữ liệu cũ phải sửa cả các khối sau và thuyết phục đa số máy, gần như bất khả thi. Hai hệ quả quan trọng: **công khai, kiểm chứng được** và **không sửa lén được**.

**Ví (wallet) và địa chỉ.** Mỗi người có một cặp khóa:
- *Private key* (khóa bí mật): chuỗi 64 hex, ai có nó là toàn quyền với ví. Không bao giờ để lộ, không commit lên git.
- *Address* (địa chỉ): `0x` + 40 hex, sinh ra từ khóa công khai. Giống số tài khoản, an toàn để chia sẻ.

**Giao dịch (transaction, tx).** Một lệnh có chữ ký của ví, ví dụ "gọi hàm `purchase` của hợp đồng Voucher". Mỗi tx có `txHash` (mã định danh) và được đưa vào block. Trên Avalanche C-Chain mất khoảng 1–2 giây để xác nhận.

**Gas và phí.** Mỗi thao tác tốn "gas"; người gửi tx trả phí bằng đồng gốc của chuỗi (**AVAX**). Ghi dữ liệu (storage) đắt hơn đọc. Hàm chỉ **đọc** (view) gọi miễn phí, không cần tx. Ở dự án này: **ví operator của backend trả gas thay người dùng**, nên người chạy không cần giữ AVAX.

**Nonce.** Số thứ tự tx của một ví (0, 1, 2...). Phải liên tục, không nhảy cóc, không dùng lại. Gửi nhiều tx song song cùng một ví mà không quản lý nonce thì đụng nhau (xem mục 11, 16).

**Hợp đồng thông minh (smart contract).** Chương trình nằm trên chuỗi, có địa chỉ riêng, có dữ liệu riêng, chạy đúng như code, không ai can thiệp được (kể cả người viết), **sau khi deploy không sửa được**. Ai cũng gọi được các hàm `external/public` (trừ khi code hạn chế).

**Revert.** Khi một điều kiện sai, hợp đồng hủy toàn bộ tx: mọi thay đổi trong tx đó bị hoàn lại (trừ gas đã tốn). Đây là cơ chế "bảo vệ luật". Ví dụ mua voucher thiếu token → revert → không voucher nào được tạo, `sold` không tăng.

**Event (log).** Hợp đồng ghi "nhật ký" ra ngoài (`emit`). Rẻ hơn lưu storage, backend đọc được, hợp đồng thì **không đọc lại được**. Dự án dùng event làm căn cứ tính phí và báo cáo.

**Testnet và mainnet.** Mạng thật (mainnet) dùng tiền thật. Mạng thử (testnet, ở đây là Fuji) dùng AVAX miễn phí lấy từ faucet. Cuộc thi dùng Fuji.

---

## 3. Avalanche, C-Chain, Fuji, Snowtrace

- **Avalanche** là mạng blockchain gồm nhiều chuỗi chạy song song. Chuỗi bạn dùng là **C-Chain (Contract Chain)**: tương thích **EVM** (cùng máy ảo với Ethereum), nên viết Solidity, dùng ethers/Hardhat/OpenZeppelin y hệt Ethereum.
- **Fuji** = testnet của Avalanche. `chainId = 43113`. RPC: `https://api.avax-test.network/ext/bc/C/rpc`. **Mainnet** `chainId = 43114`, RPC `https://api.avax.network/ext/bc/C/rpc`.
- **Faucet**: trang tặng AVAX Fuji miễn phí (core.app/tools/testnet-faucet).
- **Snowtrace** (testnet.snowtrace.io): trang xem tx, địa chỉ, hợp đồng, event. Dùng khi demo: SDK trả `explorerUrl` cho mỗi tx.
- **RPC**: URL của một nút để chương trình nói chuyện với chuỗi (ethers dùng `JsonRpcProvider(url)`).
- Trong `hardhat.config.ts` ta khai báo mạng `fuji` và `avalanche` để lệnh `--network fuji` biết gửi đi đâu.

Vì sao chọn Avalanche cho đề này: yêu cầu cuộc thi; C-Chain nhanh, phí thấp, tương thích công cụ Ethereum; sau này có thể tách L1 riêng (đã ghi trong "để sau MVP").

---

## 4. Chuẩn token: ERC-20, ERC-1155, ERC-721, OpenZeppelin

**ERC** là bộ chuẩn giao diện để mọi ví/ứng dụng hiểu token của bạn.

| Chuẩn | Là gì | Dùng cho | Đặc điểm |
|---|---|---|---|
| **ERC-20** | Token có thể chia nhỏ, đồng nhất | `RunToken` | Mọi đơn vị giống nhau. `balanceOf(addr)` |
| **ERC-1155** | Nhiều loại token trong 1 hợp đồng | `Voucher` | Mỗi `typeId` là một loại (voucher quán A, quán B); `balanceOf(addr, typeId)` |
| **ERC-721** | NFT: mỗi token là duy nhất | `SeasonBadge` | Mỗi huy hiệu có `tokenId` riêng, có chủ sở hữu `ownerOf` |

**Vì sao voucher dùng ERC-1155 chứ không ERC-721?** Một quán có thể phát 500 voucher giống nhau; ERC-1155 lưu "ai có bao nhiêu voucher loại X" gọn và rẻ hơn tạo 500 NFT.

**OpenZeppelin** là thư viện hợp đồng chuẩn, đã được kiểm toán. Ta kế thừa `ERC20`, `ERC1155`, `ERC721`, `AccessControl` rồi **chỉ viết thêm luật riêng**. Dự án dùng OpenZeppelin v5.1: điểm đặc trưng của v5 là mọi thay đổi số dư/chủ sở hữu đều đi qua hàm nội bộ `_update` (ta tận dụng để chặn chuyển).

**AccessControl (phân quyền theo role).** Mỗi role là một nhãn (`keccak256("OPERATOR_ROLE")`). `grantRole(role, addr)` cấp, `revokeRole` thu hồi, `hasRole` kiểm tra. `DEFAULT_ADMIN_ROLE` là quyền cấp/thu hồi role khác. Modifier `onlyRole(R)` bắt hàm chỉ cho ví có role R.

---

## 5. Chuỗi làm gì, backend làm gì

Đây là ranh giới quan trọng nhất của thiết kế.

| Việc | Ở đâu | Lý do |
|---|---|---|
| Ghi GPS, tính km, chấm nhiệm vụ ngày/tuần | Backend | Dữ liệu lớn, riêng tư, không thể đưa lên chuỗi |
| Tính hạng (lên/tụt/lên nhanh) | Backend | Phụ thuộc km tuần; chuỗi chỉ nhận kết quả |
| Xác minh nhiệm vụ voucher (đường chạy qua quán < 50 m) | Backend | GPS |
| Kiểm tra hạng tối thiểu, khu vực, cửa sổ 7 ngày khi mua | Backend | Dữ liệu ngoài chuỗi |
| Xác thực QR (chữ ký/hết hạn ngắn) | Backend | Chống chụp màn hình QR |
| Ghép nhóm, điểm hội tụ, vị trí trực tiếp | Backend + Supabase | Realtime |
| **Số dư token, phát/đốt token** | **Chuỗi** | Sổ cái minh bạch |
| **Voucher: tồn kho, mua, giảm giá 1 lần, tặng 1 lần, dùng 1 lần** | **Chuỗi** | Không bán quá, không dùng 2 lần |
| **Ghi lượt dùng để tính phí** | **Chuỗi (event)** | Hai bên cùng đối chiếu |
| **Cắt token cuối mùa** | **Chuỗi** | Công khai, không ai chỉnh được |
| **Huy hiệu mùa** | **Chuỗi** | Thành tích không mất khi reset |

Nguyên tắc nhớ: **chuỗi bảo đảm "luật số dư và voucher"; backend bảo đảm "sự thật về hoạt động chạy bộ"**. Chuỗi không tự biết ai chạy bao nhiêu km, nó tin ví operator (backend). Mục 14 nói rõ hệ quả.

---

## 6. Solidity đủ để đọc code

```solidity
// SPDX-License-Identifier: MIT          ← giấy phép
pragma solidity ^0.8.24;                 ← phiên bản trình biên dịch
import {ERC20} from "@openzeppelin/...";  ← nhập hợp đồng có sẵn
```

| Khái niệm | Giải thích |
|---|---|
| `contract A is B, C` | A kế thừa B và C |
| `constructor(...)` | Chạy **một lần** khi deploy (gán admin, operator...) |
| `address` | Kiểu địa chỉ ví/hợp đồng. `address(0)` = 0x000...0, thường đại diện "không có ai"; mint có `from = address(0)`, burn có `to = address(0)` |
| `uint8/16/32/64/256` | Số nguyên không âm theo số bit. Dùng kiểu nhỏ trong `struct` để gom storage, tiết kiệm gas. Từ 0.8, tràn số tự revert |
| `bool`, `bytes32`, `string` | Đúng/sai; 32 byte (hay dùng cho hash); chuỗi |
| `mapping(K => V)` | Bảng tra. Khóa không tồn tại trả về mặc định (0, false). Không duyệt (loop) được |
| `struct` | Gom nhiều trường (VoucherType) |
| `public` biến | Tự sinh hàm đọc cùng tên (`rewarded(id)`, `rankCap(i)`) |
| `external` / `public` / `internal` / `private` | Gọi từ ngoài / từ mọi nơi / từ nội bộ và hợp đồng con / chỉ trong chính nó |
| `view` / `pure` | Chỉ đọc / không đọc không ghi. Gọi miễn phí từ ngoài |
| `modifier` (vd `onlyRole`) | Điều kiện chạy trước thân hàm |
| `msg.sender` | Ví gọi hàm hiện tại. `block.timestamp` = giờ block (unix giây) |
| `error X()` + `revert X()` | Lỗi tùy chỉnh (rẻ gas hơn chuỗi). SDK dịch lại thành `err.code` |
| `event` + `emit` | Ghi log. `indexed` = cho phép lọc theo trường đó |
| `calldata` / `memory` / `storage` | Tham số đầu vào chỉ đọc / bộ nhớ tạm / dữ liệu lưu vĩnh viễn |
| `immutable` | Gán 1 lần ở constructor, đọc rẻ |
| `override`, `super.f()` | Ghi đè hàm cha; gọi bản của cha |
| `a ++`, `++a` | `n = ++redeemCount[m]` tăng rồi lấy giá trị mới |
| `unchecked`, assembly | Dự án **không dùng** |

**Gas và vòng lặp:** mỗi vòng lặp tốn gas, mỗi block có giới hạn gas. Vòng lặp trên mảng lớn có thể vượt giới hạn → phải **chia lô**. Vì vậy `settleSeason` có `batchSize` trong SDK.

---

## 7. RunToken.sol, giải thích từng phần

File: [contracts/RunToken.sol](contracts/RunToken.sol). Vai trò: sổ cái token + mùa.

### 7.1 Khai báo
```solidity
contract RunToken is ERC20, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant BURNER_ROLE   = keccak256("BURNER_ROLE");
    uint256[6] public rankCap = [0, 100, 200, 300, 400, 500];
    uint256 public currentSeason;
    bool public seasonActive;
    mapping(bytes32 => bool) public rewarded;
    mapping(uint256 => mapping(address => bool)) public settled;
```
- Hai role: `OPERATOR` (ví backend) và `BURNER` (hợp đồng Voucher).
- `rankCap[i]` = số token tối đa được giữ lại khi hết mùa ở hạng i (0 Đồng, 1 Bạc, 2 Vàng, 3 Bạch kim, 4 Kim cương, 5 Cao thủ), khớp bảng trong tài liệu ý tưởng.
- `currentSeason` bắt đầu 0 (chưa có mùa); `startSeason()` đưa lên 1.
- `rewarded[id]` nhớ các phần thưởng đã phát. `settled[mùa][user]` nhớ ai đã được chốt.

### 7.2 Constructor
```solidity
constructor(address admin, address operator) ERC20("KILOMeet Run Token", "RUN") {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(OPERATOR_ROLE, operator);
}
```
Tên token "KILOMeet Run Token", ký hiệu "RUN". Cấp quyền admin cho người deploy, operator cho ví backend.

### 7.3 `decimals() = 0`
ERC-20 mặc định có 18 số thập phân. Ta ghi đè trả về 0 để **1 token = 1 đơn vị** (10 token ngày = số 10). Ví dụ nếu để mặc định, "10 token" sẽ là 10 × 10¹⁸ trong code, dễ nhầm.

### 7.4 Chặn chuyển token
```solidity
function _update(address from, address to, uint256 value) internal override {
    if (from != address(0) && to != address(0)) revert NonTransferable();
    super._update(from, to, value);
}
```
- Trong OpenZeppelin v5 mọi thay đổi số dư đều qua `_update(from, to, value)`.
- Mint: `from == 0`. Burn: `to == 0`. Chuyển ví-sang-ví: cả hai khác 0 → **bị chặn**.
- Nhờ vậy `transfer`, `transferFrom` đều revert `NonTransferable`. Điều này đúng yêu cầu "không chuyển được giữa người chạy" và chặn việc đầu cơ/bán token.

### 7.5 Phát token (`reward`)
```solidity
function reward(address to, uint256 amount, bytes32 rewardId) external onlyRole(OPERATOR_ROLE) {
    if (!seasonActive) revert SeasonNotActive();
    _reward(to, amount, rewardId);
}
function _reward(address to, uint256 amount, bytes32 rewardId) internal {
    if (rewarded[rewardId]) revert AlreadyRewarded(rewardId);
    rewarded[rewardId] = true;
    _mint(to, amount);
    emit Rewarded(to, amount, rewardId, currentSeason);
}
```
Các lớp bảo vệ:
1. Chỉ operator được gọi.
2. Chỉ khi mùa đang mở.
3. **Idempotent**: mỗi `rewardId` chỉ phát một lần.

*Vấn đề thực tế được giải quyết:* backend gọi `reward`, mạng chập chờn, không biết tx đã lên chưa, gọi lại → nếu không có `rewardId` sẽ phát đôi. SDK tạo `rewardId = keccak256("daily:lan:2026-11-09")`; gọi lại cùng khóa thì nhận lỗi `AlreadyRewarded` (xem là đã phát, không phải lỗi nghiêm trọng).

`rewardBatch` làm nhiều người trong 1 tx, kiểm ba mảng cùng độ dài (`LengthMismatch`).

### 7.6 Đốt khi mua voucher (`burnFrom`)
```solidity
function burnFrom(address from, uint256 amount) external onlyRole(BURNER_ROLE) { _burn(from, amount); }
```
Chỉ hợp đồng Voucher (được cấp `BURNER_ROLE` ở `deploy.ts`) gọi được. Không cần người mua phê duyệt (`approve`) vì token vốn không chuyển được. `_burn` tự revert nếu thiếu số dư (`ERC20InsufficientBalance`).

### 7.7 Vòng đời mùa
```
startSeason()  → currentSeason++ , seasonActive = true      (revert SeasonStillActive nếu đang mở)
   ... reward() được phép ...
endSeason()    → seasonActive = false                        (revert SeasonNotActive nếu chưa mở)
settleSeason() → chỉ chạy khi đã đóng; cắt token vượt mức
startSeason()  → mùa kế
```
`settleSeason(users, ranks)`:
```solidity
for each i:
    if (r > 5) revert BadRank(r);
    if (settled[s][u]) continue;       // đã chốt mùa này rồi → bỏ qua
    settled[s][u] = true;
    bal = balanceOf(u); cap = rankCap[r];
    burned = bal > cap ? bal - cap : 0;
    if (burned > 0) _burn(u, burned);
    emit Settled(u, s, r, burned, bal - burned);
```
Ví dụ: Lan hạng Cao thủ (5), 1.000 token → cap 500 → đốt 500 → còn 500. Người hạng Cao thủ có 300 → burned 0 → giữ 300. Người hạng Đồng (0) → cap 0 → mất hết.

Chú ý quan trọng: hợp đồng **chỉ xử lý những ví bạn đưa vào danh sách**. Ví không có trong danh sách thì giữ nguyên token. Backend phải liệt kê **mọi người còn token** khi đóng mùa.

Hạng truyền vào là **hạng lúc hết mùa, trước khi tụt 2 bậc** (đúng luật: giữ token theo hạng lúc hết mùa, sau đó hạng mới tụt). Tụt hạng là việc của DB backend, không nằm trên chuỗi.

### 7.8 `setRankCap`
Admin đổi mức giữ lại theo hạng mà không cần deploy lại.

---

## 8. Voucher.sol, giải thích từng phần

File: [contracts/Voucher.sol](contracts/Voucher.sol). Phức tạp nhất vì có nhiều luật.

### 8.1 Dữ liệu
```solidity
struct VoucherType {
    address merchant;    // ví cửa hàng
    uint32 basePrice;    // giá gốc (token)
    uint16 discountBps;  // % giảm khi làm nhiệm vụ, đơn vị 1/100 %; 5000 = 50%, 0 = không có nhiệm vụ
    uint32 maxSupply;    // tổng số lượng
    uint32 sold;         // đã bán
    uint64 expiry;       // hạn (unix giây), 0 = không hết hạn
    bool active;         // đang bán
}
IRunToken public immutable runToken;        // địa chỉ RunToken, cố định
uint256 public nextTypeId = 1;              // typeId tiếp theo
uint256 public feePerRedeemVnd = 5000;
mapping(uint256 => VoucherType) _types;
mapping(address => bool) approvedMerchant;
mapping(address => mapping(uint256 => bool)) discountUsed;
mapping(address => mapping(uint256 => uint256)) giftable;
mapping(address => uint256) redeemCount, feeAccruedVnd;
bool private _internalTransfer;
```
`typeId` bắt đầu từ 1 (0 dành để nghĩa là "không tồn tại"; `_mustGet` coi `merchant == address(0)` là không có).

### 8.2 Duyệt cửa hàng và tạo loại voucher
- `setMerchantApproved(merchant, bool)` (operator): "Admin duyệt cửa hàng" trong tài liệu.
- `createVoucherType(merchant, basePrice, discountBps, maxSupply, expiry)`:
  - Người gọi phải là chính cửa hàng hoặc operator (`NotMerchantOrOperator`).
  - Cửa hàng phải đã duyệt (`MerchantNotApproved`).
  - Tham số hợp lệ (`BadParams`): giá > 0, số lượng > 0, `discountBps ≤ 10000`, hạn (nếu có) ở tương lai.
  - Gán `typeId = nextTypeId++`, lưu `VoucherType(..., sold=0, active=true)`, `emit VoucherTypeCreated`.
  - Trả `typeId` (SDK đọc từ event, lưu vào DB).
- `setTypeActive`: cửa hàng/operator bật-tắt bán.

### 8.3 Giá
```solidity
function priceOf(typeId, applyDiscount) public view returns (uint256) {
    if (!applyDiscount) return t.basePrice;
    return (uint256(t.basePrice) * (10_000 - t.discountBps)) / 10_000;
}
```
500 token, giảm 5000 → 500 × 5000 / 10000 = **250**. Chia số nguyên làm tròn xuống (giá 7 giảm 50% = 3). Chuyển sang `uint256` trước khi nhân để khỏi tràn kiểu nhỏ.

### 8.4 Mua (`purchase`)
Chỉ operator gọi. Thứ tự:

| # | Kiểm tra / hành động | Lỗi khi sai |
|---|---|---|
| 1 | Loại voucher tồn tại | `UnknownType` |
| 2 | `active` | `TypeInactive` |
| 3 | Chưa hết hạn | `Expired` |
| 4 | `sold < maxSupply` | `SoldOut` |
| 5 | Nếu xin giảm giá: loại này có giảm giá; người này chưa dùng lượt giảm | `DiscountNotAvailable`, `DiscountAlreadyUsed` |
| 6 | `discountUsed[buyer][typeId] = true` (nếu giảm giá) | |
| 7 | Tính giá, `sold += 1` | |
| 8 | `runToken.burnFrom(buyer, price)` | revert nếu thiếu token |
| 9 | `giftable[buyer][typeId] += 1` | |
| 10 | `_mint(buyer, typeId, 1, "")` + `emit VoucherPurchased` | |

Vì tx là nguyên tử, nếu bước 8 revert thì bước 6, 7 cũng bị hoàn lại: không ai "mất lượt giảm giá" oan.

Hợp đồng **không** kiểm: hạng tối thiểu, khu vực, nhiệm vụ GPS, 7 ngày. Backend kiểm; chuỗi chỉ tin tham số `applyDiscount` của operator, rồi tự bảo đảm "mỗi người giảm 1 lần".

### 8.5 Tặng đúng 1 lần (logic khó nhất)
Yêu cầu: "tặng một lần cho người chạy khác"; người nhận không tặng tiếp (và điều kiện hạng/khu vực chỉ xét lúc mua).

Cách làm: biến `giftable[user][typeId]` = số voucher **user tự mua** mà còn quyền tặng.
```
Lan mua 1 voucher:    balance[Lan]=1, giftable[Lan]=1
Lan tặng cho Bảo:     giftable[Lan]=0 ; balance[Lan]=0 ; balance[Bảo]=1 ; giftable[Bảo]=0 (KHÔNG cộng)
Bảo thử tặng tiếp:    giftable[Bảo]=0 → revert NotGiftable
```
Chặn mọi đường chuyển khác bằng `_update`:
```solidity
function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
    if (from != address(0) && to != address(0) && !_internalTransfer) revert TransfersDisabled();
    _internalTransfer = false;               // dùng xong tắt ngay
    super._update(from, to, ids, values);
}
```
- Chuyển giữa 2 ví chỉ được khi cờ `_internalTransfer` đang bật; chỉ `_gift` bật cờ.
- `setApprovalForAll` cũng bị revert (không cho ủy quyền bên thứ ba rút voucher).
- Dòng `_internalTransfer = false` đặt **trước** `super._update` để vá lỗ hổng: OpenZeppelin gọi hàm `onERC1155Received` của người nhận *sau* khi chuyển; nếu cờ còn bật lúc đó, một hợp đồng ví thông minh của người nhận có thể tận dụng để chuyển voucher tự do (qua mặt luật "tặng một lần"). Cờ tắt sớm nên cửa sổ này đóng lại.

`gift(to, typeId)`: người giữ tự gọi (msg.sender là người tặng). `giftFor(from, to, typeId)`: operator gọi thay (hợp với ví nhúng, người dùng không cần gas). Cả hai đều vào `_gift`:
```solidity
if (to == from || to == address(0)) revert SelfGift();
if (giftable[from][typeId] == 0 || balanceOf(from, typeId) == 0) revert NotGiftable();
giftable[from][typeId] -= 1;       // cập nhật trạng thái TRƯỚC khi chuyển (an toàn tái nhập)
_internalTransfer = true;
_safeTransferFrom(from, to, typeId, 1, "");
_internalTransfer = false;
emit VoucherGifted(...)
```
Ghi chú: voucher **hết hạn vẫn tặng được** nhưng người nhận sẽ không dùng được; có thể chặn bằng cách thêm kiểm `expiry` trong `_gift` nếu muốn.

### 8.6 Dùng tại quầy (`redeem`)
Cửa hàng của loại đó hoặc operator gọi:
```solidity
if (msg.sender != t.merchant && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotMerchantOrOperator();
if (t.expiry != 0 && block.timestamp > t.expiry) revert Expired();
if (balanceOf(holder, typeId) == 0) revert NoVoucher();
_burn(holder, typeId, 1);
uint256 bal = balanceOf(holder, typeId);
if (giftable[holder][typeId] > bal) giftable[holder][typeId] = bal;  // giữ bất biến giftable ≤ số dư
uint256 n = ++redeemCount[t.merchant];
uint256 fee = feePerRedeemVnd;
feeAccruedVnd[t.merchant] += fee;
emit VoucherRedeemed(typeId, holder, t.merchant, fee, n);
```
- Voucher bị **đốt** nên không dùng lần hai (`NoVoucher`).
- Hai đoạn `giftable`: ví dụ Bảo có 1 voucher mua (giftable=1) và 1 voucher được tặng. Có 2 voucher, giftable=1. Dùng một cái → còn 1 voucher, giftable vẫn 1 ≤ 1, ok (coi cái được tặng bị dùng trước). Dùng cả hai → bal=0 → giftable bị đưa về 0.
- **Căn cứ tính phí:** `redeemCount` và `feeAccruedVnd` theo từng cửa hàng, cùng event `VoucherRedeemed` (có `indexed` theo typeId, holder, merchant → lọc dễ). Quán tự đối chiếu: số event = số lượt dùng = phí phải trả.
- Phí **chỉ ghi nhận**, chuỗi không thu tiền (MVP là thanh toán giả lập).

### 8.7 Các hàm xem
`getType(typeId)`, `priceOf`, `balanceOf(addr, typeId)`, `giftable`, `discountUsed`, `redeemCount`, `feeAccruedVnd`, `nextTypeId`.

`supportsInterface` bắt buộc ghi đè vì cả `ERC1155` và `AccessControl` đều định nghĩa; `override(ERC1155, AccessControl)` gộp lại.

`ERC1155("")`: URI metadata để trống (chưa có hình ảnh/mô tả voucher trên chuỗi). Nếu muốn ví hiển thị đẹp, đặt URI dạng `https://.../{id}.json`.

---

## 9. SeasonBadge.sol, giải thích từng phần

File: [contracts/SeasonBadge.sol](contracts/SeasonBadge.sol).

- ERC-721 tên "KILOMeet Season Badge", ký hiệu `KMBADGE`.
- `badgeOf[user][season]` → `tokenId` (0 = chưa có). `rankOf[tokenId]`, `seasonOf[tokenId]`. `nextTokenId` bắt đầu 1.
- `recordBadge(user, season, rank)` (operator):
  - Chưa có huy hiệu mùa đó → `_mint(user, id)` và lưu hạng.
  - Có rồi và hạng mới **cao hơn** → cập nhật hạng; thấp hơn hoặc bằng → không làm gì. Vậy huy hiệu luôn là "hạng cao nhất mùa".
  - Hạng > 5 → `BadRank`.
- `recordBadges` là bản lô, lặp lại logic (nếu sửa luật huy hiệu, sửa cả hai).
- **Soulbound:**
  ```solidity
  function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
      address from = _ownerOf(tokenId);
      if (from != address(0) && to != address(0)) revert Soulbound();
      return super._update(to, tokenId, auth);
  }
  ```
  Với ERC-721 v5, `_update` nhận `(to, tokenId, auth)`, chủ cũ lấy bằng `_ownerOf`. Mint (from=0) được, chuyển bị chặn.

Huy hiệu ghi "hạng cao nhất" nhưng hạng đó do backend cung cấp; chuỗi lưu bền vững và không ai xóa được.

---

## 10. Ba hợp đồng nối với nhau thế nào

```
                 grantRole(BURNER_ROLE, Voucher)
   RunToken  ◄────────────────────────────────────  (deploy.ts làm bước này)
      ▲   burnFrom(buyer, price)
      │
   Voucher.purchase()  ←── operator (backend)
```
- `Voucher` giữ địa chỉ `RunToken` (immutable, truyền ở constructor) và gọi `burnFrom`. **Không có role BURNER thì mọi lần mua voucher revert.** Đây là bước dễ quên nhất.
- `SeasonBadge` độc lập, chỉ cần operator gọi.
- Ba hợp đồng **dùng chung một ví operator** (backend) và **một ví admin** (người deploy). Khuyến nghị demo: admin = ví cá nhân an toàn, operator = ví riêng của backend, mỗi ví giữ vài AVAX Fuji.

Bảng quyền:

| Hành động | Ai |
|---|---|
| Deploy, `grantRole`, `setRankCap`, `setFeePerRedeemVnd` | Admin |
| `reward`, `startSeason`, `endSeason`, `settleSeason` | Operator |
| `setMerchantApproved`, `purchase`, `giftFor`, `recordBadge(s)` | Operator |
| `createVoucherType`, `setTypeActive`, `redeem` | Cửa hàng của loại đó **hoặc** operator |
| `gift` | Người giữ voucher (có `giftable`) |
| `burnFrom` | Chỉ hợp đồng Voucher |

---

## 11. SDK TypeScript, giải thích từng phần

File: [sdk/kilomeet.ts](sdk/kilomeet.ts). Đây là thứ backend `import`. Dùng thư viện **ethers v6**.

### 11.1 Các mảnh ghép
```ts
this.provider = new JsonRpcProvider(rpcUrl);            // kết nối nút RPC
const wallet  = new Wallet(operatorPrivateKey, provider); // ví operator
this.operator = new NonceManager(wallet);                 // tự quản lý nonce
this.token    = new Contract(addr.RunToken,   RunTokenAbi,   this.operator);
this.voucher  = new Contract(addr.Voucher,    VoucherAbi,    this.operator);
this.badge    = new Contract(addr.SeasonBadge,SeasonBadgeAbi,this.operator);
```
- **ABI** (`sdk/abi/*.json`): bản mô tả mọi hàm/event/lỗi của hợp đồng. `Contract` dùng ABI để biến `this.voucher.purchase(...)` thành tx đúng.
- **NonceManager**: giữ bộ đếm nonce cục bộ để gửi nhiều tx liên tiếp/song song không đụng nhau.
- Mọi tx ký bằng **ví operator**, không phải ví người dùng.

### 11.2 Quy trình gửi tx (`send`, `sendRaw`)
```
fn() → gửi tx → tx.wait() (đợi vào block) → kiểm tra status==1 → trả biên lai
          └─ lỗi? → operator.reset() → friendly(e) → throw
```
- `operator.reset()`: bug đã gặp thật khi test. Khi một tx bị revert ngay ở bước ước lượng gas, `NonceManager` vẫn tăng bộ đếm → tx kế tiếp bị chuỗi từ chối "Nonce too high". `reset()` bắt nó đọc lại nonce thật từ chuỗi.
- `friendly(e)`: lấy mã lỗi hex trong `e.data`, `interface.parseError` dịch thành tên custom error, gắn vào `err.code` (ví dụ `"SoldOut"`). Thử lần lượt cả 3 hợp đồng.
- `findEvent(receipt, contract, "TênEvent")`: duyệt log trong biên lai, parse bằng ABI. Dùng để lấy `typeId` sau khi tạo voucher và `feeVnd` sau khi dùng voucher.
- `toResult`: gói thành `{txHash, blockNumber, gasUsed, explorerUrl?}`. `explorerUrl` chỉ có khi đã `await chain.init()` (lấy `chainId` để chọn link Snowtrace Fuji/mainnet).

### 11.3 Từng nhóm hàm (tóm tắt, chi tiết đầu-vào-đầu-ra xem chú thích trong [sdk/api.ts](sdk/api.ts))
- **Ví:** `createWallet()` (tĩnh, tạo ví ngẫu nhiên), `fundGas(to, amountAvax)` (bỏ qua nếu ví đã có ≥ nửa lượng yêu cầu), `getAvaxBalance`.
- **Token:** `rewardMission`, `rewardMissionBatch`, `isRewarded`, `getTokenBalance`, `keyToId`.
  - `keyToId(key)` = `keccak256(utf8(key))` (hash 32 byte). Khóa phải **duy nhất cho từng phần thưởng thật**.
- **Mùa:** `getSeason`, `startSeason`, `endSeason`, `settleSeason`, `closeSeason`.
  - `closeSeason(users)` = `endSeason` → `settleSeason` (chia lô 100) → `recordBadges`. Là nút "đóng mùa" cho demo. Truyền cho mỗi người `rankAtEnd` (để cắt token) và `bestRank` (để ghi huy hiệu).
- **Huy hiệu:** `recordBadge`, `recordBadges`, `getBadge`.
- **Cửa hàng/voucher:** `approveMerchant`, `createVoucherType` (đổi `%` → bps, `Date` → unix), `setVoucherActive`, `getVoucherType`, `priceOf`, `purchaseVoucher`, `giftVoucher`, `redeemVoucher`.
- **Truy vấn:** `getVoucherBalance`, `getGiftable`, `hasUsedDiscount`, `getWalletVouchers` (đọc `balanceOfBatch` cho mọi `typeId` từ 1).
- **Phí và sự kiện:** `getMerchantFee`, `getRedeemEvents`, `onRedeemed`.

### 11.4 Giới hạn của SDK
- `getWalletVouchers` quét tuần tự mọi `typeId`: tốt cho demo, nhưng với hàng nghìn loại nên lưu danh sách trong DB.
- `getRedeemEvents` mặc định quét từ block 0; trên mạng thật truyền `fromBlock` = block deploy để nhanh.
- Một ví operator làm mọi thứ: hết AVAX là dừng. Nạp trước khi demo.
- Chỉ dùng **một instance** `KilomeetChain` trong tiến trình backend; nhiều instance cùng ví sẽ đụng nonce.
- Số lớn (`bigint`): `typeId`, `feeVnd` là `bigint`. In JSON phải đổi sang chuỗi (`.toString()`), vì `JSON.stringify` không hiểu `bigint`.

---

## 12. Công cụ: Hardhat, test, deploy, ABI

### 12.1 Hardhat
Bộ công cụ để biên dịch/test/deploy hợp đồng. `hardhat.config.ts`:
- `solidity`: phiên bản 0.8.24, bật optimizer (runs 200), `evmVersion: "shanghai"` (tương thích rộng).
- `networks.fuji` / `networks.avalanche`: URL RPC, chainId, `accounts` lấy từ `DEPLOYER_PRIVATE_KEY` trong `.env`.
- `etherscan`: cấu hình verify hợp đồng trên Snowtrace qua Routescan.
- Mạng `hardhat` (mặc định) là chuỗi giả lập trong bộ nhớ, miễn phí, nhanh, dùng cho test. Mạng `localhost` là `npx hardhat node` chạy riêng.

Thư mục sinh tự động (đừng sửa): `artifacts/` (kết quả biên dịch, có ABI + bytecode), `cache/`, `typechain-types/` (kiểu TypeScript).

### 12.2 Test (`test/kilomeet.test.ts`)
`setup()` deploy cả 3, cấp `BURNER_ROLE`, mở mùa 1, duyệt 1 cửa hàng; trả về 6 ví thử (`admin, op, merchant, lan, bao, rando`). 10 test:

| Nhóm | Test | Kiểm điều gì |
|---|---|---|
| RunToken | phát token, chống trùng, không chuyển | `AlreadyRewarded`, `NonTransferable`, người lạ không phát được |
| | chốt mùa 1000→500, 300 giữ nguyên | `settleSeason` đúng, idempotent, chặn phát sau khi đóng mùa |
| | hạng Đồng mất hết | cap = 0 |
| Voucher | mua giảm 50% = 250, chỉ giảm 1 lần | giá, `DiscountAlreadyUsed`, `SoldOut` |
| | thiếu token | revert |
| | tặng 1 lần | `TransfersDisabled`, `NotGiftable` |
| | quét QR | phí 5000, `NotMerchantOrOperator`, `NoVoucher` |
| | hết hạn | `Expired` khi mua và dùng |
| | cửa hàng chưa duyệt | `MerchantNotApproved` |
| SeasonBadge | hạng cao nhất, soulbound | cập nhật chỉ khi cao hơn, `Soulbound` |

Công cụ trong test: `.connect(signer)` gọi bằng ví khác; `expect(tx).to.be.revertedWithCustomError(contract, "Tên")` kiểm bị từ chối đúng lỗi; `time.increaseTo(t)` tua thời gian; `.to.emit(...).withArgs(...)` kiểm event.

Chạy: `npm test`. **Mọi thay đổi luật phải kèm test.**

### 12.3 Deploy (`scripts/deploy.ts`)
1. Lấy ví deployer (từ `.env`), operator = `OPERATOR_ADDRESS` hoặc chính deployer.
2. Deploy `RunToken(admin, operator)`.
3. Deploy `Voucher(admin, operator, địaChỉRunToken)`.
4. Deploy `SeasonBadge(admin, operator)`.
5. `token.grantRole(BURNER_ROLE, Voucher)` ← bước then chốt.
6. Ghi `deployments/<mạng>.json` (địa chỉ + chainId + operator).
7. Sau đó operator phải gọi `startSeason()` để mở mùa 1 (không thì `reward` revert `SeasonNotActive`).

### 12.4 ABI export (`scripts/export-abi.js`)
Lấy `abi` trong `artifacts/.../*.json` ghi sang `sdk/abi/`. Cần chạy lại mỗi lần **đổi giao diện hợp đồng** (thêm/đổi tên hàm, tham số, event, lỗi) bằng `npm run build:sdk`. Sửa chỉ phần thân hàm (không đổi chữ ký) thì ABI không đổi.

### 12.5 File `.env` (không commit)
```
DEPLOYER_PRIVATE_KEY=0x...      ví có AVAX Fuji, dùng deploy (và làm admin)
FUJI_RPC_URL=...
OPERATOR_PRIVATE_KEY=0x...      ví backend (relayer); địa chỉ của nó là OPERATOR_ADDRESS khi deploy
OPERATOR_ADDRESS=0x...          (tùy chọn) nếu muốn operator khác deployer
```

---

## 13. Truy vết toàn bộ kịch bản demo

Đây là điều `scripts/demo-api.ts` đã chạy thành công (xem log: token 1000 → mua → 750 → ... → đóng mùa còn 500, huy hiệu hạng 5).

| Bước demo | Backend làm gì | Gọi SDK | Hợp đồng làm gì | Trạng thái sau |
|---|---|---|---|---|
| Đăng nhập, ví hiện ra | Tạo/nhận ví người dùng | `fundGas(ví)` | (chuyển AVAX) | Ví có gas |
| Chạy 3 km, nhiệm vụ ngày đạt | Chấm km ≥ 2 | `rewardMission(ví, 10, "daily:u:ngày")` | `reward`: đánh dấu id, mint 10 | `balance=10` |
| Tài khoản Cao thủ dựng sẵn | Đọc hạng/km từ DB | `getTokenBalance` | (đọc) | |
| Quán mở voucher giá gốc 500, giảm 50% | Cửa hàng được duyệt | `approveMerchant`, `createVoucherType` | lưu loại, `typeId=1` | `_types[1]` |
| Chạy 5 km ngang qua 2 quán, chọn quán | Xác minh GPS < 50 m, cho chọn 1 quán | (không gọi chuỗi) | | Backend ghi "được giảm voucher 1" |
| Mua voucher còn 250 | Kiểm hạng/khu vực/7 ngày | `purchaseVoucher(ví, 1, true)` | kiểm, đốt 250 token, mint voucher | token 1000→750, voucher 1 |
| Tặng tài khoản 2 | Chủ voucher xác nhận | `giftVoucher(Lan, Bảo, 1)` | chuyển 1, `giftable` Lan=0 | Bảo có voucher |
| Quán quét QR | Xác thực QR | `redeemVoucher(Bảo, 1)` | đốt voucher, phí 5000, emit | `redeemCount=1`, `fee=5000` |
| Hội viên ghép nhóm | Hoàn toàn backend | | | (không liên quan chuỗi) |
| Quản trị "đóng mùa" | Tính hạng lúc hết mùa + hạng cao nhất | `closeSeason([...])` | `endSeason`, `settleSeason` (1000→500), `recordBadges` | token 500, huy hiệu hạng 5 |

Sau đó backend tự tụt hạng 2 bậc trong DB (Cao thủ → Bạch kim) và gọi `startSeason()` cho mùa mới.

Gợi ý khi demo: sau mỗi tx in `result.explorerUrl` rồi mở trên Snowtrace; chuẩn bị video quay trước phòng khi mạng lỗi.

---

## 14. Bảo mật, niềm tin và giới hạn

### 14.1 Chuỗi đảm bảo điều gì (không cần tin ai)
- Voucher không bán quá `maxSupply`.
- Voucher đã dùng bị đốt, không dùng 2 lần.
- Mỗi người chỉ giảm giá 1 lần/voucher; chỉ tặng 1 lần; không chuyển tự do.
- Token không chuyển giữa người dùng.
- Mỗi phần thưởng (`rewardId`) chỉ phát 1 lần.
- Reset mùa (cắt token theo bảng cap) và huy hiệu là công khai, ai cũng kiểm chứng.
- Số lượt dùng voucher của từng quán là sổ chung, quán không thể "chối" phí và nền tảng không thể "thổi" phí mà không để lại dấu vết.

### 14.2 Chuỗi KHÔNG đảm bảo (đang tin operator/backend)
- Rằng người đó thật sự chạy đủ km để nhận token (do backend chấm).
- Rằng hạng được truyền vào `settleSeason` đúng.
- Rằng `applyDiscount=true` chỉ được truyền cho người đã làm nhiệm vụ.
- Rằng chủ voucher thật sự đồng ý khi `giftFor` hay `redeem` được gọi.

**Khóa operator là "chìa vàng":** lộ khóa → kẻ xấu phát token vô hạn, đốt voucher của người khác. Giảm rủi ro: giữ khóa trong biến môi trường/secret manager (không commit), dùng ví riêng chỉ có vài AVAX, admin là ví khác (có thể thu hồi operator bằng `revokeRole`), sau này đặt hạn mức phát mỗi ngày hoặc dùng multisig cho admin.

### 14.3 Những điểm đã cân nhắc
- **Tái nhập (reentrancy):** `_gift` cập nhật `giftable` trước khi chuyển; cờ `_internalTransfer` tắt trước callback người nhận (đã vá).
- **Tràn số:** Solidity ≥ 0.8 tự revert.
- **Phát trùng:** `rewardId`.
- **Chốt mùa trùng:** `settled[mùa][user]`.
- **Quyền hạn:** mọi hàm nhạy cảm đều có `onlyRole` hoặc kiểm `msg.sender`.

### 14.4 Giới hạn đã biết (nên thừa nhận thật thà khi bảo vệ)
- Chưa có cơ chế **tạm dừng khẩn cấp** (pause) và chưa **nâng cấp được** hợp đồng (muốn đổi luật phải deploy lại).
- Chưa kiểm toán chuyên nghiệp; mới có 10 test, chưa có fuzz test.
- Hợp đồng chưa tự kiểm hạng/khu vực khi mua (để backend).
- Phí chỉ ghi nhận, chưa thu on-chain.
- `ERC1155` chưa có metadata URI.
- QR: bảo vệ QR (chống chụp lại) là trách nhiệm backend; trên chuỗi, voucher bị đốt ngay lần quét đầu nên QR dùng lại cũng vô dụng.
- `settleSeason` chỉ xử lý ví được liệt kê; backend phải liệt kê đủ.

---

## 15. Cách sửa code

### 15.1 Đổi tham số mà không cần deploy lại
| Muốn đổi | Gọi |
|---|---|
| Token giữ theo hạng | `token.setRankCap(rank, cap)` (admin) |
| Phí mỗi lượt dùng | `voucher.setFeePerRedeemVnd(vnd)` (admin) |
| Thêm/bỏ operator | `grantRole`/`revokeRole(OPERATOR_ROLE, addr)` trên cả 3 hợp đồng |
| Tạm ngừng 1 loại voucher | `chain.setVoucherActive(typeId, false)` |

### 15.2 Đổi luật (sửa `.sol`)
Quy trình 6 bước, luôn như nhau:
1. Sửa `contracts/*.sol`.
2. Sửa/thêm test trong `test/kilomeet.test.ts`.
3. `npm test` phải xanh.
4. `npm run build:sdk` (xuất ABI mới).
5. `npm run deploy:fuji` (địa chỉ mới, dữ liệu cũ **không** chuyển sang).
6. Đưa backend `deployments/fuji.json` + `sdk/abi/` mới; mở mùa lại bằng `startSeason()`.

**Công thức A: giới hạn mỗi người mua tối đa N voucher mỗi loại**
- Thêm `mapping(address => mapping(uint256 => uint256)) public bought;` và `uint256 public maxPerUser = 1;`.
- Trong `purchase`, trước khi mint: `if (bought[buyer][typeId] >= maxPerUser) revert LimitReached(); bought[buyer][typeId]++;` (khai báo `error LimitReached();`).
- Thêm test mua lần 2 phải revert.

**Công thức B: chặn tặng voucher đã hết hạn**
Trong `_gift`, sau `_mustGet`: lấy `t` rồi `if (t.expiry != 0 && block.timestamp > t.expiry) revert Expired();`.

**Công thức C: thêm hạng thứ 7**
Đổi `uint256[6] rankCap` thành `[7]` và thêm giá trị; sửa mọi chỗ `> 5` (RunToken `settleSeason`, `setRankCap`; SeasonBadge `recordBadge`, `recordBadges`); thêm vào `enum Rank` trong SDK; sửa test.

**Công thức D: đổi phí mặc định**
Đổi giá trị khởi tạo `feePerRedeemVnd = 5000` (cần deploy lại) hoặc gọi `setFeePerRedeemVnd` (không cần).

### 15.3 Thêm hàm vào SDK (không đổi hợp đồng)
```ts
// Hàm ĐỌC
async getSoldCount(typeId: number): Promise<number> {
  return (await this.getVoucherType(typeId)).sold;
}
// Hàm GHI
async doSomething(arg: string): Promise<TxResult> {
  return this.send(() => this.voucher.tenHamTrongSolidity(arg));
}
```
Tên `this.voucher.xxx` phải trùng tên hàm trong `sdk/abi/Voucher.json`. Muốn dịch lỗi và nonce an toàn thì luôn đi qua `this.send(...)`.

### 15.4 Chạy thử local (không tốn AVAX)
```
Cửa sổ 1: npx hardhat node
Cửa sổ 2: npx hardhat run scripts/deploy.ts --network localhost
          npx ts-node scripts/demo-api.ts   (đặt CHAIN_NET=localhost và RPC_URL=http://127.0.0.1:8545)
```
Ví mặc định của node local có 10.000 ETH giả, khóa riêng #0 đã ghi sẵn trong `demo-api.ts` (chỉ dùng local, không bao giờ dùng trên mạng thật).

### 15.5 Deploy lên Fuji
1. Tạo ví mới (MetaMask/Core) làm deployer, lấy khóa bí mật, xin AVAX ở faucet.
2. Điền `.env`. 3. `npm run deploy:fuji`. 4. Dùng khóa operator gọi `startSeason()`.
5. (Tùy chọn) `npx hardhat verify --network fuji <địa chỉ> <tham số constructor>` để Snowtrace hiện mã nguồn.

Tham số constructor khi verify: RunToken `<admin> <operator>`; Voucher `<admin> <operator> <địaChỉRunToken>`; SeasonBadge `<admin> <operator>`.

---

## 16. Khắc phục sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `insufficient funds for gas` | Ví deployer/operator hết AVAX | Xin faucet, nạp thêm |
| `Nonce too high` / `nonce already used` | Nhiều tiến trình/instance cùng một ví operator | Dùng một instance; `chain.operator.reset()` |
| `AccessControlUnauthorizedAccount` | Ví gọi không có role | Kiểm tra khóa operator; kiểm `OPERATOR_ADDRESS` lúc deploy |
| Mua voucher luôn revert | Chưa `grantRole(BURNER_ROLE, Voucher)`; hoặc thiếu token | Chạy lại bước cấp role; kiểm số dư |
| `SeasonNotActive` | Chưa `startSeason()` hoặc đã `endSeason()` | Mở mùa |
| `MerchantNotApproved` | Chưa duyệt quán | `approveMerchant(shop)` |
| `UnknownType` | Sai `typeId` hoặc dùng địa chỉ hợp đồng cũ | Kiểm `deployments/*.json` |
| `AlreadyRewarded` | Phần thưởng đã phát | Bình thường (idempotent) |
| `TransfersDisabled` | Gọi `safeTransferFrom` trực tiếp | Dùng `gift`/`giftFor` |
| `NotGiftable` | Voucher này đã được tặng, hoặc là voucher được tặng | Đúng luật |
| Sửa `.sol` mà hành vi không đổi | Backend vẫn dùng hợp đồng cũ | Deploy lại, cập nhật địa chỉ + ABI |
| `Cannot find module './abi/...'` | Chưa xuất ABI | `npm run build:sdk` |
| `npm install` báo `ERESOLVE` | Xung đột phiên bản peer | `npm install --legacy-peer-deps` |
| `JSON.stringify` lỗi `BigInt` | `typeId`/`feeVnd` là bigint | `.toString()` |
| Tx treo lâu | RPC chậm/quá tải | Đổi RPC khác, thử lại |

---

## 17. Câu hỏi giám khảo có thể hỏi

**Vì sao cần blockchain, DB thường cũng làm được?**
Vì có 4 bên có lợi ích khác nhau (người chạy, quán, nền tảng, hội viên). Chuỗi cho phép quán tự kiểm chứng số lượt dùng voucher (căn cứ trả phí), người chạy tin voucher không bị bán quá hoặc phát lại, và reset mùa công khai. Nền tảng không thể âm thầm sửa số dư hay số lượt dùng.

**Vì sao token không chuyển được?**
Để token chỉ phản ánh nỗ lực chạy, chống mua bán/đầu cơ, giữ nền kinh tế đơn giản: kiếm bằng nhiệm vụ, tiêu bằng voucher.

**Người dùng có phải mua AVAX không?**
Không. Ví operator của hệ thống trả gas (và ở Fuji chuyển sẵn ít AVAX thử nghiệm cho ví mới).

**Backend gian lận (phát token tùy ý) thì sao?**
Mọi lần phát đều lộ công khai (event `Rewarded`), ai cũng kiểm toán được. Giảm rủi ro hơn nữa bằng hạn mức, multisig, quy tắc kiểm chứng (đã nêu ở mục 14). Đây là mô hình "tin tưởng có kiểm chứng" phù hợp MVP.

**Voucher hết hạn xử lý thế nào?**
Hợp đồng chặn mua và dùng sau hạn; người giữ tự chịu, không hoàn token (đúng luật).

**Sao không để người dùng tự mua voucher bằng ví của họ?**
Được, nhưng khi đó cần họ ký tx và có gas. Ta chọn operator thay mặt để giữ trải nghiệm đăng nhập bằng email; backend kiểm hạng/khu vực/nhiệm vụ trước. Có thể mở dần quyền tự gọi.

**Có thể nâng cấp hợp đồng không?**
Hiện tại không (cố ý đơn giản). Đổi luật = deploy hợp đồng mới. Có thể dùng proxy nâng cấp được nếu cần.

**Gas bao nhiêu?**
Ở Fuji miễn phí thực chất (AVAX thử nghiệm). Trên mainnet, mỗi giao dịch cỡ vài trăm nghìn gas, phí rất nhỏ so với Ethereum. Phát token theo lô và chốt mùa theo lô giúp giảm tổng phí.

**Sao chọn ERC-1155 cho voucher?**
Một hợp đồng chứa nhiều loại voucher của nhiều quán; mỗi loại nhiều bản giống nhau; mua/tặng/đốt đều rẻ và gọn.

---

## 18. Từ điển thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| ABI | Bản mô tả giao diện hợp đồng (hàm, tham số, event, lỗi) để chương trình ngoài gọi được |
| Address | Địa chỉ ví hoặc hợp đồng (`0x` + 40 hex) |
| AVAX | Đồng gốc của Avalanche, trả gas |
| bps | Basis point = 1/100 %; 5000 bps = 50% |
| Block | Khối giao dịch trên chuỗi |
| C-Chain | Chuỗi hợp đồng thông minh của Avalanche, tương thích EVM |
| Custom error | Lỗi tùy chỉnh trong Solidity (`error SoldOut();`) |
| ERC-20/721/1155 | Chuẩn token |
| EVM | Máy ảo chạy hợp đồng thông minh |
| Event | Nhật ký hợp đồng phát ra, đọc được từ ngoài |
| Faucet | Trang tặng tiền testnet |
| Fuji | Testnet Avalanche (chainId 43113) |
| Gas | Đơn vị công tính toán, trả bằng AVAX |
| Hardhat | Bộ công cụ biên dịch/test/deploy hợp đồng |
| Idempotent | Gọi nhiều lần có kết quả như gọi một lần |
| Mint / Burn | Tạo mới / hủy token |
| Nonce | Số thứ tự giao dịch của một ví |
| Operator | Ví của backend, có quyền phát token, mua/dùng voucher, chốt mùa |
| OpenZeppelin | Thư viện hợp đồng chuẩn, đã kiểm toán |
| Private key | Khóa bí mật điều khiển ví |
| Relayer | Bên trả gas và gửi tx thay người dùng (ở đây là backend) |
| Revert | Hủy giao dịch, hoàn mọi thay đổi |
| Role | Quyền (AccessControl) |
| RPC | URL nút để gửi/đọc dữ liệu chuỗi |
| Snowtrace | Trang xem giao dịch/hợp đồng Avalanche |
| Soulbound | Token gắn với ví, không chuyển được |
| Storage | Bộ nhớ vĩnh viễn của hợp đồng (ghi tốn gas) |
| Tx / txHash | Giao dịch / mã định danh của nó |
| View | Hàm chỉ đọc, gọi miễn phí |

---

## 19. Việc còn lại cho bạn

1. Tạo ví deployer, xin AVAX Fuji, điền `.env`, **`npm run deploy:fuji`**, gọi `startSeason()`.
2. Xin ví thật của backend làm **operator** (`OPERATOR_ADDRESS`), nạp AVAX cho ví đó.
3. Đưa cho bạn làm backend: `sdk/` (gồm `abi/`), `deployments/fuji.json` (backend chỉ import `sdk/api.ts`).
4. Chốt với nhóm: định dạng `rewardKey` (ví dụ `daily:<userId>:<YYYY-MM-DD>`, `weekly:<userId>:<YYYY-Www>`), và rằng khi đóng mùa backend phải liệt kê **mọi** ví còn token.
5. Chọn giải pháp ví nhúng (Privy/thirdweb/Web3Auth) và thử ngày 1 xem cái nào hỗ trợ Fuji; SDK chỉ cần địa chỉ ví.
6. (Nên có) Verify 3 hợp đồng trên Snowtrace để giám khảo đọc được mã nguồn.
7. (Nên có) Soạn script demo in `explorerUrl` sau mỗi bước, và quay video dự phòng.
8. Ôn mục 14 và 17 để trả lời giám khảo.
