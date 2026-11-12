# kilomeet-api

Backend KILOMeet: Fastify + Prisma (PostgreSQL) + Zod 4 + Vitest, chain qua outbox (`CHAIN=fake|fuji`).

## Chạy lần đầu

```bash
cd kilomeet-api
cp .env.example .env            # sửa JWT_SECRET; MEMBERSHIP_DAYS=365 cho demo
docker compose up -d            # Postgres 16 ở cổng 5433 (DB kilomeet + kilomeet_test)
pnpm install
pnpm db:deploy                  # áp migration
pnpm db:seed                    # 13 tài khoản demo, mật khẩu demo123
pnpm dev                        # http://0.0.0.0:3000
```

Điện thoại (Expo Go): tạo `kilomeet-app/.env.local` với `EXPO_PUBLIC_API_URL=http://<IP LAN máy này>:3000`
(thêm `EXPO_PUBLIC_DEMO=true` để hiện nút "Phát buổi chạy mẫu"), rồi `pnpm start -c`.
Mạng hội trường chặn LAN thì dùng `cloudflared tunnel --url http://localhost:3000`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm test` / `pnpm test test/domain` | Toàn bộ test / chỉ hàm thuần (DB test: `kilomeet_test`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Tạo migration mới khi đổi `schema.prisma` |
| `pnpm demo:reset` | Xoá DB + migrate + seed lại trạng thái demo |
| `pnpm demo replay <user> <3km\|5km-2-quan> [--claim store-fuji]` | Phát buổi chạy ghi sẵn như điện thoại |
| `pnpm demo clock <ISO\|sunday\|reset>` | Tua giờ server (`sunday` = CN 23:59 tuần này) |
| `pnpm demo ranking` · `season end` · `season start` · `timeline` · `outbox` · `me <user>` | Kích hoạt job / xem số dư |
| `pnpm chain:check` | Đối chiếu số dư DB với on-chain (CHAIN=fuji) |

`API_URL=...` để CLI demo gọi server khác `localhost:3000`.

## Chạy với Avalanche Fuji

Hợp đồng là của thư mục [`../blockchain`](../blockchain/README.md), đã deploy sẵn trên Fuji (`deployments/fuji.json`). BE không dùng SDK `sdk/api.ts` bên đó mà gọi thẳng hợp đồng qua outbox.

1. Xin khoá ví **operator** (`0xEF15…7598`) từ người phụ trách blockchain, ghi vào `.env`: `CHAIN=fuji`, `SERVER_PRIVATE_KEY=0x...`.
2. `pnpm demo:reset` (seed ghi lệnh duyệt quán + tạo loại voucher + phát số dư mở đầu vào outbox), rồi `pnpm dev`.
3. Job outbox gửi lần lượt mỗi 5 s. `pnpm chain:check` để đối chiếu DB với chain.

Lệnh outbox ↔ hợp đồng: `mintToken` → `RunToken.reward` (khoá chống phát trùng), `purchaseVoucher` → `Voucher.purchase` (chain tự đốt token), `giftVoucher` → `giftFor`, `redeemVoucher` → `redeem`, `createVoucherType`/`approveMerchant`, `endSeason` → `settleSeason` từng ví → `recordBadge`, `startSeason`.
`RunToken.reward` chỉ chạy khi mùa on-chain đang mở; lúc mùa đóng, lệnh phát token chờ (không tính lần thử).

## Tài khoản demo (mật khẩu `demo123`)

| Email | Vai trò | Trạng thái |
|---|---|---|
| `lan@demo.com` | runner | Đồng, 0 token |
| `minh@demo.com` | member | Cao thủ, 1.000 token, 42 km tuần này, 24 buổi chạy, mục tiêu tuần 44 km |
| `an@demo.com`, `binh@demo.com` | member | Kim cương / Cao thủ, gần HCMUT (ghép nhóm) |
| `quanfuji@demo.com` | store | Fuji Coffee (10.773, 106.660), voucher vt-1 500 token, nhiệm vụ giảm 50% |
| `highlands@demo.com`, `phuclong@`, `cong@`, `banhmi@`, `juice@` | store | Đã duyệt, mỗi quán 1 voucher |
| `newcafe@demo.com`, `juicebar@demo.com` | store | Chờ duyệt |
| `admin@demo.com` | admin | |

## Kịch bản demo 3 phút

Trước demo: `pnpm demo:reset`, `pnpm dev`, mở Snowtrace nếu `CHAIN=fuji`.

1. **Đăng nhập** `lan@demo.com` → Hồ sơ: địa chỉ ví (chạm để mở Snowtrace).
2. **Chạy 3 km**: tab Chạy → "Phát buổi chạy mẫu · 3 km" (hoặc `pnpm demo replay lan 3km`) → +10 token, km tuần ghi nhận.
3. **Cao thủ**: đăng nhập `minh@demo.com` → hạng Cao thủ, 42/44 km mục tiêu tuần.
4. **Chạy ngang quán**: Minh mở voucher Fuji (500 token) → "Phát buổi chạy mẫu · 5 km ngang Fuji + Highlands" → chọn **Fuji Coffee** → voucher còn **250 token**.
5. **Mua + tặng**: mua (trừ 250) → "Tặng" → `lan@demo.com`.
6. **Cửa hàng quét**: đăng nhập `quanfuji@demo.com` → Quét QR trên máy Lan → voucher bị đốt, +5.000 đ.
7. **Nhóm**: Minh / An / Bình (hội viên) → "Ghép tự động" trên cả 3 máy (hoặc Minh tạo nhóm, 2 người tham gia) →
   `pnpm demo clock <T−20 phút>` → bản đồ hiện từng người đang tới.
8. **Đóng mùa**: `admin@demo.com` → Mùa giải → Đóng mùa → Minh còn **500 token, Bạch kim**, có huy hiệu mùa.

Tua tuần để khoe xếp hạng: `pnpm demo clock sunday && pnpm demo ranking`.

## Cấu trúc

```
src/domain/    hàm thuần (rank, season, quest, pricing, geo, group, time) — test ở test/domain
src/modules/   <tên>/routes.ts (Zod) · service.ts (domain + DB transaction + outbox)
src/chain/     ChainGateway · FakeChain · FujiChain (ethers v6, hợp đồng ../blockchain)
src/jobs/      cron: xếp hạng CN 23:59, hết hạn hội viên, mốc giờ nhóm, gửi outbox mỗi 5 s
src/contract/  Zod schema theo kilomeet-app/src/api/types.ts (contract test)
scripts/       demo CLI, route GPS mẫu, chain-check
```

Luật: DB là nguồn sự thật; mọi thay đổi token/voucher trong 1 transaction + ghi `chain_outbox`; giờ lấy qua `lib/clock.ts`.
