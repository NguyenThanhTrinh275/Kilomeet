# KILOMeet – phần Blockchain (Avalanche C-Chain)

Gồm 3 hợp đồng Solidity + SDK TypeScript (`sdk/kilomeet.ts`) để backend gọi.

## Hợp đồng
| Hợp đồng | Chuẩn | Ghi chú |
|---|---|---|
| `RunToken` | ERC-20 (decimals 0) | Không chuyển được. `reward` (phát, idempotent theo rewardId), `burnFrom` (chỉ Voucher), mở/đóng/chốt mùa (cắt token theo hạng) |
| `Voucher` | ERC-1155 | Mua = đốt token (giảm giá 1 lần/người/voucher), tặng đúng 1 lần, chặn chuyển tự do, `redeem` đốt voucher + ghi phí 5.000đ |
| `SeasonBadge` | ERC-721 soulbound | Mỗi (user, mùa) 1 huy hiệu, lưu hạng cao nhất |

Backend dùng 1 ví **operator** (relayer) ký mọi giao dịch (user không tốn gas). Admin = ví deployer.

## Chạy
```bash
npm install --legacy-peer-deps
cp .env.example .env        # điền DEPLOYER_PRIVATE_KEY (ví có AVAX Fuji, faucet: https://core.app/tools/testnet-faucet)
npm test                    # 10 test
npm run deploy:fuji         # ghi địa chỉ vào deployments/fuji.json
npm run build:sdk           # xuất ABI -> sdk/abi/
```
Nếu muốn operator khác deployer: đặt `OPERATOR_ADDRESS` trước khi deploy. Sau deploy, operator gọi `startSeason()` để mở mùa 1.
Thử local: `npx hardhat node` → `npx hardhat run scripts/deploy.ts --network localhost` → `npx ts-node scripts/demo-api.ts` (đặt `CHAIN_NET=localhost`, `RPC_URL=http://127.0.0.1:8545`). Backend chỉ cần import `sdk/api.ts`.

## Backend dùng SDK
```ts
import { KilomeetChain, Rank } from "./sdk/kilomeet";
const chain = await new KilomeetChain({
  rpcUrl: process.env.FUJI_RPC_URL!,
  operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY!,
  addresses: require("./deployments/fuji.json"),
}).init();
```

| Việc backend cần | Hàm |
|---|---|
| Ví mới + gas | `KilomeetChain.createWallet()`, `fundGas(addr)` |
| Nhiệm vụ đạt → phát token | `rewardMission(addr, amount, rewardKey)`, `rewardMissionBatch([...])` (rewardKey duy nhất, vd `daily:<userId>:<date>`, gọi lại không phát trùng) |
| Xem token | `getTokenBalance(addr)` |
| Mở / đóng mùa | `startSeason()`, `endSeason()`, `settleSeason(users)`, **`closeSeason(users)`** (nút "đóng mùa" demo: đóng + cắt token + ghi huy hiệu) |
| Huy hiệu | `recordBadge`, `recordBadges`, `getBadge` |
| Duyệt cửa hàng | `approveMerchant(addr)` |
| Tạo voucher | `createVoucherType({merchant, basePrice, discountPercent, maxSupply, expiry})` → `typeId` |
| Giá / thông tin | `priceOf(typeId, discounted)`, `getVoucherType(typeId)` |
| Mua | `purchaseVoucher(buyer, typeId, applyDiscount)` |
| Tặng | `giftVoucher(from, to, typeId)` |
| Quét QR | `redeemVoucher(holder, typeId)` → `feeVnd` |
| Ví voucher | `getWalletVouchers(addr)`, `getVoucherBalance`, `getGiftable` |
| Phí / đối chiếu | `getMerchantFee(merchant)`, `getRedeemEvents({merchant})`, `onRedeemed(cb)` |

Lỗi revert được dịch thành `err.code` = tên lỗi: `SoldOut`, `Expired`, `DiscountAlreadyUsed`, `AlreadyRewarded`, `NotGiftable`, `NoVoucher`, `SeasonNotActive`, ...

Hạng: `Rank.Dong=0, Bac=1, Vang=2, BachKim=3, KimCuong=4, CaoThu=5`.

## Việc backend PHẢI tự làm (không nằm trên chuỗi)
- Chấm nhiệm vụ, tính hạng (lên/tụt/lên nhanh), xác minh GPS nhiệm vụ voucher (<50 m), cửa sổ 7 ngày sau nhiệm vụ.
- Kiểm tra hạng tối thiểu, khu vực trước `purchaseVoucher`. Giá giảm chỉ truyền `applyDiscount=true` khi nhiệm vụ đã xong.
- Xác thực QR (nên ký + nonce/hết hạn ngắn) và xác nhận chủ voucher đồng ý tặng trước khi gọi `giftVoucher`/`redeemVoucher`.
- Tính "hạng lúc hết mùa" và "hạng cao nhất mùa" của từng người để gọi `closeSeason`. Mùa mới: gọi `startSeason()`, rồi tự tụt 2 hạng trong DB.
- Khóa operator private key trong biến môi trường, không commit.

## Lưu ý
- Giữ một instance `KilomeetChain` dùng chung (NonceManager quản lý nonce, gửi song song được).
- Phí 5.000đ chỉ được ghi nhận trên chuỗi (event + `feeAccruedVnd`); việc thu tiền do backend lo.
