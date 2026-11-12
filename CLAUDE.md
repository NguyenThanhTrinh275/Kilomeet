# KILOMeet — hướng dẫn cho Claude

KILOMeet là app chạy bộ theo mùa trên Avalanche (UniHack 2026). Người chạy làm nhiệm vụ để nhận token, leo hạng, rồi dùng token mua voucher của cửa hàng. Cửa hàng trả phí mỗi lượt voucher được dùng. Hội viên được ghép nhóm chạy chung.

**Việc hiện tại: viết Backend (`kilomeet-api/`) cho mobile app đã có (`kilomeet-app/`).** Hạn MVP khoảng **20/11/2026**.

> Đầu mỗi phiên làm việc, đọc [`progress.md`](./progress.md) để biết đang ở đâu. Cuối phiên (hoặc khi xong một lát cắt), cập nhật lại file đó.

---

## 1. Tài liệu: tra cái gì ở đâu

| Câu hỏi | Nguồn sự thật |
|---|---|
| Nghiệp vụ, luật chơi, kịch bản demo 3 phút | [`docs/KILOMeet.md`](./docs/KILOMeet.md) |
| BE phải nhận/trả gì, thuật toán, quyết định đã chốt | [`docs/backend-api-contract.md`](./docs/backend-api-contract.md) |
| Làm theo thứ tự nào, test ra sao, khi nào là xong | [`docs/backend-implementation-process.md`](./docs/backend-implementation-process.md) |
| Kế hoạch thi công theo FE mới, chỗ FE đổi hợp đồng, lý thuyết cần biết | [`docs/backend-plan.md`](./docs/backend-plan.md) |
| Hình dạng dữ liệu FE đang dùng | `kilomeet-app/src/api/types.ts` |
| Hành vi mong đợi của từng endpoint | `kilomeet-app/src/api/mock/*.ts` (định tuyến ở `mock/router.ts`) |
| Tiến độ, việc tiếp theo, chỗ đang vướng | [`progress.md`](./progress.md) |

Chỉ đọc mục cần thiết của tài liệu hợp đồng API (file dài khoảng 1.200 dòng). Trước khi viết một endpoint, đọc mục đó ở **Mục 5** và hàm mock tương ứng.

---

## 2. Cấu trúc repo

```
Kilomeet/
├── CLAUDE.md, progress.md
├── docs/
├── kilomeet-app/        # FE: Expo 58 + expo-router, NativeWind, Zustand, Zod 4 (pnpm)
├── kilomeet-api/        # BE: Fastify + Prisma 6 + Zod 4 + Vitest 3
│   ├── src/
│   │   ├── domain/      # HÀM THUẦN: rank, season, quest, pricing, geo, group
│   │   ├── modules/     # auth/ runs/ quests/ vouchers/ store/ groups/ admin/
│   │   │   └── <tên>/   #   routes.ts (route + Zod) · service.ts (domain + DB + chain) · schemas.ts
│   │   ├── chain/       # interface ChainGateway + FakeChain + FujiChain
│   │   ├── jobs/        # weekly-ranking, season-reset, group-timeline, chain-outbox
│   │   ├── lib/         # clock.ts, envelope.ts, auth.ts, errors.ts
│   │   └── contract/    # Zod schema dựng theo kilomeet-app/src/api/types.ts
│   ├── prisma/          # schema.prisma, migrations, seed.ts
│   ├── test/            # domain/, contract/, api/
│   └── docker-compose.yml
└── blockchain/          # Hardhat (npm): RunToken (ERC-20), Voucher (ERC-1155), SeasonBadge (soulbound), đã deploy Fuji.
                         #   BE gọi qua src/chain/fuji.ts; test/contract/chain-abi.test.ts kiểm ABI khớp sdk/abi/
```

**Quy tắc phụ thuộc:** `domain/` không import gì từ `modules/`, `chain/`, Prisma, hay giờ hệ thống. Chỉ `service.ts` được gọi DB và chain.

---

## 3. Stack và lệnh

| Thành phần | Chọn |
|---|---|
| Runtime | Node 24 LTS, TypeScript (ESM) |
| Package manager | pnpm, giống FE. Nếu máy báo thiếu thì chạy `corepack enable pnpm --install-directory ~/.local/bin` |
| Web | Fastify |
| Validate | Zod 4 (cùng major với FE) |
| DB | PostgreSQL qua Docker, ORM Prisma |
| Test | Vitest + Supertest (hoặc `fastify.inject`) |
| Job | `node-cron`, cộng endpoint admin để kích hoạt tay |
| Chain | Hardhat + OpenZeppelin, mạng Fuji, `ethers` v6 |

Khi dựng khung `kilomeet-api/`, tạo **đúng tên** các script sau để lệnh luôn giống nhau:

