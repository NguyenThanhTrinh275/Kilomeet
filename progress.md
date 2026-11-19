# KILOMeet Backend — Tiến độ

> Cập nhật file này cuối mỗi phiên làm việc và mỗi khi xong một lát cắt.
> Ký hiệu: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` đã cắt bỏ (ghi lý do).
> Luật và quy trình nằm trong [`CLAUDE.md`](./CLAUDE.md). Chi tiết từng endpoint nằm trong [`docs/backend-api-contract.md`](./docs/backend-api-contract.md).
> Cách chạy + kịch bản demo: [`kilomeet-api/README.md`](./kilomeet-api/README.md), hợp đồng + Fuji: [`blockchain/README.md`](./blockchain/README.md).

## Tình trạng hiện tại

| | |
|---|---|
| **Cập nhật lần cuối** | 18/11/2026 |
| **Đang ở** | Code xong S1–S8 + hồ sơ quán + màn Ví & giao dịch + **ví phí trả trước của quán (quyết định #28, phí 3.000đ)**. **Chain chạy thật trên Fuji** (hợp đồng mới, verify Snowtrace, `feePerRedeemVnd = 3000`). 188 test BE + 24 test contract xanh, typecheck BE/FE sạch, FE đóng gói Android được |
| **Việc tiếp theo** | (1) **Thử 8 bước demo trên điện thoại thật** (chưa lần nào) · (2) quay video · (3) push + PR `feat/app-game-ui` → `main` · (4) báo người phụ trách blockchain địa chỉ hợp đồng mới · (5) duyệt quyết định #17–29 |
| **Đang vướng** | Không. Chain chạy thật trên Fuji bằng ví operator mới (18/11) |
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
- [x] Thiếu `blockchain/sdk/kilomeet.ts` → tự viết lại theo `sdk/api.ts` (18/11), `scripts/demo-api.ts` chạy đúng trên node Hardhat. README sửa 34 → 24 test
- [x] Đã xoá `contracts/` (bản Claude viết trước khi có `blockchain/`), 12/11
- [-] Lấy khoá ví operator cũ → thay bằng deploy lại với ví mới (18/11)

**Tích hợp chain trong BE**
- [x] `ChainGateway` + `FakeChain` + `FujiChain` gọi đúng hợp đồng `blockchain/` (12/11): reward/purchase/giftFor/redeem/createVoucherType/setMerchantApproved/start-end-settleSeason/recordBadge
- [x] `chain_outbox` ghi chung transaction + job gửi theo `seq`, lỗi thì dừng lô (giữ thứ tự), retry 5 lần; mùa on-chain đóng thì chờ; `createVoucherType` lưu `chain_token_id`
- [x] Đã thử với hợp đồng `blockchain/` trên node Hardhat local: 33 giao dịch done (seed → chạy → mua → tặng → quét → tạo voucher → duyệt quán → đóng/mở mùa), `pnpm chain:check` khớp
- [-] Lệch làm tròn chain (xuống) vs BE (`Math.round`) ≤ 1 token/lượt mua giảm giá: chấp nhận (chain luôn ≥ DB, không làm giao dịch lỗi); `chain:check` đánh dấu `~`
- [x] `GET /me/wallet`, `GET /admin/chain-txs` (link Snowtrace)

**Rà soát 18/11 (đọc trạng thái Fuji thật)**: hợp đồng sống, mùa on-chain 2 mở, operator `0xEF15…7598` đủ quyền, ~0,4 AVAX, tổng cung 550 RUN. **BE chưa từng gửi giao dịch nào lên Fuji.**
- [x] **P0** Tự deploy lại 18/11 bằng ví operator mới `0x4132…1128` (khoá trong `blockchain/.env` + `kilomeet-api/.env`), mùa on-chain 1 mở ngay khi deploy. Bản cũ lưu ở `deployments/fuji-v1.json`
- [x] **P0** `WALLET_MNEMONIC` mới trong `kilomeet-api/.env` (ví người dùng sạch)
- [x] **P0** `CHAIN=fuji` + `demo:reset`: 15 giao dịch seed done. Thử trên Fuji bằng Bình: mua ×2, tặng, quét QR, chạy 3 km → mint, đều done, `chain:check` khớp
- [x] **P1** Verify source 3 hợp đồng trên Snowtrace
- [x] **P1** Màn Ví & giao dịch (runner `/(runner)/wallet`, cửa hàng `/(store)/wallet`, quản trị `/(admin)/chain`), BE thêm `label`/`amount`; nút "Xem giao dịch" sau chạy, tặng, quét, đóng mùa
- [x] **P1** Mỗi lần seed dùng dải ví HD mới → số dư chain = DB sau `demo:reset`
- [x] P2 Outbox lưu txHash ngay khi phát, dòng `sent` mồ côi tra receipt thay vì gửi lại. Sửa thêm lỗi nonce do cache 250 ms của ethers (lộ ra khi chạy trên node local)
- [x] P2 Đóng mùa chốt từng người idempotent, bấm lại để chốt nốt; mở mùa tự chốt nốt mùa trước. Đóng mùa gửi theo lô: 4 giao dịch thay vì ~26

**Chuẩn bị demo**
- [x] Route mẫu 3 km (không qua quán) và 5 km qua đúng Fuji + Highlands (có test)
- [x] `pnpm demo replay ...` + nút "Phát buổi chạy mẫu" trên FE (`EXPO_PUBLIC_DEMO=true`)
- [x] `pnpm demo:reset`, `pnpm demo clock|ranking|season|timeline|outbox`
- [ ] URL công khai (`cloudflared`) đã thử với 4G
- [ ] Chạy trọn 8 bước demo 3 lần trên điện thoại thật
- [ ] Quay video dự phòng

---

## Giai đoạn 4 — Giao diện game "Arcade Light" (FE)

Thiết kế: Figma `RGHjgkkUPxUKr7fHlcZ8jo` (38 màn). Code trên nhánh `feat/app-game-ui`.

- [x] Token màu/font/bóng đổ `src/theme/game.ts`; font Baloo 2 · Nunito · Lilita One
- [x] Thư viện component `src/components/game/` (nút chunky, thẻ, đồng xu, huy hiệu hạng, XP bar, tab bar nổi, dialog, sheet, ghim bản đồ, ảnh bìa quán)
- [x] Viết lại toàn bộ màn Runner / Cửa hàng / Quản trị / Đăng nhập, giữ nguyên logic store + API
- [x] Màn mới: Giới thiệu quán `/(runner)/store/[id]`, Hồ sơ quán `/(store)/profile`, Tổng kết mùa `/(runner)/season-result`
- [x] Mock `/stores/profile`, `/store/profile` + hợp đồng Mục 8.2
- [x] **BE**: module hồ sơ quán (Mục 8.2): migration `store_profile`, `GET /stores/profile`, `GET/POST /store/profile`, seed hồ sơ 6 quán, 14 test
- [ ] Thử trên điện thoại thật, đặc biệt các màn có bản đồ (Chạy, Phòng chờ nhóm, Giới thiệu quán)

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

- **18/11/2026 (hoàn thiện chain)** · Màn Ví & giao dịch (3 vai) + link Snowtrace ở các bước demo; outbox chống gửi trùng (lưu txHash, tra receipt) + sửa lỗi nonce; đóng mùa idempotent + theo lô (đã chạy trên node Hardhat, số dư khớp); seed dùng ví mới mỗi lần; viết `sdk/kilomeet.ts`; README gốc cho giám khảo. 174 test BE xanh. Còn: thử máy thật, video, PR.
- **18/11/2026 (P0 chain)** · Deploy lại 3 hợp đồng lên Fuji (RunToken `0x49D4…8225`, Voucher `0x22aB…215c`, SeasonBadge `0xf9C9…E8B0`), verify Snowtrace, mnemonic ví mới, BE chạy `CHAIN=fuji`, seed + luồng mua/tặng/quét/chạy lên chain thật, khớp số dư. `deploy.ts` tự `startSeason()`. Còn: P1 màn giao dịch trên FE, thử máy thật, video.
- **18/11/2026 (rà soát)** · Rà toàn dự án, tập trung chain. 161 test BE + 24 test contract xanh, typecheck BE/FE sạch. Đọc trạng thái Fuji thật: BE chưa gửi giao dịch nào, ví người dùng dùng mnemonic công khai, hợp đồng chưa verify, FE chưa hiện giao dịch. Ghi việc P0–P2 ở Giai đoạn 3.

- **18/11/2026 (BE)** · Đối chiếu mọi endpoint FE gọi với BE: chỉ thiếu hồ sơ quán. Làm xong Mục 8.2 (migration + 3 endpoint + seed + 14 test). 161 test xanh, typecheck sạch, đã seed lại DB dev. Giờ FE và BE khớp hết endpoint. Còn: thử máy thật.
- **18/11/2026** · Thiết kế lại giao diện kiểu game trên Figma (38 màn) và code toàn bộ FE theo thiết kế trên nhánh `feat/app-game-ui`. Thêm tính năng hồ sơ quán (FE + mock + hợp đồng 8.2). Typecheck sạch, bundle Android build được, đã xem trên web các màn chính. Còn: BE hồ sơ quán, thử máy thật.

- **12/11/2026 (chiều)** · Làm hết S1–S8: 1 migration domain + 1 migration chỉnh, 7 module domain (68 test), API đủ mọi endpoint FE gọi + Mục 8 (137 test tổng, contract test). Contracts 3 hợp đồng (10 test), FujiChain thử với node local khớp số dư. FE: màn chạy (GPS thật, chọn quán, phát route mẫu), voucher (myPrice, tặng email), đăng ký cửa hàng, mùa/huy hiệu, nhóm (bản đồ, chia sẻ vị trí, huỷ, ghép tự động), mock cho endpoint mới. Còn: thử máy thật, deploy Fuji, duyệt #17–27. Chưa commit.
- **12/11/2026 (sáng)** · Chốt stack + A–D (#15, #16). Dựng `kilomeet-api/`: envelope, clock, JWT, auth, ví HD, seed, FakeChain. FE nối BE (client + auth store).
- **11/11/2026 (tối)** · Đối chiếu FE mới với hợp đồng API, viết `docs/backend-plan.md`. Phát hiện 4 chỗ FE đổi hợp đồng.
- **11/11/2026** · Viết `CLAUDE.md` và `progress.md`. Hợp đồng API và quy trình đã có sẵn trong `docs/`. Chưa có code BE.
- **18/11/2026 (ví phí trả trước)** · Quyết định #28: phí 3.000đ/lượt, quán nạp ví phí; mua → giữ phí (UPDATE có điều kiện, chịu mua đồng thời), quét → trừ, hết hạn → trả lại (cron mỗi giờ + `/admin/run-fee-release`); ví không đủ → `pausedForFee` "Tạm hết". API `/store/fee`, `/store/fee/topup` (idempotent theo `requestId`). Figma: màn 33 · Ví phí + 26b · Tổng quan (ví phí) + 3 component. FE: màn Ví phí, banner thiếu tiền ở Tổng quan và Tạo voucher, "Tạm hết" phía người chạy. Sửa lỗi Pressable mất style trên Android (`components/game/Press.tsx`), nút tab giữa lệch/che chữ. Đặt phí on-chain 3.000đ (`pnpm chain:set-fee`). 188 test BE xanh.
- **18/11/2026 (quyết định #29 + font)** · Bỏ khoá tìm nhóm khi vắng 2 lần: vắng/trễ chỉ giảm độ đúng hẹn. Sửa lỗi font: kiểu số (Lilita One) không có dấu tiếng Việt → `GText` tự dùng Baloo 2 khi chuỗi có ộ/ủ/ơ/ư….
- **18/11/2026 (test trên Samsung S23+ qua adb)** · Chạy kịch bản demo bước 2–8 trên máy thật. Sửa ~25 lỗi giao diện Android (cắt chữ có dấu/font đậm, Pressable mất style, thanh tab, bàn phím che sheet, hộp thoại tràn, bản đồ hoạt hình), 1 lỗi chain quan trọng (khoá thưởng trùng sau reset → mint bị bỏ qua; nay gắn ví), nạp ví phí gọi trùng song song, màn kết quả mùa tự hiện. 189 test BE xanh, chain:check khớp. Chi tiết: `docs/test-checklist.md`.
- **19/11/2026 (test lần 2 trên S23+)** · Checklist 147/153 đạt, còn R-18→R-23 (GPS thật, người dùng tự đi). Sửa: hook đặt sau return sớm làm treo app (groups, voucher detail), toast bị che dưới Modal (`GameToaster`), voucher được tặng hiện sai trạng thái, ghép tự động không tự cập nhật/không đóng được, tìm kiếm không dấu, trang quán không thấy voucher mới, request treo khi mất mạng (timeout 12 s + toast), cùng nhiều lỗi chữ/bố cục. 189 test BE xanh, typecheck FE sạch, đóng gói Android được.
