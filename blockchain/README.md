# KILOMeet: lớp Blockchain (Avalanche Fuji)

Thư mục này là **phần blockchain** của KILOMeet: token, voucher và huy hiệu mùa nằm trên Avalanche C-Chain.
Backend **không cần biết Solidity**. Chỉ cần import một file, `sdk/api.ts`, rồi gọi hàm như gọi một thư viện bình thường.

```
Backend của bạn  ──gọi──▶  sdk/api.ts  ──▶  hợp đồng trên Avalanche Fuji
```

Blockchain đóng vai một **database có luật**: số dư token, voucher, lượt dùng nằm trên chuỗi, và các luật như "voucher không dùng 2 lần" do hợp đồng tự bảo đảm.

---

## 1. Bắt đầu nhanh

```bash
npm install --legacy-peer-deps
```
Tạo file `.env` (copy từ `.env.example`) và điền khóa ví server (xin người phụ trách blockchain, **không commit**):
```
OPERATOR_PRIVATE_KEY=0x...
```

Thử ngay bằng trang demo trực quan (đọc/ghi thẳng lên Fuji):
```bash
npm run demo:ui        # rồi mở http://localhost:3000
```

Gọi từ code backend:
```ts
import * as chain from "./sdk/api";

await chain.giveToken(walletAddress, 10, `daily:${userId}:2026-11-09`);
console.log(await chain.getToken(walletAddress));   // 10
```

Biến môi trường:
| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `OPERATOR_PRIVATE_KEY` | Khóa ví server, dùng ký mọi giao dịch (**bắt buộc**) | không có |
| `CHAIN_NET` | `fuji` / `avalanche` / `localhost` | `fuji` |
| `RPC_URL` | Địa chỉ nút RPC | RPC công khai của Fuji |

Địa chỉ hợp đồng tự đọc từ `deployments/<CHAIN_NET>.json`, bạn không phải khai báo.

---

## 2. Thông tin mạng Fuji

| | |
|---|---|
| Mạng | Avalanche Fuji C-Chain (testnet), chainId `43113` |
| RPC | `https://api.avax-test.network/ext/bc/C/rpc` |
| Xem giao dịch | https://testnet.snowtrace.io |

| Hợp đồng | Địa chỉ |
|---|---|
| RunToken (token) | `0x49D4915957E5a5f24F47593eeb979d0b91398225` |
| Voucher | `0x22aB8C48f9Efd3dD37d8c11a6A1f3281d567215c` |
| SeasonBadge (huy hiệu) | `0xf9C9eE06142D4AB0ae7b0f440AdAe725279eE8B0` |

Deploy lại 18/11/2026 (ví operator mới `0x4132…1128`, đã verify source trên Snowtrace). Bản cũ: `deployments/fuji-v1.json`.

Ví người dùng chỉ cần **địa chỉ** (`0x...`, 42 ký tự). Người dùng **không cần AVAX**: ví server trả phí gas cho mọi giao dịch.

---

## 3. Quy ước chung khi gọi hàm

- Mọi hàm đều `async`. Hàm **ghi** mất khoảng 2 đến 3 giây (chờ chuỗi xác nhận), hàm **đọc** trả ngay.
- Hàm ghi trả `{ txHash, link }`. `link` mở Snowtrace, dùng để show cho người dùng hoặc giám khảo.
- Mọi số trả về là `number` hoặc `string` thường, không có `bigint`, nên `JSON.stringify` an toàn.
- Lỗi: ném `ChainError` có `.code` (tên lỗi, xem mục 5) và `.message` tiếng Việt, hiển thị thẳng cho người dùng được.
- `wallet` luôn là địa chỉ ví dạng chuỗi `"0x..."`.
- Hạng là số `0..5`: dùng `chain.RANK.DONG`, `BAC`, `VANG`, `BACH_KIM`, `KIM_CUONG`, `CAO_THU`.

### Khóa chống phát trùng (rất quan trọng)
`giveToken(wallet, amount, key)` cần một `key` **duy nhất cho mỗi phần thưởng thật**:
```
daily:<userId>:2026-11-09      (nhiệm vụ ngày)
weekly:<userId>:2026-W45       (nhiệm vụ tuần)
```
Gọi lại cùng `key` thì chuỗi từ chối với `AlreadyRewarded` (không phát đôi). Nhờ vậy backend retry khi mạng lỗi mà không sợ trả thưởng hai lần. Coi `AlreadyRewarded` là "đã phát rồi", không phải lỗi nghiêm trọng.

---

## 4. Danh sách hàm (`sdk/api.ts`)

### Ví
| Hàm | Vào | Ra | Làm gì |
|---|---|---|---|
| `newWallet()` | không | `{address, privateKey}` | Tạo ví mới (bỏ qua nếu dùng ví nhúng Privy/thirdweb) |
| `giveGas(wallet)` | ví | `Tx` | Gửi ít AVAX cho ví mới (chỉ cần nếu người dùng tự gửi giao dịch) |

