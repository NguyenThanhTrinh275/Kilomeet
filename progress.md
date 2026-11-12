# KILOMeet Backend — Tiến độ

> Cập nhật file này cuối mỗi phiên làm việc và mỗi khi xong một lát cắt.
> Ký hiệu: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` đã cắt bỏ (ghi lý do).
> Luật và quy trình nằm trong [`CLAUDE.md`](./CLAUDE.md). Chi tiết từng endpoint nằm trong [`docs/backend-api-contract.md`](./docs/backend-api-contract.md).
> Cách chạy + kịch bản demo: [`kilomeet-api/README.md`](./kilomeet-api/README.md), hợp đồng + Fuji: [`blockchain/README.md`](./blockchain/README.md).

## Tình trạng hiện tại

| | |
|---|---|
| **Cập nhật lần cuối** | 12/11/2026 |
| **Đang ở** | Code xong S1–S8 + contract + FE nối BE. 137 test BE + 10 test contract xanh, typecheck BE/FE sạch, FE đóng gói Android được |
| **Việc tiếp theo** | (1) Bạn thử trên điện thoại thật theo kịch bản demo · (2) duyệt quyết định tạm chốt #17–27 · (3) `pnpm demo:reset` (bắt buộc sau migration chain 12/11) |
| **Đang vướng** | Khoá ví operator của hợp đồng Fuji (`blockchain/`) nằm ở người phụ trách blockchain; `blockchain/sdk/kilomeet.ts` chưa được push |
| **Hạn MVP** | ~20/11/2026 |

---

## Giai đoạn 0 — Chốt trước khi code

- [x] Chốt 14 điểm spec chưa rõ (11/11). Xem Mục 11 của hợp đồng API.
- [x] Chốt stack (12/11): Fastify 5, Prisma 6, PostgreSQL 16 (Docker, cổng 5433), Zod 4, Vitest 3, node-cron 4, Hardhat 2 + OZ 5, ethers v6. Quyết định #15.
- [x] Chốt 4 điểm A–D (12/11): BE chiều theo FE. Quyết định #16.
- [x] Tạo `kilomeet-api/`
- [-] Chia việc: không cần (Claude + bạn làm hết)

## Giai đoạn 1 — Bộ khung (G1)

- [x] `package.json` đủ script, `tsconfig`, `.env.example`, `docker-compose.yml` (DB dev + test)
- [x] Envelope + error handler toàn cục (404, validate, JSON hỏng, POST body rỗng → `{}`), message tiếng Việt
- [x] `lib/clock.ts` + `GET/POST /admin/clock` (offset lưu `app_settings`)
- [x] JWT 30 ngày, `requireAuth` đọc lại role từ DB, hội viên hết hạn thì hạ ngay
- [x] `src/contract/` Zod theo `types.ts` + contract test mọi endpoint FE gọi
- [x] Auth login/register (cả cửa hàng)/me, ví HD custodial, `GET /health`
- [x] Seed: 13 tài khoản, mùa 3/2026, 6 quán + 6 voucher (giống mock), lịch sử 4 tuần, 24 buổi chạy của Minh
- [x] FE: `client.ts` đọc `EXPO_PUBLIC_API_URL` + Bearer + "Không kết nối được máy chủ"; lưu/khôi phục token
- [ ] **Thử trên điện thoại thật**: đăng nhập Minh hiện đúng tên; sai mật khẩu hiện toast; mock vẫn chạy khi URL rỗng

## Giai đoạn 2 — Các lát cắt

### S1 — Buổi chạy + nhiệm vụ ✅
- [x] Domain `haversineKm`, `routeDistanceKm` (lọc > 25 km/h), `weeklyTarget`, `weeklyReward`, giờ VN
- [x] Test spec: 13,6 → 15/105 · mới → 5/35 · 40 → 44/308 · 1,2+0,9 cùng ngày → xong · hai bên 0:00 → chưa xong
- [x] `/runs/start` (`endedAt: ""`), `/runs/end` (tự tính km, idempotent kể cả gọi song song), `GET /runs`
- [x] `GET /quests` (sinh lười), `/quests/complete` (idempotent, không phát token), `token_ledger` unique
- [x] FE: timestamp thật từng điểm GPS, bỏ `MOCK_STORE`, gọi `/auth/me` + `/quests` sau buổi chạy, không tự cộng token

### S2 — Hạng tuần ✅
- [x] `levelOf`, `nextRank` (lên từ từ / lên nhanh / giữ / tụt / lượt miễn), huy hiệu mùa
- [x] Test: 6 dòng của Lan · #5 #6 #7 · Đồng 0 km không mất lượt miễn · Cao thủ không lên thêm
- [x] `weekly_results` unique (user, week) · cron CN 23:59 VN + `POST /admin/run-weekly-ranking`

### S3 — Chạy ngang quán ✅
- [x] `storesPassed` 50 m (chỉ quán đang bán voucher có nhiệm vụ), qua 1 quán tự nhận
- [x] `GET /runs/passed-stores`, `POST /runs/claim-store` (1 quán / buổi), hạn 7 ngày
- [x] FE: màn chọn 1 quán sau buổi chạy

### S4 — Mua và tặng voucher ✅
- [x] `priceFor` (Math.round), `buyError`, `giftError`; mỗi mẫu giảm 1 lần (unique DB)
- [x] Test: 500 → 250 · 2 request mua song song khi còn 1 → đúng 1 thành công · tặng lần 2 → lỗi · hết 7 ngày → giá gốc
- [x] `GET /vouchers` (+`myQuestEligible`, `myPrice`), `/vouchers/mine` (tự `expired`), `/vouchers/buy` (bỏ qua `questCompleted`), `/vouchers/gift` (email hoặc ID, đổi QR)
- [x] FE: dùng `myPrice`/`paidTokens`, ô tặng nhập email, `/auth/me` sau khi mua

### S5 — Cửa hàng ✅
- [x] `POST /store/vouchers` (tên field mới + cũ, `dd/mm/yyyy`, rỗng +90 ngày, chỉ quán đã duyệt)
- [x] `POST /store/scan` (đốt + phí 5.000đ, quét lại → "Voucher đã được sử dụng", quán khác → lỗi), `GET /store/dashboard`
- [x] FE: đăng ký cửa hàng gửi role + tên/địa chỉ/vị trí GPS; kéo để làm mới trạng thái duyệt
- [-] FE gửi `area` khi tạo voucher — để sau (BE đã nhận `area`)

### S6 — Mùa và quản trị ✅
- [x] `seasonOf`, `seasonReset`, `daysLeft`
- [x] Test: Cao thủ 1.000 → 500 + Bạch kim · 300 → 300 · #8 chấm tuần dở dang · đóng 2 lần → lỗi
- [x] `/admin/stores`, `/admin/stores/:id`, `/admin/pending-stores`, `/admin/approve-store`, `/admin/season(s)`, `POST /admin/season`
- [x] `GET /seasons/current`, `GET /me/badges`; FE banner mùa + màn huy hiệu đọc API (chạm mở Snowtrace)

### S7 — Hội viên + nhóm ✅
- [x] `rankCompatible` hai chiều, khung giờ, khoá 1 tuần khi vắng 2 lần
- [x] `/auth/subscribe` (+ hết hạn), `/groups`, `/groups/detail`, `create`, `join`, `confirm`, `leave`, "Tính năng dành cho Hội viên"
- [x] FE: tham gia + xác nhận, huỷ gọi API, chọn ngày + điểm hội tụ trên bản đồ

### S8 — Nhóm thời gian thực ✅
- [x] `dueMilestones` (T−2h … T+10', kết thúc), check-in 50 m, độ đúng hẹn, `autoMatch`, thông báo
- [x] `/groups/location`, `/groups/locations`, `/groups/auto-match`, `/groups/meeting-points`; cron mỗi phút + `/admin/run-group-timeline` + xử lý lười khi đọc
- [x] FE: bản đồ thành viên (poll 5 s), tự chia sẻ vị trí, nút "Ghép tự động" gọi API

---

## Giai đoạn 3 — Blockchain + demo

**Contract (`blockchain/`, nhánh blockchain-layer, merge 12/11)**
- [x] `RunToken` (reward có khoá chống trùng, settleSeason theo hạng), `Voucher` (purchase đốt token, giftFor 1 lần, redeem + phí), `SeasonBadge` — 24 test qua
- [x] Đã deploy Fuji (`blockchain/deployments/fuji.json`): mùa on-chain 2 đang mở, operator đủ quyền, còn ~0,4 AVAX
- [ ] Thiếu file `blockchain/sdk/kilomeet.ts` (sdk/api.ts import nó) và 1 file test (README ghi 34 test, repo có 24) → nhờ người phụ trách blockchain push
- [x] Đã xoá `contracts/` (bản Claude viết trước khi có `blockchain/`), 12/11
- [ ] Lấy khoá ví operator từ người phụ trách blockchain → `CHAIN=fuji` chạy thật

**Tích hợp chain trong BE**
- [x] `ChainGateway` + `FakeChain` + `FujiChain` gọi đúng hợp đồng `blockchain/` (12/11): reward/purchase/giftFor/redeem/createVoucherType/setMerchantApproved/start-end-settleSeason/recordBadge
- [x] `chain_outbox` ghi chung transaction + job gửi theo `seq`, lỗi thì dừng lô (giữ thứ tự), retry 5 lần; mùa on-chain đóng thì chờ; `createVoucherType` lưu `chain_token_id`
- [x] Đã thử với hợp đồng `blockchain/` trên node Hardhat local: 33 giao dịch done (seed → chạy → mua → tặng → quét → tạo voucher → duyệt quán → đóng/mở mùa), `pnpm chain:check` khớp
- [ ] Lệch làm tròn: chain tính giá giảm làm tròn **xuống**, BE `Math.round` → lệch ≤ 1 token khi giá × % không chẵn (seed không bị)
- [x] `GET /me/wallet`, `GET /admin/chain-txs` (link Snowtrace)

**Chuẩn bị demo**
- [x] Route mẫu 3 km (không qua quán) và 5 km qua đúng Fuji + Highlands (có test)
- [x] `pnpm demo replay ...` + nút "Phát buổi chạy mẫu" trên FE (`EXPO_PUBLIC_DEMO=true`)
- [x] `pnpm demo:reset`, `pnpm demo clock|ranking|season|timeline|outbox`
- [ ] URL công khai (`cloudflared`) đã thử với 4G
- [ ] Chạy trọn 8 bước demo 3 lần trên điện thoại thật
- [ ] Quay video dự phòng

---

## Mốc kiểm tra theo ngày

| Ngày | Mốc cuối ngày | Đạt? |
|---|---|---|
| D1 · 11/11 | Đăng nhập thật trên điện thoại | [ ] chờ thử máy thật |
| D2 · 12/11 | Chạy 3 km → +10 token | [x] (API + CLI) |
| D3 · 13/11 | Tua tuần → hạng đổi đúng | [x] (test) |
| D4 · 14/11 | Chạy qua 2 quán → mua voucher còn 250 token | [x] (test + CLI) |
| D5 · 15/11 | Quét QR → đốt voucher + ghi phí; đóng mùa → 500 token | [x] (test + chain local) |
| D6 · 16/11 | Tạo nhóm, 3 tài khoản tham gia và xác nhận | [x] (test) |
| D7 · 17/11 | Bản đồ hiện 3 người đang tới | [~] code xong, chờ thử 3 máy |
| D8 · 18/11 | **Đóng băng tính năng.** Chạy trọn 8 bước demo không lỗi | [ ] |
| D9 · 19/11 | Tập dượt ×3, có video dự phòng | [ ] |

---

## Đã cắt / hoãn

| Hạng mục | Lý do | Thay bằng |
|---|---|---|
| Lọc voucher/bảng xếp hạng theo khu vực | Người chạy chưa khai báo khu vực | BE nhận `area`, so khi cả 2 bên có; `/leaderboard` toàn thành phố |
| Huy hiệu "chạy chung", kết bạn | Không có trong demo | — |
| Push notification | Không có trong demo | `GET /notifications` (FE chưa có màn) |

## Câu hỏi mở (chờ người dùng chốt)

- Duyệt các quyết định **#17–27** Claude tạm chốt khi code (bảng Mục 11 hợp đồng API): hạn xác nhận nhóm lập muộn, người chưa xác nhận bị rút, rời sau hạn bị ghi vắng, định nghĩa đúng hẹn, giờ kết thúc nhóm, điều kiện ghép tự động, chỉ mint huy hiệu khi > Đồng, ngày của buổi chạy theo giờ kết thúc, lọc > 25 km/h, `GET /runs?userId` chỉ trả của mình, hạn `dd/mm/yyyy` = 23:59:59 VN.

## Nhật ký phiên làm việc

Mới nhất ghi ở trên. Mỗi dòng: ngày · đã làm gì · còn dở gì.

- **12/11/2026 (chiều)** · Làm hết S1–S8: 1 migration domain + 1 migration chỉnh, 7 module domain (68 test), API đủ mọi endpoint FE gọi + Mục 8 (137 test tổng, contract test). Contracts 3 hợp đồng (10 test), FujiChain thử với node local khớp số dư. FE: màn chạy (GPS thật, chọn quán, phát route mẫu), voucher (myPrice, tặng email), đăng ký cửa hàng, mùa/huy hiệu, nhóm (bản đồ, chia sẻ vị trí, huỷ, ghép tự động), mock cho endpoint mới. Còn: thử máy thật, deploy Fuji, duyệt #17–27. Chưa commit.
- **12/11/2026 (sáng)** · Chốt stack + A–D (#15, #16). Dựng `kilomeet-api/`: envelope, clock, JWT, auth, ví HD, seed, FakeChain. FE nối BE (client + auth store).
- **11/11/2026 (tối)** · Đối chiếu FE mới với hợp đồng API, viết `docs/backend-plan.md`. Phát hiện 4 chỗ FE đổi hợp đồng.
- **11/11/2026** · Viết `CLAUDE.md` và `progress.md`. Hợp đồng API và quy trình đã có sẵn trong `docs/`. Chưa có code BE.
