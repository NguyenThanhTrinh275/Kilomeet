# KILOMeet — Quy trình triển khai Backend

> Tài liệu đi kèm: [`backend-api-contract.md`](./backend-api-contract.md) (BE phải trả gì) và [`KILOMeet.md`](./KILOMeet.md) (nghiệp vụ).
> Tài liệu này trả lời câu hỏi **làm theo thứ tự nào, kiểm chứng ra sao, và khi nào thì coi là xong**.
>
> **Giả định:** hạn MVP là 12 ngày tính từ 08/11/2026, tức khoảng **20/11/2026**. Hôm nay là 11/11, còn **khoảng 9 ngày làm việc**. Nhóm có ít nhất 2 người (một người đã làm FE). Nếu hạn khác thì giãn hoặc nén lịch ở [Mục 6](#6-lịch-9-ngày) theo cùng thứ tự.

## Mục lục

1. [Nguyên tắc](#1-nguyên-tắc)
2. [Giai đoạn 0 — Chốt trước khi code (nửa ngày)](#2-giai-đoạn-0--chốt-trước-khi-code-nửa-ngày)
3. [Giai đoạn 1 — Bộ khung chạy được từ đầu tới cuối (1 ngày)](#3-giai-đoạn-1--bộ-khung-chạy-được-từ-đầu-tới-cuối-1-ngày)
4. [Giai đoạn 2 — Làm từng lát cắt dọc](#4-giai-đoạn-2--làm-từng-lát-cắt-dọc)
5. [Giai đoạn 3 — Gắn blockchain, tập dượt demo](#5-giai-đoạn-3--gắn-blockchain-tập-dượt-demo)
6. [Lịch 9 ngày](#6-lịch-9-ngày)
7. [Cách kiểm thử](#7-cách-kiểm-thử)
8. [Quy trình làm việc hằng ngày](#8-quy-trình-làm-việc-hằng-ngày)
9. [Rủi ro và phương án dự phòng](#9-rủi-ro-và-phương-án-dự-phòng)
10. [Thứ tự cắt bớt khi trễ](#10-thứ-tự-cắt-bớt-khi-trễ)

---

## 1. Nguyên tắc

Sáu nguyên tắc dưới đây quyết định mọi bước phía sau.

| # | Nguyên tắc | Vì sao |
|---|---|---|
| 1 | **Hợp đồng API đi trước, code đi sau.** FE đã có sẵn kiểu dữ liệu và mock, nên coi đó là hợp đồng. BE viết theo hợp đồng, không tự đặt ra hình dạng dữ liệu mới. | Tránh trường hợp hai bên ghép vào nhau mới phát hiện lệch field. |
| 2 | **Làm theo lát cắt dọc, không làm theo tầng.** Mỗi lần làm trọn một tính năng: DB, logic, API, test, nối FE, chạy thử trên điện thoại. Không làm "xong hết DB rồi mới làm API". | Ngày nào cũng có thứ chạy được để demo. Lỗi ghép nối lộ ra sớm. |
| 3 | **Tách logic nghiệp vụ thành hàm thuần**, không đụng DB, mạng hay giờ hệ thống. Xếp hạng, reset mùa, tính giá, haversine, mục tiêu nhiệm vụ đều là hàm thuần. | Spec có luật rất chính xác kèm ví dụ số. Hàm thuần thì viết test từ chính các ví dụ đó được ngay. |
| 4 | **Thời gian phải tiêm vào được (injectable clock).** Không gọi `new Date()` rải rác trong code. | Demo phải "đi hết một mùa trong 3 phút". Cần tua thời gian để chạy chốt tuần, chốt mùa và các mốc giờ hẹn nhóm. |
| 5 | **Chạy off-chain trước, on-chain sau.** DB là nguồn sự thật cho số dư và trạng thái. Blockchain đứng sau một interface, ban đầu dùng bản giả. | Gọi chuỗi chậm và hay lỗi mạng. Không để nó chặn tiến độ các tính năng khác. |
| 6 | **Thứ tự ưu tiên lấy theo kịch bản demo 3 phút.** Thứ gì không xuất hiện trong demo thì làm sau. | Đây là hackathon, giám khảo chỉ thấy phần demo. |

---

## 2. Giai đoạn 0 — Chốt trước khi code (nửa ngày)

### 2.1 Chốt các điểm spec chưa rõ — ✅ ĐÃ XONG (11/11/2026)

Đã duyệt toàn bộ 14 điểm theo gợi ý. Xem [mục 11 của tài liệu hợp đồng API](./backend-api-contract.md#11-quyết-định-cho-các-điểm-spec-chưa-rõ). Các mục thuật toán (6.1–6.6) trong tài liệu đó đã được cập nhật cho khớp.

> Từ giờ, khi code gặp điểm chưa rõ mới: thêm một dòng vào bảng đó, chốt xong mới code tiếp. Không để mỗi người tự hiểu một kiểu.

### 2.2 Chốt công nghệ

Gợi ý dưới đây ưu tiên **dùng chung TypeScript với FE**. Có thể đổi, nhưng nên chốt trong hôm nay.

| Thành phần | Gợi ý | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript (Node 24 LTS, cùng bản Node với máy dev hiện tại) | Copy được `types.ts` của FE sang dùng luôn. |
| Web framework | Fastify hoặc Express | Nhẹ, dựng nhanh. NestJS chắc chắn hơn nhưng tốn thời gian dựng khung. |
| Validate dữ liệu vào/ra | Zod | Dùng một schema cho cả validate request lẫn kiểm tra response trong contract test. |
| DB | PostgreSQL chạy bằng Docker | Có transaction, đủ cho tính khoảng cách đơn giản, không cần PostGIS. |
| ORM | Prisma hoặc Drizzle | Migration và seed có sẵn. |
| Test | Vitest + Supertest | Nhanh, cùng hệ sinh thái với TypeScript. |
| Job định kỳ | `node-cron`, cộng thêm endpoint admin để kích hoạt tay | Không cần Redis/BullMQ cho MVP. |
| Smart contract | Hardhat + OpenZeppelin, mạng Fuji | Viết test và deploy bằng TypeScript. |
| Gọi chuỗi | `ethers` v6 | FE cũng đã cài sẵn thư viện này. |
| Cho điện thoại truy cập BE | Cùng mạng LAN, hoặc `ngrok`/`cloudflared` | Điện thoại không gọi được `localhost` của máy dev. |

### 2.3 Chốt cấu trúc repo

```
Kilomeet/
├── docs/
├── kilomeet-app/            # FE (đã có)
├── kilomeet-api/            # BE (mới)
│   ├── src/
│   │   ├── domain/          # hàm thuần: rank.ts, season.ts, quest.ts, pricing.ts, geo.ts, group.ts
│   │   ├── modules/         # mỗi nhóm endpoint 1 thư mục: auth/ runs/ quests/ vouchers/ store/ groups/ admin/
│   │   │   └── vouchers/
│   │   │       ├── routes.ts      # khai báo endpoint + validate bằng Zod
│   │   │       ├── service.ts     # điều phối: gọi domain + DB + chain
│   │   │       └── schemas.ts     # Zod schema request/response
│   │   ├── chain/           # interface ChainGateway + FakeChain + FujiChain
│   │   ├── jobs/            # weekly-ranking, season-reset, group-timeline, chain-outbox
│   │   ├── lib/             # clock.ts, envelope.ts, auth.ts, errors.ts
│   │   └── contract/        # types.ts copy từ FE + Zod schema tương ứng
│   ├── prisma/              # schema.prisma, migrations, seed.ts
│   ├── test/
│   └── docker-compose.yml   # postgres
└── contracts/               # Hardhat: RunToken, Voucher, SeasonBadge
```

**Quy tắc phụ thuộc:** `domain/` không được import gì từ `modules/`, `chain/` hay Prisma. Chỉ `service.ts` mới được gọi DB và chain.

### 2.4 Chốt quy ước làm việc

- **Nhánh:** mỗi lát cắt một nhánh `feat/be-<tên>`, ví dụ `feat/be-vouchers`. Merge vào `main` qua PR, như FE đang làm.
- **Commit:** theo Conventional Commits như repo hiện tại (`feat(api): ...`, `fix(api): ...`, `test(domain): ...`).
- **Chia việc:**
  - **Người A (BE):** domain, API, DB, job.
  - **Người B (FE + tích hợp):** sửa các lệch ở [mục 7 của hợp đồng API](./backend-api-contract.md#7-chỗ-fe-lệch-hoặc-thiếu-so-với-spec) và nối FE vào BE.
  - **Người C (nếu có):** smart contract và chain gateway.

**Kết quả của giai đoạn 0:** ✅ 14 câu hỏi đã chốt · ⬜ stack đã chốt · ⬜ repo `kilomeet-api/` đã tạo · ⬜ mỗi người biết mình làm gì.

---

## 3. Giai đoạn 1 — Bộ khung chạy được từ đầu tới cuối (1 ngày)

Mục tiêu: **bấm nút Đăng nhập trên điện thoại thật, request đi tới BE thật, đọc từ DB thật rồi quay về.** Chưa cần đúng nghiệp vụ, chỉ cần đường ống thông suốt.

### Phía BE

1. Khởi tạo project, `docker-compose up` Postgres, tạo migration đầu tiên (`users`, `runner_profiles`, `stores`).
2. Viết `lib/envelope.ts`: mọi response bọc dạng `{success, data}`, mọi lỗi bọc dạng `{success:false, message}`. Đặt **một error handler toàn cục** để không response nào lọt ra ngoài định dạng này.
3. Viết `lib/clock.ts`:
   ```ts
   export interface Clock { now(): Date }
   // Mặc định dùng giờ thật. Trong môi trường demo/test cho phép đặt offset:
   //   POST /admin/clock { "offsetMs": 604800000 }  → tua tới 1 tuần
   ```
4. Viết `POST /auth/login`, `POST /auth/register`, `GET /auth/me` với JWT.
5. Viết `seed.ts` tạo 4 tài khoản demo (danh sách ở cuối hợp đồng API).
6. Viết `GET /health` để kiểm tra nhanh BE còn sống không.

### Phía FE (làm song song)

1. Gọi `api.setBaseUrl(process.env.EXPO_PUBLIC_API_URL)` khi khởi động app. Nếu biến **rỗng** thì vẫn dùng mock, để FE không bị chặn khi BE lỗi.
2. Gắn header `Authorization: Bearer <token>` vào `realFetch`.
3. Lưu token vào AsyncStorage. Khi mở app, gọi `/auth/me` để khôi phục phiên đăng nhập.
4. Làm `realFetch` chịu được response không phải JSON: bắt lỗi và hiện "Không kết nối được máy chủ".

### Tiêu chí xong

- [ ] Đăng nhập `minh@demo.com` trên điện thoại thật, màn hình chính hiện đúng tên.
- [ ] Đặt `EXPO_PUBLIC_API_URL=` rỗng thì app quay về dùng mock và vẫn chạy.
- [ ] Nhập sai mật khẩu thì hiện Alert "Email hoặc mật khẩu không đúng".

> Sau ngày này, mọi tính năng tiếp theo chỉ là "thêm một lát cắt" vào đường ống đã chạy.

---

## 4. Giai đoạn 2 — Làm từng lát cắt dọc

### 4.1 Quy trình cho mỗi lát cắt

Mỗi tính năng đi qua đúng 7 bước sau, theo đúng thứ tự:

```
① Đọc hợp đồng   →  ② Test domain (đỏ)  →  ③ Code domain (xanh)
        ↓
④ Migration + service + route  →  ⑤ Contract test  →  ⑥ Nối FE  →  ⑦ Chạy thử trên điện thoại
```

| Bước | Làm gì | Ra được gì |
|---|---|---|
| ① | Đọc phần endpoint trong `backend-api-contract.md` và hàm mock tương ứng trong `kilomeet-app/src/api/mock/`. Ghi lại các trường hợp lỗi. | Danh sách đầu vào, đầu ra và các lỗi phải trả. |
| ② | Viết test cho hàm domain **từ ví dụ số trong spec**, trước khi viết code. | Test đỏ. |
| ③ | Viết hàm domain cho test chuyển xanh. | Hàm thuần đã có test. |
| ④ | Viết migration, service (gọi domain + DB trong một transaction), route với Zod. | Endpoint chạy được. |
| ⑤ | Contract test: gọi endpoint, rồi kiểm tra response bằng Zod schema dựng từ `types.ts` của FE. | Bảo đảm hình dạng dữ liệu khớp FE. |
| ⑥ | Trên FE: sửa các chỗ lệch liên quan tới tính năng này (mục 7 của hợp đồng API). | FE dùng dữ liệu thật. |
| ⑦ | Chạy đúng bước demo tương ứng trên điện thoại. | Tính năng xong. |

### 4.2 Định nghĩa "Xong" cho một lát cắt

- [ ] Test domain xanh, có đủ các ví dụ số trong spec.
- [ ] Contract test xanh.
- [ ] Mọi lỗi nghiệp vụ trả đúng envelope với message tiếng Việt.
- [ ] Thao tác thay đổi tiền hoặc số lượng (mua, đốt, phát token) nằm trong **transaction** và chịu được việc gửi lặp lại.
- [ ] Chạy được bước demo tương ứng trên điện thoại thật.
- [ ] PR đã được người còn lại xem và merge.

### 4.3 Danh sách lát cắt, theo thứ tự

| # | Lát cắt | Hàm domain cần test trước | Endpoint | Demo bước |
|---|---|---|---|---|
| S1 | Buổi chạy + nhiệm vụ | `haversineKm`, `routeDistanceKm`, `dailyQuestDone`, `weeklyTarget`, `weeklyReward` | `/runs/start`, `/runs/end`, `GET /runs`, `GET /quests`, `/quests/complete` | 2 |
| S2 | Hạng tuần | `levelOf(km)`, `nextRank(history, cur, skip)`, `seasonBadge` | `POST /admin/run-weekly-ranking`, job CN 23:59 | 3 |
| S3 | Chạy ngang quán | `storesPassed(route, stores, 50m)`, `claimWindowValid(claimedAt, now)` | thêm logic vào `/runs/end`, `/runs/claim-store` | 4 |
| S4 | Mua và tặng voucher | `priceFor(template, eligible)`, `canBuy(...)`, `canGift(...)` | `GET /vouchers`, `/vouchers/mine`, `/vouchers/buy`, `/vouchers/gift` | 4–5 |
| S5 | Cửa hàng | `canRedeem(voucher, storeId, now)` | `/store/vouchers`, `/store/scan`, `/store/dashboard` | 6 |
| S6 | Mùa và quản trị | `seasonReset(runner)`, `seasonOf(date)` | `/admin/pending-stores`, `/admin/approve-store`, `/admin/seasons`, `/admin/season`, `/seasons/current` | 8 |
| S7 | Hội viên và nhóm (cơ bản) | `rankCompatible(a, b)`, `validSlot(slot)` | `/auth/subscribe`, `/groups`, `/groups/detail`, `/groups/create`, `/groups/join`, `/groups/confirm`, `/groups/leave` | 7 |
| S8 | Nhóm (thời gian thực) | `groupTimeline(T, now)`, `arrivedWithin50m`, `punctuality`, `autoMatch(requests)` | `/groups/location`, `/groups/locations`, `/groups/auto-match`, job mốc giờ | 7 |

**Lý do theo thứ tự này:**
- S1 đứng đầu vì mọi thứ phía sau (hạng, voucher, nhóm) đều cần km.
- S2 đi ngay sau S1 vì thuật toán xếp hạng là phần nghiệp vụ dễ sai nhất.
- S8 để cuối vì phức tạp nhất và dễ cắt bớt nhất (xem [Mục 10](#10-thứ-tự-cắt-bớt-khi-trễ)).

### 4.4 Ví dụ: viết test domain từ spec

Spec cho sẵn ví dụ của Lan, chép gần như nguyên văn thành test:

```ts
// test/domain/rank.test.ts
import { describe, it, expect } from 'vitest';
import { nextRank } from '../../src/domain/rank';

// Lịch sử level các tuần trước (mới nhất ở cuối) + km tuần này → hạng mới
describe('nextRank — ví dụ của Lan trong KILOMeet.md', () => {
  it('tuần 1: 42 km, đang Đồng → Bạc (tối đa 1 bậc)', () => {
    expect(nextRank({ cur: 'đồng', prevLevels: [], km: 42, skipAvailable: true }).rank).toBe('bạc');
  });
  it('tuần 2: 45 km, đang Bạc → Vàng', () => {
    expect(nextRank({ cur: 'bạc', prevLevels: ['cao_thủ'], km: 45, skipAvailable: true }).rank).toBe('vàng');
  });
  it('tuần 3: 41 km, 3 tuần liền đạt Cao thủ → lên thẳng Cao thủ', () => {
    expect(nextRank({ cur: 'vàng', prevLevels: ['cao_thủ', 'cao_thủ'], km: 41, skipAvailable: true }).rank).toBe('cao_thủ');
  });
  it('tuần 3: 20 km → mức thấp nhất 3 tuần là Bạch kim', () => {
    expect(nextRank({ cur: 'vàng', prevLevels: ['cao_thủ', 'cao_thủ'], km: 20, skipAvailable: true }).rank).toBe('bạch_kim');
  });
  it('tuần 3: 12 km → đúng mức Vàng, giữ Vàng', () => {
    expect(nextRank({ cur: 'vàng', prevLevels: ['cao_thủ', 'cao_thủ'], km: 12, skipAvailable: true }).rank).toBe('vàng');
  });
  it('tuần 3: 7 km, đã dùng lượt miễn → tụt về Bạc', () => {
    expect(nextRank({ cur: 'vàng', prevLevels: ['cao_thủ', 'cao_thủ'], km: 7, skipAvailable: false }).rank).toBe('bạc');
  });
  it('tuần 3: 7 km, còn lượt miễn → giữ Vàng, mất lượt miễn', () => {
    const r = nextRank({ cur: 'vàng', prevLevels: ['cao_thủ', 'cao_thủ'], km: 7, skipAvailable: true });
    expect(r).toEqual({ rank: 'vàng', skipUsed: true });
  });
});
```

Ví dụ trong spec giả định Lan đã dùng lượt miễn. Hai test cuối kiểm tra các quyết định đã chốt (#5: tự dùng lượt miễn). Cần thêm test cho:
- **#6:** tuần được miễn làm đứt chuỗi. Ví dụ CT, CT, *(tuần miễn)*, CT thì tuần thứ 4 **không** được lên nhanh.
- **#7:** chuỗi không vắt qua mùa. Ví dụ 2 tuần cuối mùa trước đạt CT, tuần đầu mùa mới đạt CT thì **không** được lên nhanh.
- **Đồng chạy 0 km:** giữ Đồng, **không** mất lượt miễn.

Làm tương tự cho:
- **Reset mùa:** Cao thủ 1.000 token → 500 token và Bạch kim; 300 token → giữ 300. Thêm trường hợp tuần dở dang được chấm trước khi reset (#8).
- **Giá voucher:** giá gốc 500, giảm 50% → 250.
- **Nhiệm vụ tuần (#2, #3, #4):** TB 13,6 km → mục tiêu 15, thưởng 105; người mới → mục tiêu 5, thưởng 35; TB 40 km → mục tiêu 44, thưởng 308.
- **Nhiệm vụ ngày (#1):** 2 buổi 1,2 km + 0,9 km trong cùng ngày → hoàn thành ở buổi thứ hai; 2 buổi đó nằm hai bên 0:00 giờ VN → không hoàn thành.

### 4.5 Contract test: bảo đảm khớp FE

```ts
// src/contract/schemas.ts — dựng theo kilomeet-app/src/api/types.ts
export const RankZ = z.enum(['đồng', 'bạc', 'vàng', 'bạch_kim', 'kim_cương', 'cao_thủ']);
export const RunZ = z.object({
  id: z.string(), userId: z.string(), distanceKm: z.number(), durationMinutes: z.number(),
  avgPaceMinPerKm: z.number(), route: z.array(GpsPointZ), startedAt: z.string(),
  endedAt: z.string(), passedStoreIds: z.array(z.string()),
});
export const envelope = <T extends z.ZodTypeAny>(d: T) => z.object({ success: z.literal(true), data: d });

// test/contract/runs.test.ts
const res = await request(app).post('/runs/end').set(auth(minh)).send(sampleRun);
expect(() => envelope(RunZ).parse(res.body)).not.toThrow();
```

**Mẹo:** viết thêm một test chạy chính các hàm mock của FE (`kilomeet-app/src/api/mock/*`) qua cùng bộ schema. Nếu mock của FE cũng pass thì schema đúng là bản sao của hợp đồng FE đang dùng.

---

## 5. Giai đoạn 3 — Gắn blockchain, tập dượt demo

### 5.1 Chain gateway: bản giả trước, bản thật sau

```ts
// src/chain/gateway.ts
export interface ChainGateway {
  mintToken(to: string, amount: number, reason: string): Promise<string>;     // trả về txHash
  burnToken(from: string, amount: number, reason: string): Promise<string>;
  mintVoucher(to: string, templateTokenId: number): Promise<string>;
  transferVoucher(from: string, to: string, templateTokenId: number): Promise<string>;
  burnVoucher(from: string, templateTokenId: number): Promise<string>;
  mintSeasonBadge(to: string, seasonId: string, rank: number): Promise<string>;
}
// FakeChain: trả txHash giả, dùng trong S1–S8 và trong test.
// FujiChain: gọi contract thật, bật bằng biến môi trường CHAIN=fuji.
```

### 5.2 Mẫu outbox: không để chuỗi làm chậm API

1. Trong **cùng transaction** với nghiệp vụ (ví dụ mua voucher), ghi thêm một dòng vào bảng `chain_outbox`:
   `(id, op, payload, status=pending, tx_hash, attempts)`.
2. API trả về ngay cho FE.
3. Job `chain-outbox` chạy mỗi vài giây: lấy các dòng `pending`, gọi `FujiChain`, lưu `tx_hash`, đặt `status=done`. Lỗi thì tăng `attempts` và thử lại.
4. FE hoặc màn admin có thể hiện `txHash` thành link Snowtrace cho giám khảo xem.

### 5.3 Smart contract (người C làm song song từ giai đoạn 1)

| Ngày | Việc |
|---|---|
| 1–2 | Viết `RunToken` (ERC-20, `decimals=0`, chặn `transfer` của người dùng, role MINTER/BURNER), `Voucher` (ERC-1155, operator), `SeasonBadge` (soulbound). Có test Hardhat. |
| 3 | Deploy lên Fuji, verify trên Snowtrace, nạp AVAX cho ví server. |
| 4–5 | Viết `FujiChain` và chạy thử với từng op trong outbox. |

### 5.4 Chuẩn bị demo

- **Buổi chạy ghi sẵn:** chuẩn bị file JSON `route` cho (a) 3 km bình thường và (b) 5 km **đi ngang 2 quán gần HCMUT**. Thêm một trong hai cách phát lại:
  - FE có nút ẩn "Phát buổi chạy mẫu", hoặc
  - script `npm run demo:replay -- --user lan --route routes/5km-2-quan.json` gọi thẳng `/runs/start` và `/runs/end`.
- **Script dựng dữ liệu demo:** `npm run demo:reset` xoá DB, seed lại, đặt Minh ở Cao thủ với 1.000 token, tạo 2–3 hội viên gần nhau.
- **Tua thời gian:** `POST /admin/clock` để nhảy tới Chủ nhật 23:59 (xem chốt tuần) hoặc tới T − 30' của một nhóm (xem chia sẻ vị trí).
- **Checklist tập dượt:** chạy đúng 8 bước trong "Kịch bản demo 3 phút", bấm giờ, **ít nhất 3 lần** trên 3 điện thoại thật. Quay video dự phòng sau lần chạy trơn tru đầu tiên.

---

## 6. Lịch 9 ngày

| Ngày | Ngày tháng | BE (người A) | FE / tích hợp (người B) | Contract (người C) | Mốc kiểm tra cuối ngày |
|---|---|---|---|---|---|
| D1 | 11/11 | Giai đoạn 0, dựng khung BE, auth, envelope, seed | `setBaseUrl`, header Authorization, lưu token | Dựng Hardhat, viết RunToken | Đăng nhập thật trên điện thoại |
| D2 | 12/11 | S1 buổi chạy + nhiệm vụ | Timestamp GPS thật; gọi `/auth/me` sau buổi chạy | Viết Voucher ERC-1155 | Chạy 3 km → +10 token (demo bước 2) |
| D3 | 13/11 | S2 hạng tuần + tua thời gian | Banner mùa đọc từ API; màn chọn quán sau buổi chạy | SeasonBadge, test, deploy Fuji | Tua tuần → hạng đổi đúng (bước 3) |
| D4 | 14/11 | S3 chạy ngang quán + S4 voucher | Dùng `myPrice`; tặng bằng email | `FujiChain`: mint/burn token | Buổi chạy qua 2 quán → mua còn 250 token (bước 4–5) |
| D5 | 15/11 | S5 cửa hàng + S6 mùa và quản trị | Đăng ký cửa hàng (role + thông tin quán) | `FujiChain`: voucher + badge | Quét QR → đốt voucher, ghi phí; đóng mùa → 500 token (bước 6, 8) |
| D6 | 16/11 | S7 nhóm cơ bản | Màn xác nhận/huỷ, chọn điểm hội tụ trên bản đồ | Bật outbox với Fuji thật | Tạo nhóm, 3 tài khoản tham gia và xác nhận |
| D7 | 17/11 | S8 vị trí trực tiếp (polling) + job mốc giờ | Bản đồ thành viên, poll 5–10s | Hỗ trợ tích hợp, sửa lỗi chuỗi | Bản đồ hiện 3 người đang tới (bước 7) |
| D8 | 18/11 | **Đóng băng tính năng.** Chỉ sửa lỗi, viết script demo | Đánh bóng UI, các trạng thái loading/lỗi | Link Snowtrace trong app | Chạy trọn 8 bước demo không lỗi |
| D9 | 19/11 | Tập dượt ×3, quay video dự phòng | Tập dượt ×3 | Tập dượt ×3 | Video dự phòng đã có |
| — | 20/11 | **Nộp / thuyết trình** | | | |

> Nếu chỉ có **2 người**: người A làm thêm phần chain từ D6, và D7 thay S8 bằng phương án dự phòng ở [Mục 10](#10-thứ-tự-cắt-bớt-khi-trễ).

---

## 7. Cách kiểm thử

Không test mọi thứ như nhau. Dồn công vào chỗ dễ sai và đắt khi sai.

| Tầng | Test gì | Mức độ | Công cụ |
|---|---|---|---|
| Domain (hàm thuần) | Xếp hạng, reset mùa, giá, nhiệm vụ, haversine, phạm vi hạng, đúng hẹn | **Rất kỹ.** Mọi ví dụ trong spec phải có test, thêm các trường hợp biên (0 km, Đồng không tụt được, Cao thủ không lên được nữa). | Vitest |
| Service / API | Mua voucher (đủ/thiếu token, hết hàng, sai hạng), tặng lần 2, quét QR 2 lần, `/quests/complete` gọi lặp | **Vừa.** Tập trung vào tiền, số lượng và việc gọi lặp. | Vitest + Supertest + DB test |
| Contract | Hình dạng response khớp `types.ts` | **Mọi endpoint FE dùng**, mỗi endpoint 1 test. | Zod |
| Smart contract | Không chuyển được token, không bán quá số lượng, không đốt voucher 2 lần | **Vừa.** | Hardhat test |
| End-to-end | 8 bước demo | **Thủ công**, chạy theo checklist trên điện thoại thật. | Checklist |

**Các trường hợp bắt buộc có test vì liên quan tới tiền và số lượng:**
- Hai request mua cùng lúc khi voucher chỉ còn 1 → chỉ một request thành công. Dùng `SELECT ... FOR UPDATE` hoặc `UPDATE ... WHERE remaining > 0`.
- Quét cùng một QR hai lần → lần 2 báo "Voucher đã được sử dụng".
- Gọi `/runs/end` hai lần cho cùng một `runId` → không phát token hai lần.
- Reset mùa chạy hai lần → lần 2 báo lỗi, không trừ token thêm.

---

## 8. Quy trình làm việc hằng ngày

| Thời điểm | Việc | Thời lượng |
|---|---|---|
| Sáng | Họp nhanh: hôm qua xong gì, hôm nay làm lát cắt nào, đang vướng gì. Ai cần đổi hợp đồng API thì báo ngay lúc này. | 10 phút |
| Trong ngày | Làm theo 7 bước ở [Mục 4.1](#41-quy-trình-cho-mỗi-lát-cắt). Mở PR nhỏ, mỗi PR một lát cắt hoặc nửa lát cắt. | |
| Chiều | Ghép FE với BE: chạy **mốc kiểm tra cuối ngày** trong [lịch](#6-lịch-9-ngày) trên điện thoại thật. | 30 phút |
| Tối | Xem chéo và merge PR. Cập nhật `backend-api-contract.md` nếu hợp đồng có đổi. | 15 phút |

**Quy tắc đổi hợp đồng API:** không ai được tự đổi hình dạng response. Muốn đổi thì:
1. Sửa `backend-api-contract.md` trước.
2. Báo người còn lại.
3. Sửa Zod schema và `types.ts` của FE **trong cùng một PR**.

Thêm field mới thì được tự do, vì FE bỏ qua field không biết.

---

## 9. Rủi ro và phương án dự phòng

| Rủi ro | Khả năng | Ảnh hưởng | Phòng ngừa | Dự phòng khi xảy ra |
|---|---|---|---|---|
| Điện thoại không gọi được BE (mạng hội trường chặn LAN) | Cao | Demo hỏng toàn bộ | Dùng `cloudflared`/`ngrok` để có URL công khai; thử ở mạng 4G | Phát hotspot từ laptop; cuối cùng là video dự phòng |
| GPS trong nhà không di chuyển | Cao | Không ra km | Dùng buổi chạy ghi sẵn (Mục 5.4) | Script replay từ laptop |
| Fuji chậm hoặc lỗi | Vừa | Không có txHash để khoe | Outbox, API không chờ chuỗi | Bật `CHAIN=fake`, chiếu txHash đã có sẵn trên Snowtrace |
| Thuật toán xếp hạng sai | Vừa | Sai trước mặt giám khảo (bước 3, 8) | Test từ ví dụ spec (Mục 4.4) | — |
| Nhóm chạy thời gian thực không kịp | Cao | Thiếu bước 7 | Để S8 cuối, dùng polling thay WebSocket | Phương án cắt bớt ở Mục 10 |
| Lệch hợp đồng FE–BE | Vừa | Màn hình trắng, crash | Contract test, ghép mỗi chiều | Bật lại mock (`EXPO_PUBLIC_API_URL` rỗng) |
| Lệch múi giờ (UTC so với giờ VN) | Vừa | Nhiệm vụ ngày hoặc chốt tuần lệch 7 tiếng | Mọi phép tính ngày/tuần đi qua `clock` với `Asia/Ho_Chi_Minh` | — |

---

## 10. Thứ tự cắt bớt khi trễ

Nếu tới **D6** mà vẫn trễ hơn lịch từ 1 ngày trở lên, cắt theo thứ tự này (từ trên xuống):

| Thứ tự cắt | Bỏ gì | Thay bằng |
|---|---|---|
| 1 | Bảng xếp hạng, thông báo, cấu hình nhiệm vụ và hạng | Không làm (đều là "Nên có") |
| 2 | Huy hiệu mùa on-chain | Chỉ lưu trong DB |
| 3 | Ghép nhóm tự động (`/groups/auto-match`) | Demo bằng "tự lập nhóm" + 2 tài khoản tham gia |
| 4 | Job nhắc giờ, chấm vắng, tính đúng hẹn tự động | Endpoint admin kích hoạt tay khi demo |
| 5 | Vị trí trực tiếp bằng GPS thật | 3 tài khoản phát vị trí giả bằng script, poll 5s |
| 6 | Voucher on-chain | Chỉ giữ RunToken on-chain, voucher nằm trong DB |

**Không bao giờ cắt** (lõi của bài thi):
- Auth + ví
- Chạy → nhiệm vụ → token
- Thuật toán xếp hạng và reset mùa
- Mua, tặng, quét voucher kèm giảm giá nhờ chạy ngang quán
- RunToken on-chain