```bash
cd kilomeet-api
docker compose up -d          # Postgres 16, cổng 5433 (DB kilomeet + kilomeet_test)
pnpm dev                      # chạy server, watch mode
pnpm test                     # toàn bộ test
pnpm test test/domain         # chỉ test hàm thuần
pnpm typecheck                # tsc --noEmit
pnpm db:migrate               # prisma migrate dev
pnpm db:seed                  # seed tài khoản demo
pnpm demo:reset               # xoá DB + seed lại trạng thái demo
```

FE: `cd kilomeet-app && pnpm start`. Biến `EXPO_PUBLIC_API_URL` **rỗng thì FE dùng mock**. Trên điện thoại thật, URL phải là **IP LAN** của máy chạy BE (hoặc URL `cloudflared`/`ngrok`), không dùng `localhost`.

Biến môi trường BE (ghi vào `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CHAIN=fake|fuji`, `FUJI_RPC_URL`, `SERVER_PRIVATE_KEY`, `MEMBERSHIP_DAYS`, `ALLOW_CLOCK_OVERRIDE`.

---

## 4. Luật bắt buộc khi viết BE

Phần lớn lỗi tích hợp FE–BE đến từ các điểm dưới đây.

### Hợp đồng với FE

- **FE là hợp đồng.** Trả đúng hình dạng trong `types.ts`. Được **thêm** field (FE bỏ qua field lạ), **không** được đổi tên, xoá hay đổi kiểu field.
- **Mọi response đều là JSON bọc envelope**, kể cả lỗi 4xx/5xx, 404 và lỗi validate:
  `{ "success": true, "data": ... }` / `{ "success": false, "message": "..." }`.
  Dùng một error handler toàn cục. FE chỉ đọc `json.success`, không đọc HTTP status.
- **`message` lỗi viết bằng tiếng Việt.** FE hiện thẳng lên `Alert`. Ưu tiên dùng đúng câu đã ghi trong hợp đồng API.
- `GET` nhận tham số qua **query string** (`/groups/detail?groupId=...`), **không** dùng path param. `POST` nhận body JSON. Không dùng `PUT`/`DELETE`.
- Auth: header `Authorization: Bearer <jwt>`.
- ID là **chuỗi**. Token là **số nguyên**. Tiền là số nguyên VND. Thời điểm là ISO 8601. Ngày nhóm chạy là `YYYY-MM-DD`, khung giờ là `HH:mm`.
- `Run.endedAt` là `""` (chuỗi rỗng) khi chưa kết thúc, **không phải `null`**.
- Hạng ở API là chuỗi tiếng Việt NFC: `'đồng' | 'bạc' | 'vàng' | 'bạch_kim' | 'kim_cương' | 'cao_thủ'`. Trong DB lưu **số 0–5**, chỉ đổi sang chuỗi ở lớp API.
- ID cửa hàng = `User.id` của tài khoản cửa hàng (`VoucherTemplate.storeId === User.id`).

### Không tin dữ liệu FE tính

FE tính sai hoặc có thể bị sửa. BE **tự tính lại và bỏ qua giá trị FE gửi lên** ở các chỗ sau:

- `/runs/end`: `distanceKm` (tính lại bằng haversine từ `route`) và `passedStoreIds` (tự tính trong bán kính 50 m).
- `/vouchers/buy`: `questCompleted`. BE tự xét quyền giảm giá theo luật 7 ngày, mỗi mẫu voucher một lần. Đồng thời kiểm tra lại hạng, số lượng còn, hạn dùng, số dư.

### Tiền, số lượng, gọi lặp

- Mọi thao tác thay đổi token, số lượng voucher hoặc trạng thái voucher phải nằm trong **một transaction DB**.
- Trừ số lượng bằng `UPDATE ... WHERE remaining > 0` (hoặc `SELECT ... FOR UPDATE`) để hai request mua cùng lúc không bán quá số lượng.
- **Idempotent:** `/quests/complete` gọi lại thì trả quest hiện tại, **không phát token lần nữa, không báo lỗi**. `/runs/end` gọi hai lần với cùng `runId` thì không phát token hai lần. Đóng mùa hai lần thì lần thứ hai báo lỗi.
- Mọi thay đổi số dư ghi vào `token_ledger`.
- Làm tròn giá giống JS: `Math.round(priceTokens * (1 - questDiscountPercent / 100))`.

### Thời gian

- **Không gọi `new Date()` / `Date.now()` rải rác.** Lấy giờ qua `Clock` trong `lib/clock.ts`. Hàm domain nhận `now` làm tham số. Môi trường demo/test cho tua giờ qua `POST /admin/clock` (chỉ bật khi `ALLOW_CLOCK_OVERRIDE=true`).
- Mọi phép tính ngày/tuần/mùa dùng múi giờ **`Asia/Ho_Chi_Minh`**. Tuần bắt đầu thứ Hai 00:00 và chốt lúc Chủ nhật 23:59 giờ VN. Ngày bắt đầu lúc 00:00 giờ VN. Mùa: T1–T4, T5–T8, T9–T12.

### Blockchain

- **DB là nguồn sự thật.** Chain đứng sau interface `ChainGateway`. Mặc định `CHAIN=fake`. Mọi test chạy với `FakeChain`.
- Không gọi chain trong request. Ghi một dòng vào `chain_outbox` trong cùng transaction nghiệp vụ, để job gửi giao dịch sau và lưu `txHash`.
- Ví do server quản lý (custodial). Người dùng không tự ký giao dịch. `RunToken` có `decimals = 0` và không cho người dùng chuyển token cho nhau.

---

## 5. Cách làm một tính năng (lát cắt dọc)

Làm **trọn từng tính năng**: DB, logic, API, test, nối FE. Không làm theo tầng ("xong hết DB rồi mới làm API"). Thứ tự lát cắt S1→S8 nằm trong `progress.md`.

1. Đọc mục endpoint trong hợp đồng API và hàm mock tương ứng. Liệt kê đầu vào, đầu ra, các lỗi.
2. Viết test domain **từ ví dụ số trong spec** trước (test đỏ). Ví dụ: chuỗi hạng của Lan, reset mùa Cao thủ 1.000 → 500 token và xuống Bạch kim, mục tiêu tuần TB 13,6 km → 15 km / 105 token.
3. Viết hàm domain cho test chuyển xanh.
4. Viết migration, service (gọi domain + DB trong transaction), route có Zod validate.
5. Contract test: gọi endpoint, rồi parse response bằng schema trong `src/contract/`.
6. Ghi lại thay đổi FE cần làm cho tính năng này (Mục 7 của hợp đồng API) vào `progress.md`. Chỉ sửa `kilomeet-app/` khi được yêu cầu.
7. Cập nhật `progress.md`.

**Định nghĩa "Xong":** test domain xanh với đủ ví dụ trong spec · contract test xanh · lỗi trả đúng envelope tiếng Việt · thao tác tiền/số lượng có transaction và chịu được gọi lặp · `pnpm typecheck` sạch.

Trước khi báo xong, chạy `pnpm typecheck && pnpm test`. Nếu test fail thì báo kèm output, không báo là xong.

---

## 6. Đổi hợp đồng API và gặp điểm chưa rõ

- **Không tự đổi hình dạng response.** Cần đổi thì: sửa `docs/backend-api-contract.md` trước, rồi sửa Zod schema BE và `kilomeet-app/src/api/types.ts` **trong cùng PR**. Thêm field mới thì không cần qua bước này.
- Gặp điểm nghiệp vụ chưa rõ: **hỏi người dùng**, đừng tự đoán. Chốt xong thì thêm một dòng vào bảng quyết định (Mục 11 của hợp đồng API) rồi mới code tiếp. 14 quyết định đã chốt ngày 11/11/2026 nằm ở bảng đó.
- Thứ tự ưu tiên lấy theo kịch bản demo 3 phút. Thứ gì không có trong demo thì để sau. Khi trễ, cắt theo Mục 10 của tài liệu quy trình, và **không bao giờ cắt** phần lõi: auth + ví, chạy → nhiệm vụ → token, xếp hạng + reset mùa, mua/tặng/quét voucher kèm giảm giá khi chạy ngang quán, RunToken on-chain.

---

## 7. Git

- Nhánh: `feat/be-<tên>` cho mỗi lát cắt (ví dụ `feat/be-vouchers`). Merge vào `main` qua PR.
- Commit theo Conventional Commits: `feat(api): ...`, `fix(api): ...`, `test(domain): ...`, `chore(api): ...`, `feat(contracts): ...`.
- Không commit `.env`, private key, hay `node_modules`.

---

## 8. Tài khoản demo (seed)

| Email | Mật khẩu | Vai trò | Trạng thái |
|---|---|---|---|
| `lan@demo.com` | `demo123` | runner | Đồng, 0 token |
| `minh@demo.com` | `demo123` | member | Cao thủ, 1.000 token, 42 km tuần này, 24 buổi chạy |
| `quanfuji@demo.com` | `demo123` | store | Fuji Coffee, đã duyệt, toạ độ 10.773, 106.660 (gần HCMUT) |
| `admin@demo.com` | `demo123` | admin | — |

Seed thêm: 1–2 member ở gần nhau để demo ghép nhóm, và ít nhất 2 quán gần HCMUT có nhiệm vụ "Chạy ngang qua quán".