### Token
| Hàm | Vào | Ra | Làm gì |
|---|---|---|---|
| `giveToken(wallet, amount, key)` | ví, số token, khóa duy nhất | `Tx` | **Phát token** khi nhiệm vụ đạt |
| `giveTokenMany(items)` | `{wallet, amount, key}[]` | `Tx` | Phát cho nhiều người trong 1 giao dịch |
| `getToken(wallet)` | ví | `number` | Số token hiện có |
| `wasGiven(key)` | khóa | `boolean` | Phần thưởng này đã phát chưa |

### Mùa và huy hiệu
| Hàm | Vào | Ra | Làm gì |
|---|---|---|---|
| `getSeason()` | không | `{season, active}` | Mùa hiện tại và đang mở không |
| `openSeason()` | không | `Tx` | Mở mùa mới |
| `closeSeason(users)` | `{wallet, rankAtEnd, bestRank}[]` | `{season, txs[]}` | **"Đóng mùa"** trong một lệnh: dừng phát token, cắt token vượt mức theo hạng, ghi huy hiệu |
| `getBadge(wallet, season)` | ví, số mùa | `{rank}` hoặc `null` | Huy hiệu mùa (hạng cao nhất) |

### Cửa hàng và voucher
| Hàm | Vào | Ra | Làm gì |
|---|---|---|---|
| `approveShop(shop)` | ví cửa hàng | `Tx` | Duyệt cửa hàng (bắt buộc trước khi tạo voucher) |
| `createVoucher({shop, price, discountPercent?, maxSupply, expiry?})` | xem dưới | `{id, txHash, link}` | **Tạo voucher**. Lưu `id` vào DB |
| `getVoucher(id)` | id | `Voucher` | Thông tin một voucher |
| `listVouchers()` | không | `Voucher[]` | Tất cả voucher trên chuỗi |
| `setVoucherOnSale(id, onSale)` | id, bật/tắt | `Tx` | Bật/tắt bán |
| `getPrice(id, withDiscount)` | id, có giảm không | `number` | Giá phải trả (token) |
| `buyVoucher(wallet, id, withDiscount)` | ví, id, có giảm giá không | `Tx` | **Mua**: đốt token, cấp voucher |
| `giftVoucher(from, to, id)` | ví tặng, ví nhận, id | `Tx` | **Tặng** (đúng 1 lần) |
| `useVoucher(holder, id)` | ví giữ, id | `{feeVnd, txHash, link}` | **Quét QR**: đốt voucher, ghi phí (`feePerRedeemVnd`, đang đặt 3.000đ) |
| `listMyVouchers(wallet)` | ví | `{id, amount}[]` | Voucher đang giữ |
| `countVoucher(wallet, id)` | | `number` | Số voucher loại id |
| `countGiftable(wallet, id)` | | `number` | Còn tặng được mấy cái |
| `usedDiscount(wallet, id)` | | `boolean` | Đã dùng lượt giảm giá chưa |

`createVoucher`: `price` (token), `discountPercent` (0 đến 100, nên dùng `CONFIG.voucher.discount.MEDIUM`...), `maxSupply`, `expiry` (`Date` hoặc unix giây, bỏ trống là không hết hạn).
`Voucher` = `{id, shop, price, discountPercent, maxSupply, sold, expiry, onSale}`.

### Phí cửa hàng
| Hàm | Vào | Ra | Làm gì |
|---|---|---|---|
| `getShopFee(shop)` | ví cửa hàng | `{uses, feeVnd}` | Tổng lượt dùng và phí (đồng) đã ghi sổ |
| `getShopUses(shop)` | ví cửa hàng | `{voucherId, holder, feeVnd, txHash}[]` | Lịch sử từng lượt dùng, để cửa hàng đối chiếu |

---

## 5. Mã lỗi (`err.code`)

| code | Nghĩa |
|---|---|
| `AlreadyRewarded` | Phần thưởng này đã phát |
| `SeasonNotActive` | Mùa chưa mở hoặc đã đóng |
| `MerchantNotApproved` | Cửa hàng chưa duyệt |
| `SoldOut` | Hết số lượng |
| `Expired` | Voucher hết hạn |
| `TypeInactive` | Voucher đang tạm ngừng bán |
| `DiscountAlreadyUsed` | Đã dùng lượt giảm giá của voucher này |
| `DiscountNotAvailable` | Voucher không có giảm giá |
| `NotGiftable` | Không tặng được (đã tặng, hoặc là voucher được tặng) |
| `NoVoucher` | Người này không có voucher đó |
| `ERC20InsufficientBalance` | Không đủ token |

```ts
try { await chain.buyVoucher(wallet, id, true); }
catch (e: any) { res.status(400).json({ error: e.message, code: e.code }); }
```

---

## 6. Mỗi tính năng của app gọi hàm nào

