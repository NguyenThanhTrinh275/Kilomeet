# KILOMeet — Kế hoạch triển khai Backend (bản cập nhật theo FE mới)

> Ngày viết: **11/11/2026** (tối) · Hạn MVP: **~20/11/2026**
> Viết sau khi FE được làm lại giao diện (commit `8c40a76` — Reusables UI kit, react-hook-form + Zod, toast thay `Alert`).
>
> Tài liệu này là **bản đồ thi công**: làm gì, theo thứ tự nào, xong thì trông ra sao, và cần biết lý thuyết gì.
> Chi tiết từng endpoint **không chép lại ở đây** mà nằm ở:
>
> | Cần tra | Mở file |
> |---|---|
> | Luật chơi, kịch bản demo 3 phút | [`KILOMeet.md`](./KILOMeet.md) |
> | Request/response, thuật toán, 14 quyết định đã chốt | [`backend-api-contract.md`](./backend-api-contract.md) |
> | Nguyên tắc, cách test, rủi ro, thứ tự cắt bớt | [`backend-implementation-process.md`](./backend-implementation-process.md) |
> | Checklist tiến độ từng ngày | [`../progress.md`](../progress.md) |

## Mục lục

1. [Bức tranh tổng thể](#1-bức-tranh-tổng-thể)
2. [FE mới đã đổi gì — ảnh hưởng tới BE](#2-fe-mới-đã-đổi-gì--ảnh-hưởng-tới-be)
3. [Kiến trúc BE](#3-kiến-trúc-be)
4. [Kế hoạch từng bước](#4-kế-hoạch-từng-bước)
5. [Việc FE cần sửa để nối BE](#5-việc-fe-cần-sửa-để-nối-be)
6. [Lịch còn lại](#6-lịch-còn-lại)
7. [Lý thuyết cần biết](#7-lý-thuyết-cần-biết)
8. [Bẫy hay gặp — đọc trước khi code](#8-bẫy-hay-gặp--đọc-trước-khi-code)

---

## 1. Bức tranh tổng thể

```
 ┌──────────────── Điện thoại (Expo) ────────────────┐
 │  kilomeet-app/  — màn hình + Zustand stores        │
 │  src/api/client.ts                                 │
 │    baseUrl rỗng  → mock (src/api/mock/*)           │
 │    baseUrl có    → fetch tới BE  ◄── HIỆN CHƯA BẬT │
 └──────────────────────┬────────────────────────────┘
                        │ HTTP JSON + Bearer JWT
                        ▼
 ┌──────────────── kilomeet-api/ (Fastify) ──────────┐
 │  routes  →  service  →  domain (hàm thuần)         │
 │                 │                                  │
 │                 ├── Prisma → PostgreSQL (nguồn sự thật)
 │                 └── chain_outbox (ghi chung transaction)
 │  jobs: xếp hạng tuần · hết hạn hội viên ·          │
 │        mốc giờ nhóm · gửi giao dịch chain          │
 └──────────────────────┬────────────────────────────┘
                        │ ethers v6 (job chạy nền)
                        ▼
 ┌──────────────── Avalanche Fuji ───────────────────┐
 │  RunToken (ERC-20) · Voucher (ERC-1155) ·          │
 │  SeasonBadge (soulbound)                           │
 └───────────────────────────────────────────────────┘
```

**Hiện trạng:**

| Phần | Tình trạng |
|---|---|
| FE (`kilomeet-app/`) | Đủ màn hình cho 4 vai trò, chạy hoàn toàn bằng mock. |
| Tài liệu nghiệp vụ + hợp đồng API | Đầy đủ, 14 điểm mơ hồ đã chốt. |
| BE (`kilomeet-api/`) | **Chưa có dòng code nào.** |
| Smart contract (`contracts/`) | Chưa có. |

**Nguyên tắc xuyên suốt (tóm tắt từ `CLAUDE.md`):**
1. FE là hợp đồng — trả đúng hình dạng `types.ts`, chỉ được **thêm** field.
2. Mọi response là `{ success, data }` hoặc `{ success: false, message }` (tiếng Việt), kể cả 404 và lỗi validate.
3. Làm từng **lát cắt dọc** (DB → logic → API → test → nối FE), không làm theo tầng.
4. Logic nghiệp vụ là **hàm thuần** nhận `now` làm tham số → test bằng ví dụ số trong spec.
5. DB là nguồn sự thật; blockchain đi sau qua outbox.

---

## 2. FE mới đã đổi gì — ảnh hưởng tới BE

Hai tài liệu trong `docs/` được viết dựa trên FE **trước** đợt làm lại giao diện. Đã đối chiếu lại toàn bộ lời gọi `api.get/post` trong FE hiện tại. Kết quả:

### 2.1 Ba chỗ FE đã đổi hợp đồng (BE phải theo)

| # | FE hiện gọi | Hợp đồng cũ ghi | Vấn đề |
|---|---|---|---|
| **A** | `GET /admin/stores` → mảng `PendingStore & { status: 'pending' \| 'approved' \| 'rejected' }` (`app/(admin)/stores.tsx:45`) | chỉ có `GET /admin/pending-stores` | Endpoint mới, trả **mọi** cửa hàng kèm trạng thái để chia 3 tab. Mock router **không có** route này → ở chế độ mock màn "Duyệt cửa hàng" lỗi ngay. |
| **B** | `POST /admin/stores/<id>` body `{ action: 'approve' \| 'reject' }` (`stores.tsx:60`) | `POST /admin/approve-store` body `{ storeId, approved }` | Dùng **path param** — trái quy ước "không dùng path param" ở hợp đồng Mục 2.2. Mock cũng không có. |
| **C** | `GET /admin/season` (số ít, `app/(admin)/season.tsx:42`) | `GET /admin/seasons` (số nhiều) | Màn tổng quan admin vẫn gọi `/admin/seasons`, màn mùa giải gọi `/admin/season`. Cần cả hai. |
| **D** | `POST /store/vouchers` body đổi tên field (`app/(store)/vouchers/create.tsx:76-86`):<br>`questType` (thay `questDescription`)<br>`quantity` (thay `totalSupply`)<br>`expiryDate` = chuỗi người dùng gõ `"31/12/2026"` hoặc `""` (thay `expiresAt` ISO) | body cũ ở Mục 5.5 | FE **không còn** tự đặt hạn +90 ngày, cũng không đổi ngày sang ISO. Mock vẫn đọc tên cũ → mock tạo voucher hỏng (`totalSupply: undefined`). |

**Đề xuất (cần bạn chốt — xem cuối file):** BE **chiều theo FE** vì FE là hợp đồng:

- **A:** thêm `GET /admin/stores`. Giữ `GET /admin/pending-stores` vì màn tổng quan admin vẫn dùng để đếm.
- **B:** thêm `POST /admin/stores/:id` `{ action }`. Đây là **ngoại lệ duy nhất** của quy ước path param. Ghi rõ vào hợp đồng. Giữ `/admin/approve-store` làm bí danh (cùng một service).
- **C:** `GET /admin/season` và `GET /admin/seasons` trỏ về cùng một handler.
- **D:** `POST /store/vouchers` nhận **cả tên mới lẫn tên cũ**:
  - `questDescription = questType ?? questDescription ?? null`
  - `totalSupply = quantity ?? totalSupply`
  - `expiresAt`: nếu có `expiresAt` ISO thì dùng; nếu `expiryDate` dạng `dd/mm/yyyy` thì lấy **23:59:59 giờ VN** của ngày đó; nếu rỗng thì **now + 90 ngày**. Sai định dạng → `"Hạn sử dụng không hợp lệ (dd/mm/yyyy)"`.
- FE bổ sung 3 route vào `src/api/mock/router.ts` và sửa `mockCreateVoucher` cho khớp, để chế độ mock không vỡ.
- Cập nhật Mục 5.5, 5.7 của `backend-api-contract.md` trong cùng PR với BE.

### 2.2 Những chỗ FE **vẫn chưa sửa** (hợp đồng Mục 1 và Mục 7 còn đúng)

| Vấn đề | Vị trí hiện tại | Ảnh hưởng |
|---|---|---|
| Không gọi `setBaseUrl`, không gửi `Authorization`, token không lưu | `src/api/client.ts:15-24`, `src/stores/auth.ts` | FE chưa nói chuyện được với BE. **Chặn mọi thứ.** |
| Đăng ký không gửi `role` và thông tin quán | `app/(auth)/register.tsx:40` | Không đăng ký được cửa hàng thật. |
| Chạy bộ: so với 1 quán cố định `MOCK_STORE`, mọi điểm GPS cùng 1 timestamp, tự gọi `/quests/complete` | `app/(runner)/(tabs)/run.tsx:128-153` | BE phải tự tính `passedStoreIds`, `/quests/complete` phải idempotent. |
| Nút "Huỷ tham gia" nhóm chỉ `router.back()` | `app/(runner)/groups/[id].tsx:284-287` | Cần `POST /groups/leave` + FE gọi. |
| `seasonDaysLeft` hardcode, huy hiệu mùa là mock | `(tabs)/index.tsx`, `badges.tsx` | Cần `/seasons/current`, `/me/badges`. |
| Tặng voucher bằng user ID | `voucher/[id].tsx` | BE nhận cả email. |
| Ô "khu vực" có trên form nhưng **vẫn không gửi** | `create.tsx` (field `area` không có trong body) | Lọc khu vực để sau. |

### 2.3 Thay đổi không ảnh hưởng BE

Chuyển `Alert` → `toast` (sonner-native), form dùng react-hook-form + Zod, đổi sang Reusables UI kit. FE vẫn chỉ đọc `json.success` + `json.message`, nên **message lỗi tiếng Việt vẫn hiện thẳng lên toast** — giữ nguyên yêu cầu viết message tiếng Việt, ngắn gọn.

---

## 3. Kiến trúc BE

### 3.1 Stack (đề xuất trong `CLAUDE.md` Mục 3, chờ chốt)

| Thành phần | Chọn | Một câu lý do |
|---|---|---|
| Runtime | Node 24 + TypeScript (ESM) | Cùng ngôn ngữ với FE, copy được `types.ts`. |
| Web | Fastify | Nhanh, có sẵn hook cho auth và error handler toàn cục. |
| Validate | Zod 4 | Một schema dùng cho cả validate request lẫn contract test. |
| DB | PostgreSQL (Docker) + Prisma | Transaction thật, migration + seed có sẵn. |
| Test | Vitest + `fastify.inject` | Không cần mở cổng mạng khi test. |
| Job | `node-cron` + endpoint admin kích hoạt tay | Đủ cho MVP, không cần Redis. |
| Chain | Hardhat + OpenZeppelin v5 + ethers v6 | Chuẩn phổ biến nhất cho EVM. |
| Mật khẩu | `bcryptjs` | Thuần JS, không cần build native. |

### 3.2 Cấu trúc thư mục

```
kilomeet-api/
├── src/
│   ├── server.ts            # dựng Fastify, đăng ký plugin + routes
│   ├── domain/              # HÀM THUẦN — không import Prisma, chain, Date.now
│   │   ├── rank.ts          #   levelOf, nextRank, seasonReset
│   │   ├── season.ts        #   seasonOf(date), daysLeft
│   │   ├── quest.ts         #   dailyQuestDone, weeklyTarget, weeklyReward
│   │   ├── pricing.ts       #   priceFor, canBuy, canGift, canRedeem
│   │   ├── geo.ts           #   haversineKm, routeDistanceKm, storesPassed
│   │   ├── time.ts          #   vnDayKey, vnWeekStart, endOfVnDay... (múi giờ VN)
│   │   └── group.ts         #   rankCompatible, validSlot, groupTimeline, punctuality
│   ├── modules/<tên>/       # auth runs quests vouchers store groups admin seasons
│   │   ├── routes.ts        #   khai báo route + Zod
│   │   ├── service.ts       #   gọi domain + DB (transaction) + ghi outbox
│   │   └── schemas.ts
│   ├── chain/               # ChainGateway, FakeChain, FujiChain
│   ├── jobs/                # weekly-ranking, membership-expiry, group-timeline, chain-outbox
│   ├── lib/                 # clock, envelope, errors, auth, prisma, config(env)
│   └── contract/            # Zod schema dựng theo kilomeet-app/src/api/types.ts
├── prisma/  schema.prisma · migrations/ · seed.ts
├── test/    domain/ · contract/ · api/
├── scripts/ demo-reset.ts · demo-replay.ts
├── docker-compose.yml · .env.example · package.json · tsconfig.json
```

**Luật phụ thuộc** (một chiều): `routes → service → domain`. `service` mới được chạm `prisma` và `chain`. `domain` không biết gì về bên ngoài.

### 3.3 Lược đồ DB

Dùng gợi ý ở hợp đồng **Mục 10**, bổ sung:

- `stores.status`: `pending | approved | rejected` (phục vụ 3 tab của màn admin mới).
- `chain_outbox (id, op, payload_json, status[pending|sent|done|failed], tx_hash, attempts, last_error, created_at)`.
- `token_ledger`: thêm **unique `(reason, ref_id, user_id)`** để DB tự chặn phát thưởng 2 lần.
- `app_settings (key, value)`: lưu `clock_offset_ms` để tua giờ sống sót qua restart.

Khoá ngoại và index cần có: `runs(user_id, started_at desc)`, `quests(user_id, type, period_key) unique`, `owned_vouchers(qr_code) unique`, `weekly_results(user_id, week_start) unique`.

---

## 4. Kế hoạch từng bước

Mỗi bước có: **làm gì → test gì → xong khi nào**. Lát cắt chỉ "xong" khi đạt Định nghĩa Xong ở `CLAUDE.md` Mục 5.

### G0 — Chốt (30 phút, làm ngay)

- [ ] Chốt stack ở Mục 3.1.
- [ ] Chốt 4 điểm A–D ở Mục 2.1.

### G1 — Bộ khung chạy được đầu–cuối

**Mục tiêu:** bấm Đăng nhập trên điện thoại thật → request tới BE → đọc DB → hiện đúng tên.

| # | Việc | File |
|---|---|---|
| 1 | `pnpm init`, cài fastify, zod, prisma, @prisma/client, bcryptjs, jsonwebtoken (hoặc `@fastify/jwt`), vitest, tsx. Tạo đủ script: `dev test typecheck db:migrate db:seed demo:reset`. | `package.json`, `tsconfig.json` |
| 2 | `docker-compose.yml` Postgres 16 (+ DB riêng cho test). `.env.example` đủ biến trong `CLAUDE.md`. | |
| 3 | `lib/config.ts`: đọc env bằng Zod, thiếu biến thì crash sớm với thông báo rõ. | |
| 4 | `lib/envelope.ts` + `lib/errors.ts`: lớp `AppError(status, message)`; `setErrorHandler` đổi mọi lỗi → `{success:false,message}`; `setNotFoundHandler` → `"Không tìm thấy đường dẫn"`; lỗi Zod → `"Dữ liệu không hợp lệ: <field>"`; lỗi lạ → 500 `"Lỗi máy chủ"` (log chi tiết ở server, không lộ ra ngoài). | |
| 5 | `lib/clock.ts`: `now()` = giờ thật + `offsetMs`. `POST /admin/clock {offsetMs}` và `GET /admin/clock`, chỉ đăng ký khi `ALLOW_CLOCK_OVERRIDE=true`. | |
| 6 | `lib/auth.ts`: ký/kiểm JWT `{sub, role}`; decorator `requireRole('runner','member')`. Thiếu/sai token → 401 `"Vui lòng đăng nhập lại"`. Sai vai trò → 403. | |
| 7 | Migration 1: `users`, `runner_profiles`, `stores`. | `prisma/schema.prisma` |
| 8 | `contract/schemas.ts`: Zod cho `Runner`, `Store`, `Admin`, `AuthResponse`… theo `types.ts`. Hàm `toApiUser()` đổi `rank_idx` → chuỗi hạng. | |
| 9 | `POST /auth/login`, `POST /auth/register` (nhận `role`, thông tin quán — tuỳ chọn), `GET /auth/me`. Đăng ký sinh địa chỉ ví (xem 7.9). | `modules/auth` |
| 10 | `GET /health` → `{success:true,data:{ok:true,chain,time}}`. | |
| 11 | `seed.ts`: 4 tài khoản demo + 2 member gần nhau + 2 quán gần HCMUT có voucher kèm nhiệm vụ. | |

**Test:** login đúng/sai, register trùng email, `/auth/me` không token → 401 vẫn đúng envelope, route lạ → 404 đúng envelope. Contract test: response login parse được bằng `AuthResponseZ`.

**Xong khi:** đăng nhập `minh@demo.com` trên máy thật hiện đúng tên; sai mật khẩu hiện toast "Email hoặc mật khẩu không đúng"; `EXPO_PUBLIC_API_URL=` rỗng thì app vẫn chạy mock.

### S1 — Buổi chạy + nhiệm vụ (demo bước 2)

- **Domain trước** (`geo.ts`, `time.ts`, `quest.ts`):
  `haversineKm`, `routeDistanceKm`, `vnDayKey(now)`, `vnWeekStart(now)`, `dailyQuestDone(kmToday)`, `weeklyTarget(last4)`, `weeklyReward(target)`.
- **Test từ spec:** TB 13,6 km → 15 km / 105 token · người mới → 5 / 35 · TB 40 → 44 / 308 · 1,2 + 0,9 km cùng ngày VN → xong · hai buổi hai bên 00:00 giờ VN → chưa xong · route 1 điểm → 0 km.
- **DB:** `runs`, `quests`, `token_ledger`.
- **API:** `POST /runs/start` (`endedAt: ""`), `POST /runs/end`, `GET /runs` (mới nhất trước), `GET /quests` (lazy tạo quest ngày + tuần theo `period_key`), `POST /quests/complete` (idempotent, không phát token).
- **`/runs/end` trong 1 transaction:** khoá run → nếu đã kết thúc thì trả lại run cũ → tính km từ route → cập nhật `kmThisWeek` → cập nhật quest → quest đạt thì `completed` + ghi `token_ledger` + cộng `tokenBalance` + ghi outbox `mintToken`.
- **Xong khi:** chạy 3 km (hoặc replay route) → +10 token, gọi `/runs/end` lần 2 không cộng thêm.

### S2 — Hạng tuần (demo bước 3)

- **Domain:** `levelOf(km)`, `nextRank({cur, prevLevels, km, skipAvailable})` — thuật toán ở hợp đồng **6.1**.
- **Test:** 6 dòng của Lan · tuần miễn làm đứt chuỗi (#6) · chuỗi không vắt qua mùa (#7) · Đồng chạy 0 km không mất lượt miễn · Cao thủ không lên thêm.
- **DB:** `weekly_results`, `seasons`.
- **Job:** `weeklyRanking(now)` cho mọi runner, idempotent theo `(user_id, week_start)`. Cron `59 23 * * 0` múi `Asia/Ho_Chi_Minh` + `POST /admin/run-weekly-ranking`.
- **Xong khi:** tua tới CN 23:59 → gọi endpoint → hạng Lan đổi đúng bảng, `kmThisWeek = 0`.

### S3 — Chạy ngang quán (demo bước 4)

- **Domain:** `storesPassed(route, stores, 50)`, `claimWindowValid(claimedAt, now)` (7 ngày).
- **Trong `/runs/end`:** tự tính `passedStoreIds` (bỏ qua FE gửi); qua đúng 1 quán → tự tạo `voucher_quest_claims`.
- **API:** `GET /runs/passed-stores?runId=`, `POST /runs/claim-store`.
- **Xong khi:** replay route 5 km đi ngang 2 quán → `passedStoreIds` có đúng 2 quán, chọn 1 quán thành công.

### S4 — Mua và tặng voucher (demo bước 4–5)

- **Domain:** `priceFor(template, eligible)` (làm tròn như `Math.round`), `canBuy`, `canGift`.
- **Test:** 500 token, giảm 50% → 250 · 2 request mua song song khi còn 1 → đúng 1 thành công · tặng lần 2 → lỗi · quyền giảm giá đã dùng cho mẫu A không dùng lại cho A.
- **API:** `GET /vouchers` (`?storeId=`, trả thêm `myQuestEligible`, `myPrice`) · `GET /vouchers/mine` (tự chuyển `expired`) · `POST /vouchers/buy` (bỏ qua `questCompleted`) · `POST /vouchers/gift` (`toUserId` là ID **hoặc email**, sinh lại `qrCode`).
- **Xong khi:** sau S3, mua voucher 500 → trừ 250, số dư trên `/auth/me` khớp.

### S5 — Cửa hàng (demo bước 6)

- **Domain:** `canRedeem(voucher, storeId, now)`; `parseExpiryInput(expiryDate, now)` (điểm D).
- **API:** `POST /store/vouchers` (nhận cả tên field mới và cũ — điểm D; chỉ quán `approved`) · `POST /store/scan` (gọi là đốt: `used` + `voucher_usages` + phí 5.000đ, chặn quét 2 lần bằng `UPDATE ... WHERE status IN ('owned','gifted')`) · `GET /store/dashboard`.
- **Xong khi:** quét QR → toast thành công; quét lại → "Voucher đã được sử dụng"; dashboard tăng 1 lượt, +5.000đ.

### S6 — Mùa và quản trị (demo bước 8)

- **Domain:** `seasonOf(date)` (T1–4, T5–8, T9–12), `seasonReset(runner)`.
- **Test:** Cao thủ 1.000 → 500 + Bạch kim · 300 → giữ 300 · chấm tuần dở dang trước reset (#8) · đóng mùa 2 lần → lỗi "Không có mùa đang chạy".
- **API admin:** `GET /admin/stores` (mới — A) · `POST /admin/stores/:id` (mới — B) · `GET /admin/pending-stores` · `POST /admin/approve-store` (bí danh) · `GET /admin/seasons` = `GET /admin/season` (C) · `POST /admin/season {action}`.
- **API runner:** `GET /seasons/current` (có `daysLeft`), `GET /me/badges`.
- **Xong khi:** admin duyệt quán mới → quán đó tạo được voucher; đóng mùa → Minh còn 500 token, Bạch kim, có huy hiệu mùa.

### S7 — Hội viên + nhóm cơ bản (demo bước 7)

- **Domain:** `rankCompatible(a, b)` hai chiều, `validSlot(slot)`, `startsInFuture(date, slot, now)`.
- **API:** `POST /auth/subscribe` (+ job hết hạn hằng ngày) · `GET /groups` · `GET /groups/detail` · `POST /groups/create` · `POST /groups/join` · `POST /groups/confirm` · `POST /groups/leave`.
- Hook chung cho `/groups/*`: không phải hội viên → 403 "Tính năng dành cho Hội viên".
- **Xong khi:** Minh tạo nhóm, 2 member khác tham gia + xác nhận, rời nhóm hoạt động.

### S8 — Nhóm thời gian thực (cắt được — xem Mục 10 quy trình)

- **Domain:** `groupTimeline(T, now)` trả mốc hiện tại, `arrivedWithin50m`, `punctuality`, `autoMatch`.
- **API:** `POST /groups/location`, `GET /groups/locations` (FE poll 5–10 s), `POST /groups/auto-match`.
- **Job:** mỗi phút quét nhóm sắp tới, xử lý mốc T−2h / T−30' / T / T+10'. Có `POST /admin/run-group-timeline` để demo.
- **Phương án cắt:** script giả 3 người phát vị trí, poll 5 s.

### G3 — Blockchain (bắt đầu 16/11, sau khi lõi off-chain chạy ổn)

| Bước | Việc |
|---|---|
| C1 | Hardhat + OZ v5. `RunToken`: ERC-20, `decimals() = 0`, chặn transfer giữa người dùng (chỉ cho mint/burn), `AccessControl` MINTER/BURNER. Test. |
| C2 | `Voucher`: ERC-1155, mỗi template = 1 `tokenId`; server có role OPERATOR để mint / chuyển (tặng) / burn. Test không burn 2 lần. |
| C3 | `SeasonBadge`: ERC-721 soulbound (chặn mọi transfer). Test. |
| C4 | Deploy Fuji, verify Snowtrace, nạp AVAX test cho ví server, ghi địa chỉ contract vào `.env`. |
| C5 | BE: `ChainGateway` + `FakeChain` (từ G1) → `FujiChain` + job `chain-outbox` gửi **tuần tự** từng giao dịch, lưu `txHash`. |

### G4 — Demo

- [ ] File route mẫu: 3 km thường; 5 km đi ngang 2 quán gần HCMUT.
- [ ] `pnpm demo:replay -- --user lan --route routes/5km-2-quan.json`.
- [ ] `pnpm demo:reset`.
- [ ] URL công khai (`cloudflared`) đã thử bằng 4G.
- [ ] Chạy trọn 8 bước demo 3 lần trên máy thật, quay video dự phòng.

---

## 5. Việc FE cần sửa để nối BE

Xếp theo thứ tự cần có. **Hai dòng đầu chặn mọi thứ.**

| Ưu tiên | Việc | File | Cần cho |
|---|---|---|---|
| 1 | `api.setBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? '')` khi khởi động | `app/_layout.tsx` | G1 |
| 1 | `realFetch` gắn `Authorization: Bearer`; bắt lỗi response không phải JSON → "Không kết nối được máy chủ" | `src/api/client.ts` | G1 |
| 1 | Lưu token AsyncStorage; mở app gọi `/auth/me` | `src/stores/auth.ts` | G1 |
| 2 | Thêm route mock `/admin/stores`, `/admin/stores/<id>`, `/admin/season`; sửa `mockCreateVoucher` đọc `questType/quantity/expiryDate` | `src/api/mock/router.ts`, `mock/admin.ts`, `mock/store.ts` | Mock không vỡ |
| 2 | Gọi `/auth/me` sau buổi chạy và sau mua voucher (thay vì tự cộng/trừ) | `run.tsx`, `voucher/[id].tsx`, `stores/runner.ts` | S1, S4 |
| 2 | Timestamp thật cho từng điểm GPS; bỏ `MOCK_STORE` | `run.tsx:128-148` | S1, S3 |
| 3 | Đăng ký gửi `role` + tên quán, địa chỉ, toạ độ | `register.tsx` | S5 |
| 3 | Dùng `myPrice`, `myQuestEligible`; tặng bằng email | `voucher/[id].tsx`, `(tabs)/vouchers.tsx` | S4 |
| 3 | Màn chọn 1 quán khi qua nhiều quán | `run.tsx` | S3 |
| 4 | Banner mùa + huy hiệu đọc API | `(tabs)/index.tsx`, `badges.tsx` | S6 |
| 4 | Nút xác nhận / huỷ tham gia gọi API | `groups/[id].tsx` | S7 |
| 5 | Bản đồ vị trí thành viên | `groups/[id].tsx` | S8 |

---

## 6. Lịch còn lại

D1 (11/11) đã dùng cho tài liệu, chưa đạt mốc "đăng nhập trên máy thật" → lịch dồn lại nửa ngày.

| Ngày | BE | Sửa FE cùng ngày | Mốc cuối ngày |
|---|---|---|---|
| 12/11 | G0 + **G1** trọn vẹn, bắt đầu domain S1 | Ưu tiên 1 + 2 ở Mục 5 | Đăng nhập thật trên điện thoại |
| 13/11 | **S1** + **S2** | Timestamp GPS, `/auth/me` sau chạy | Chạy 3 km → +10 token; tua tuần → hạng đổi |
| 14/11 | **S3** + **S4** | `myPrice`, chọn quán, tặng bằng email | Qua 2 quán → mua còn 250 token |
| 15/11 | **S5** + **S6** | Đăng ký cửa hàng, banner mùa | Quét QR → phí 5.000đ; đóng mùa → 500 token |
| 16/11 | **S7** | Xác nhận / huỷ nhóm | 3 tài khoản cùng nhóm |
| 17/11 | **S8** hoặc cắt; FujiChain | Bản đồ thành viên | Bản đồ hiện 3 người; txHash thật trên Snowtrace |
| 18/11 | **Đóng băng tính năng**, script demo | Đánh bóng UI | 8 bước demo không lỗi |
| 19/11 | Tập dượt ×3, video dự phòng | | Có video |
| 20/11 | Nộp | | |

Trễ ≥ 1 ngày ở 16/11 → cắt theo Mục 10 của `backend-implementation-process.md`. Không bao giờ cắt: auth + ví, chạy → nhiệm vụ → token, xếp hạng + reset mùa, mua/tặng/quét voucher kèm giảm giá, RunToken on-chain.

---

## 7. Lý thuyết cần biết

Mỗi mục: **khái niệm → vì sao dự án cần → áp dụng thế nào.**

### 7.1 REST API, envelope và mã HTTP

- **Khái niệm:** client gửi `METHOD /path` + body JSON, server trả status code + body. "Envelope" là lớp bọc thống nhất `{ success, data | message }`.
- **Vì sao cần:** FE ở `client.ts` chỉ đọc `json.success`, không nhìn status. Nếu một lỗi trả HTML (ví dụ 404 mặc định) thì `res.json()` nổ → app crash.
- **Áp dụng:** một `setErrorHandler` + một `setNotFoundHandler` duy nhất. Vẫn đặt đúng status (400 dữ liệu sai, 401 chưa đăng nhập, 403 không đủ quyền, 404 không thấy, 409 xung đột, 500 lỗi server) để log/debug dễ, dù FE không đọc.

### 7.2 Xác thực: băm mật khẩu và JWT

- **Băm mật khẩu (bcrypt):** không bao giờ lưu mật khẩu gốc. Lưu `hash = bcrypt(password, salt)`; lúc đăng nhập so `bcrypt.compare`. bcrypt cố ý chậm để chống dò mật khẩu hàng loạt.
- **JWT:** chuỗi `header.payload.signature`. Server ký payload `{ sub: userId, role }` bằng `JWT_SECRET`. Request sau gửi `Authorization: Bearer <jwt>`; server kiểm chữ ký → biết ai đang gọi mà **không cần lưu session**.
- **Lưu ý:** payload JWT **không mã hoá**, ai cũng đọc được → không bỏ thông tin nhạy cảm vào. Vai trò có thể đổi (runner → member khi mua gói) → với quyền quan trọng, đọc lại `role` từ DB thay vì chỉ tin JWT.

### 7.3 Validate dữ liệu bằng Zod

- **Khái niệm:** khai báo hình dạng dữ liệu một lần (`z.object({...})`), dùng để kiểm tra lúc chạy **và** sinh kiểu TypeScript (`z.infer`).
- **Áp dụng 2 chiều:** (1) validate body/query vào; (2) contract test: parse response ra bằng schema dựng từ `types.ts` — nếu BE lỡ đổi tên field, test đỏ ngay.

### 7.4 Prisma, migration, seed

- **ORM:** viết `prisma.user.findUnique({ where: { email } })` thay vì SQL tay; có kiểu TypeScript.
- **Migration:** mỗi lần đổi `schema.prisma` → `pnpm db:migrate` sinh file SQL có thứ tự trong `migrations/`. Đồng đội chạy lại là có cùng DB. Không sửa tay DB.
- **Seed:** script tạo dữ liệu demo cố định → `demo:reset` = xoá DB + migrate + seed.

### 7.5 Transaction và tranh chấp đồng thời (race condition) — quan trọng nhất

- **Transaction:** một nhóm câu lệnh "được ăn cả, ngã về không". Mua voucher = trừ token + giảm `remaining` + tạo voucher + ghi ledger + ghi outbox. Lỗi giữa chừng → rollback hết, không có cảnh trừ token mà không có voucher.
- **Race condition:** hai request mua cùng lúc khi còn 1 voucher. Cả hai cùng đọc `remaining = 1` → cả hai trừ → bán quá. Transaction **không tự chống** được việc này.
- **Cách chống — cập nhật có điều kiện:**
  ```ts
  // Chỉ trừ khi còn hàng. Trả về số dòng bị ảnh hưởng.
  const r = await tx.voucherTemplate.updateMany({
    where: { id, remaining: { gt: 0 } },
    data:  { remaining: { decrement: 1 } },
  });
  if (r.count === 0) throw new AppError(409, 'Voucher đã hết');

  const b = await tx.runnerProfile.updateMany({
    where: { userId, tokenBalance: { gte: price } },
    data:  { tokenBalance: { decrement: price } },
  });
  if (b.count === 0) throw new AppError(400, 'Không đủ token'); // → rollback cả lần trừ remaining
  ```
  Postgres khoá dòng khi `UPDATE`, request thứ hai phải chờ rồi thấy `remaining = 0` → `count = 0`.
- **Cách khác:** `SELECT ... FOR UPDATE` (khoá dòng trước khi đọc) qua `tx.$queryRaw`.

### 7.6 Idempotency (gọi lặp không gây hại)

- **Khái niệm:** gọi 1 lần hay 10 lần, kết quả như nhau. Mạng di động hay gửi lại request; FE còn tự gọi `/quests/complete` sau khi BE đã chấm.
- **Áp dụng:**
  - `/runs/end`: run đã có `endedAt` → trả run cũ, không làm gì thêm.
  - `/quests/complete`: luôn trả quest hiện tại, không phát token.
  - **Lưới an toàn ở DB:** unique `(user_id, reason, ref_id)` trên `token_ledger` → dù code sai, DB vẫn từ chối dòng thưởng thứ hai.
  - Job tuần: unique `(user_id, week_start)` trên `weekly_results` → chạy lại job không chấm 2 lần.

### 7.7 Thời gian và múi giờ

- **Vấn đề:** server và DB lưu UTC; nghiệp vụ tính theo giờ VN (UTC+7). 05:30 sáng thứ Hai giờ VN = 22:30 **Chủ nhật** UTC → nếu tính ngày theo UTC thì nhiệm vụ ngày và chốt tuần lệch 7 tiếng.
- **Áp dụng:** lưu `timestamptz` (UTC). Mọi phép "ngày nào / tuần nào / mùa nào" đi qua `domain/time.ts`. VN không có giờ mùa hè nên cộng cố định +7h là đủ: `vnDayKey(d) = new Date(d.getTime() + 7*3600e3).toISOString().slice(0,10)`. Tuần bắt đầu thứ Hai 00:00 giờ VN.
- **Injectable clock:** hàm domain nhận `now` làm tham số; service lấy `now` từ `clock.now()`. Demo tua giờ bằng `POST /admin/clock`. Không có chỗ nào gọi `new Date()` trực tiếp → test được "Chủ nhật 23:59" bất cứ lúc nào.

### 7.8 Khoảng cách địa lý (haversine)

- **Công thức** khoảng cách trên mặt cầu giữa 2 toạ độ:
  ```
  a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
  d = 2R · atan2(√a, √(1−a))         R = 6371 km, φ/λ đổi sang radian
  ```
- **Áp dụng:** km buổi chạy = tổng `d` giữa các điểm liên tiếp. "Chạy ngang quán" = có điểm nào cách quán < 50 m. Không cần PostGIS: số quán ít, duyệt hết là đủ nhanh.
- **Chống gian lận cơ bản (khi FE gửi timestamp thật):** bỏ đoạn có vận tốc > ~25 km/h.

### 7.9 Ví custodial và blockchain

- **Custodial:** server giữ quyền, người dùng không ký giao dịch. Mỗi user chỉ cần một **địa chỉ**. Cách gọn: sinh từ 1 mnemonic của server theo chỉ số (`HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/" + i)`), không phải lưu private key từng người.
- **ERC-20 (RunToken):** chuẩn token "có thể thay thế" (số dư). `decimals = 0` để 1 token = 1 đơn vị, khớp số nguyên ở FE. Chặn chuyển giữa người dùng bằng cách override `_update` trong OZ v5: chỉ cho phép khi `from == 0` (mint) hoặc `to == 0` (burn).
- **ERC-1155 (Voucher):** một contract chứa nhiều loại token; mỗi mẫu voucher là một `tokenId`, mỗi voucher đã mua là 1 đơn vị của `tokenId` đó.
- **Soulbound (SeasonBadge):** NFT không chuyển được — chặn mọi transfer trừ mint.
- **Gas & nonce:** ví server trả phí gas bằng AVAX test. Mỗi giao dịch từ một ví có `nonce` tăng dần; gửi song song dễ trùng nonce → job outbox gửi **tuần tự**, chờ receipt rồi mới gửi tiếp.

### 7.10 Outbox pattern

- **Vấn đề:** gọi chain mất vài giây và có thể lỗi. Nếu gọi ngay trong request: API chậm; chain lỗi sau khi DB đã ghi → hai bên lệch.
- **Cách làm:** trong **cùng transaction** nghiệp vụ, ghi thêm một dòng `chain_outbox (op, payload, status=pending)`. Request trả về ngay. Job nền lấy dòng `pending` → gửi giao dịch → lưu `txHash` → `done`; lỗi thì tăng `attempts`, thử lại sau. Vì dòng outbox nằm chung transaction, **không bao giờ** có nghiệp vụ mà thiếu lệnh chain hoặc ngược lại.

### 7.11 Job định kỳ (cron)

- **Cú pháp cron:** `phút giờ ngày tháng thứ`. `59 23 * * 0` = 23:59 mỗi Chủ nhật. `node-cron` có tuỳ chọn `timezone: 'Asia/Ho_Chi_Minh'`.
- **Lưu ý với clock tua giờ:** cron chạy theo giờ **thật**, không biết offset. Vì vậy mỗi job là một hàm `runX(now)` gọi được từ cả cron lẫn endpoint admin (`/admin/run-weekly-ranking`) — demo luôn dùng endpoint.

### 7.12 Kiểm thử

| Tầng | Ví dụ | Công cụ |
|---|---|---|
| Domain (nhiều nhất) | `nextRank` với 6 dòng của Lan | Vitest, không cần DB |
| API / service | mua song song, quét QR 2 lần, `/runs/end` 2 lần | `fastify.inject` + DB test thật |
| Contract | mọi endpoint FE gọi, parse bằng Zod | Zod |
| Smart contract | không transfer được, không burn 2 lần | Hardhat test |
| E2E | 8 bước demo | Checklist trên máy thật |

**TDD ở domain:** viết test từ ví dụ số trong spec trước (đỏ) → viết code cho xanh. Spec đã cho sẵn đáp án, nên đây là cách nhanh nhất để chắc thuật toán đúng.

### 7.13 Cho điện thoại gọi được BE

- `localhost` trên điện thoại là **chính điện thoại**, không phải laptop. Dùng IP LAN (`http://192.168.x.x:3000`) khi cùng Wi-Fi, server lắng nghe `0.0.0.0`.
- Mạng hội trường hay chặn thiết bị nói chuyện với nhau → dùng `cloudflared tunnel --url http://localhost:3000` để có URL HTTPS công khai.

---

## 8. Bẫy hay gặp — đọc trước khi code

| Bẫy | Hậu quả | Cách tránh |
|---|---|---|
| Trả `endedAt: null` | FE xử lý sai buổi chạy đang dở | Luôn `""` khi chưa kết thúc |
| So sánh chuỗi hạng có dấu (`'bạch_kim'`) dạng NFD vs NFC | So bằng ra `false` | DB lưu số 0–5; chuỗi chỉ ở lớp API, `.normalize('NFC')` khi nhận vào |
| Tin `distanceKm`, `passedStoreIds`, `questCompleted` từ FE | Gian lận / sai giá | BE tự tính, bỏ qua giá trị FE |
| Làm tròn giá kiểu khác JS | Giá lệch 1 token | Dùng đúng `Math.round` |
| Tính ngày theo UTC | Quest/tuần lệch 7 tiếng | Qua `domain/time.ts` |
| Gọi chain trong request | API chậm, lệch dữ liệu khi lỗi | Outbox |
| Lỗi Fastify mặc định / 404 trả không đúng envelope | FE crash ở `res.json()` hoặc hiện "API error" | Error handler + not-found handler toàn cục, có test |
| Tham số GET đặt ở path | FE gửi query string → 404 | Query string; ngoại lệ duy nhất `/admin/stores/:id` (điểm B) |
| `POST /store/scan` coi như "xem trước" | Voucher bị đốt trước khi quán bấm Xác nhận | Đã biết: gọi là đốt. Nút "Xác nhận" trên FE chỉ là hiệu ứng |

---

## Cần bạn chốt trước khi code

1. **Stack** ở Mục 3.1 (Fastify + Prisma + Postgres + Zod + Vitest). Đồng ý thì đánh dấu xong trong `progress.md`.
2. **Điểm A–D** ở Mục 2.1: BE chiều theo FE mới (thêm `/admin/stores`, `/admin/stores/:id`, `/admin/season`, nhận field mới ở `/store/vouchers`). Đồng ý thì cập nhật Mục 5.5 và 5.7 của hợp đồng API.