| Tính năng | Backend làm trước | Gọi |
|---|---|---|
| Hoàn thành nhiệm vụ ngày/tuần | Chấm km từ GPS | `giveToken(wallet, CONFIG.missions.dailyReward, key)` |
| Xem token | | `getToken(wallet)` |
| Danh sách voucher | Lọc theo khu vực/hạng | `listVouchers()` |
| Làm xong nhiệm vụ voucher | Xác minh GPS (<50 m), ghi nhớ trong DB | (không gọi chuỗi) |
| Mua voucher | Kiểm hạng, khu vực, còn trong 7 ngày | `buyVoucher(wallet, id, daDuocGiam)` |
| Tặng voucher | Chủ voucher xác nhận trong app | `giftVoucher(from, to, id)` |
| Cửa hàng quét QR | Xác thực QR (chữ ký, hết hạn ngắn) | `useVoucher(holder, id)` |
| Cửa hàng xem phí | | `getShopFee(shop)`, `getShopUses(shop)` |
| Quản trị bấm "đóng mùa" | Tính hạng lúc hết mùa + hạng cao nhất của **mọi** ví còn token | `closeSeason(users)` rồi `openSeason()` |
| Duyệt cửa hàng | | `approveShop(shop)` |

---

## 7. Backend PHẢI tự làm (không nằm trên chuỗi)

Chuỗi chỉ bảo đảm các luật về số dư và voucher. Dữ liệu đời thực thì chuỗi không có, nên backend tự kiểm tra:

- Chấm nhiệm vụ, tính hạng (lên, tụt, lên nhanh), xác minh GPS nhiệm vụ voucher.
- Kiểm hạng tối thiểu, khu vực, và hạn 7 ngày **trước** `buyVoucher`. Chỉ truyền `withDiscount=true` khi người dùng đã làm xong nhiệm vụ.
- Xác thực QR và xác nhận ý muốn của chủ voucher trước `giftVoucher` / `useVoucher`.
- Khi đóng mùa: liệt kê **mọi ví còn token** trong `closeSeason` (hợp đồng chỉ cắt token của ví được liệt kê). Sau đó tự tụt 2 hạng trong DB.
- Giữ `OPERATOR_PRIVATE_KEY` trong biến môi trường của máy chủ, **không commit, không gửi qua chat**.

---

## 8. Các con số của game: `sdk/config.ts`

Mọi con số (token mỗi nhiệm vụ, mốc km, mức giảm 50%/90%, phí...) nằm ở **một file**:
```ts
import { CONFIG } from "./sdk/api";
CONFIG.missions.dailyReward;              // 10
CONFIG.voucher.discount.MEDIUM;           // 50
CONFIG.ranks.minKmPerWeek;                // [0, 5, 10, 15, 25, 40]
```
Số nào chỉ backend dùng thì sửa file là có hiệu lực. Số nào ghi trên chuỗi (token giữ lại theo hạng, phí mỗi lượt) thì sau khi sửa chạy `npm run config:apply` (cần ví admin, do người phụ trách blockchain chạy).
Mức giảm của voucher **đã tạo** thì không đổi được; muốn đổi hãy tạo voucher mới và tắt cái cũ.

---

## 9. Lưu ý khi tích hợp

- Dùng **một** tiến trình giữ kết nối chuỗi. Các hàm đã tự quản lý thứ tự giao dịch, gọi song song được, nhưng đừng chạy nhiều tiến trình dùng chung một khóa operator.
- Phí mỗi lượt dùng voucher (3.000đ, đặt bằng `setFeePerRedeemVnd`, xem `pnpm chain:set-fee` ở kilomeet-api) chỉ được **ghi sổ** trên chuỗi. Thu tiền thật do backend lo qua ví phí trả trước của quán.
- Token `RUN` không chuyển được giữa người dùng. Đây là chủ ý, không phải lỗi.
- Người dùng nhìn token và voucher ở đâu: ví Core không tự hiện token tùy chỉnh, nên hãy hiển thị số liệu ngay trong app bằng `getToken` / `listMyVouchers`. Dùng link `Tx.link` để chứng minh với giám khảo.

---

## 10. Dành cho người phụ trách blockchain

```bash
npm test                  # 24 test hợp đồng
npm run compile           # biên dịch
npm run build:sdk         # xuất ABI ra sdk/abi (chạy lại khi đổi giao diện hợp đồng)
npm run deploy:fuji       # deploy 3 hợp đồng, ghi deployments/fuji.json
npm run config:apply      # đồng bộ config.ts lên chuỗi
npm run demo:ui           # trang demo trực quan
```

```
contracts/    RunToken.sol, Voucher.sol, SeasonBadge.sol   (luật chơi trên chuỗi)
sdk/api.ts    file backend gọi
sdk/kilomeet.ts   lớp nói chuyện chuẩn blockchain (api.ts dùng bên dưới)
sdk/config.ts     các con số của game
sdk/abi/      mô tả giao diện hợp đồng (sinh tự động)
test/         test hợp đồng
scripts/      deploy, demo, đồng bộ config
deployments/  địa chỉ hợp đồng theo mạng
```

Hợp đồng đã deploy thì **không sửa được**: đổi luật trong file `.sol` nghĩa là deploy lại, ra địa chỉ mới (xem `HE-THONG-BLOCKCHAIN-KILOMEET.md` để hiểu sâu từng hợp đồng).
