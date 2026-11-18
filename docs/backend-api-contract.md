# KILOMeet — Phân tích nghiệp vụ & Hợp đồng API cho Backend

> Tài liệu này mô tả những gì Backend (BE) cần làm để chạy được với mobile app (FE) hiện có trong `kilomeet-app/`.
> Nguồn: spec [`KILOMeet.md`](./KILOMeet.md) + code FE (`src/api/`, `src/stores/`, các màn hình trong `app/`).
> Nguyên tắc: **FE là hợp đồng** — BE trả đúng hình dạng dữ liệu FE đang dùng; chỗ nào FE sai/thiếu so với spec thì ghi rõ ở [Mục 7](#7-chỗ-fe-lệch-hoặc-thiếu-so-với-spec).

## Mục lục

1. [Bốn việc phải xử lý trước](#1-bốn-việc-phải-xử-lý-trước)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Mô hình dữ liệu (Types)](#3-mô-hình-dữ-liệu-types)
4. [Hằng số nghiệp vụ](#4-hằng-số-nghiệp-vụ)
5. [Danh sách endpoint](#5-danh-sách-endpoint)
6. [Thuật toán BE phải tự làm](#6-thuật-toán-be-phải-tự-làm)
7. [Chỗ FE lệch hoặc thiếu so với spec](#7-chỗ-fe-lệch-hoặc-thiếu-so-với-spec)
8. [Endpoint nên thêm](#8-endpoint-nên-thêm)
9. [Phần Avalanche](#9-phần-avalanche)
10. [Gợi ý lược đồ cơ sở dữ liệu](#10-gợi-ý-lược-đồ-cơ-sở-dữ-liệu)
11. [Quyết định cho các điểm spec chưa rõ](#11-quyết-định-cho-các-điểm-spec-chưa-rõ) ✅ đã chốt
12. [Thứ tự làm theo kịch bản demo](#12-thứ-tự-làm-theo-kịch-bản-demo)

---

## 1. Bốn việc phải xử lý trước

Nếu không xử lý 4 việc này, FE không thể nói chuyện với BE.

| # | Vấn đề | Ở đâu | Cách sửa |
|---|---|---|---|
| 1 | FE đang chạy **hoàn toàn bằng mock**. Chỉ gọi BE thật khi `api.setBaseUrl()` được gọi, mà hiện không chỗ nào gọi. | `src/api/client.ts` | Gọi `api.setBaseUrl(process.env.EXPO_PUBLIC_API_URL)` khi khởi động app. Trên điện thoại thật phải dùng **IP LAN** của máy chạy BE, không dùng `localhost`. |
| 2 | FE **không gửi token đăng nhập**: `realFetch` không có header `Authorization`, token chỉ nằm trong Zustand (mất khi tắt app). Mock biết "ai đang đăng nhập" nhờ biến toàn cục — BE thật không có cách đó. | `src/api/client.ts`, `src/stores/auth.ts` | FE gửi `Authorization: Bearer <token>` và lưu token vào AsyncStorage. |
| 3 | FE luôn gọi `res.json()` rồi kiểm tra `json.success`, **không nhìn HTTP status**. | `src/api/client.ts` | BE phải luôn trả body JSON theo dạng ở [Mục 2.1](#21-định-dạng-response), kể cả khi lỗi. |
| 4 | Màn đăng ký có chọn vai trò "Cửa hàng" nhưng **không gửi role**, cũng không có ô nhập tên quán/địa chỉ/toạ độ. | `app/(auth)/register.tsx` | FE bổ sung field. BE nhận thêm `role`, `storeName`, `storeAddress`, `latitude`, `longitude`. |

---

## 2. Quy ước chung

### 2.1 Định dạng response

Mọi response (thành công hay lỗi) đều bọc trong:

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "message": "Không đủ token" }
```

- `message` được FE hiện thẳng lên `Alert` → **viết bằng tiếng Việt**.
- HTTP status tuỳ BE (nên dùng đúng 4xx/5xx), nhưng body **bắt buộc** là JSON đúng dạng trên.

### 2.2 Cách truyền tham số

- `GET`: tham số đi qua **query string** (`?groupId=...`), không dùng path param kiểu `/groups/:id`.
- `POST`: body JSON.
- FE hiện không dùng `PUT` / `DELETE`.

### 2.3 Định dạng dữ liệu

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Thời điểm | ISO 8601 | `"2026-11-10T06:00:00Z"` |
| Ngày (nhóm chạy) | `YYYY-MM-DD` | `"2026-11-11"` |
| Khung giờ (nhóm chạy) | `HH:mm` | `"05:30"` |
| ID | chuỗi | `"user-minh"`, `"vt-1"` |
| Token | **số nguyên** | `500` |
| Tiền | số nguyên, đơn vị VND | `5000` |
| Múi giờ nghiệp vụ | `Asia/Ho_Chi_Minh` (UTC+7) | mốc tuần: Chủ nhật 23:59 giờ VN |

### 2.4 Mã hạng là chuỗi tiếng Việt có dấu

```
'đồng' | 'bạc' | 'vàng' | 'bạch_kim' | 'kim_cương' | 'cao_thủ'
```

- Chuỗi ở dạng Unicode **NFC**.
- Khuyên dùng: trong DB lưu **số 0–5**, chỉ đổi sang chuỗi ở lớp API để tránh lỗi so sánh Unicode.

### 2.5 Vai trò

```
'runner' | 'member' | 'store' | 'admin'
```

Khi người chạy mua gói Hội viên: `role` đổi `runner` → `member` và `isMember` → `true`.

### 2.6 Các quy ước ngầm khác

- **ID cửa hàng = ID tài khoản cửa hàng.** Màn quản lý voucher của quán gọi `GET /vouchers?storeId=<user.id>`, nên `VoucherTemplate.storeId` phải bằng `User.id` của chủ quán.
- **Làm tròn giá giống FE:** `Math.round(priceTokens * (1 - questDiscountPercent / 100))`. JS làm tròn `.5` **lên**. Nếu BE viết bằng Python thì **không** dùng `round()` (làm tròn kiểu ngân hàng) — dùng `math.floor(x + 0.5)`.
- **BE được trả thêm field** mà FE chưa khai báo, FE sẽ bỏ qua. Đây là cách mở rộng an toàn.

---

## 3. Mô hình dữ liệu (Types)

Nguồn: `kilomeet-app/src/api/types.ts`.

### 3.1 User

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: 'runner' | 'member' | 'store' | 'admin';
  walletAddress: string;
  createdAt: string;            // ISO
}

interface Runner extends User {
  role: 'runner' | 'member';
  rank: Rank;
  tokenBalance: number;
  kmThisWeek: number;
  isMember: boolean;            // đã mua gói Hội viên
  punctuality: number;          // % đúng hẹn (0–100)
  seasonBadge: Rank | null;     // hạng cao nhất mùa này
  skipWeekAvailable: boolean;   // còn lượt miễn kiểm tra 1 tuần không
}

interface Store extends User {
  role: 'store';
  storeName: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
  approved: boolean;            // false → FE hiện "Chờ duyệt", khoá nút quét QR
  totalUsages: number;          // tổng lượt voucher đã dùng tại quán
  totalFeesVnd: number;         // = totalUsages × 5000
}

interface Admin extends User {
  role: 'admin';
}

type AnyUser = Runner | Store | Admin;

interface AuthResponse {
  user: AnyUser;
  token: string;
}
```

### 3.2 Run

```ts
interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;            // ISO
}

interface Run {
  id: string;
  userId: string;
  distanceKm: number;
  durationMinutes: number;
  avgPaceMinPerKm: number;
  route: GpsPoint[];
  startedAt: string;
  endedAt: string;              // '' khi buổi chạy chưa kết thúc
  passedStoreIds: string[];     // các quán đường chạy đi qua trong 50 m
}
```

### 3.3 Quest

```ts
interface Quest {
  id: string;
  userId: string;
  type: 'daily' | 'weekly';
  targetKm: number;
  progressKm: number;
  rewardTokens: number;
  status: 'active' | 'completed' | 'expired';
  expiresAt: string;            // cuối ngày / cuối tuần
  completedAt: string | null;
}
```

### 3.4 Voucher

```ts
interface VoucherTemplate {       // voucher đang bán (do cửa hàng tạo)
  id: string;
  storeId: string;                // = User.id của cửa hàng
  storeName: string;
  storeLatitude: number;
  storeLongitude: number;
  title: string;
  description: string;
  priceTokens: number;            // giá gốc bằng token
  discountPercent: number;        // % giảm tiền hàng tại quán (20 = giảm 20%)
  questDescription: string | null;// "Chạy ngang qua quán" hoặc null
  questDiscountPercent: number;   // % giảm GIÁ TOKEN khi làm nhiệm vụ (50 = trả nửa giá)
  totalSupply: number;
  remaining: number;
  minRank: Rank;
  expiresAt: string;
  imageUrl: string | null;
  // ĐỀ XUẤT THÊM (quyết định #9) — FE chưa có:
  // area: string | null;          // mã quận/huyện, null = mọi khu vực
}

interface OwnedVoucher {          // voucher đã mua, nằm trong ví
  id: string;
  templateId: string;
  template: VoucherTemplate;      // trả kèm đầy đủ
  ownerId: string;
  status: 'available' | 'owned' | 'gifted' | 'used' | 'expired';
  purchasedAt: string;
  questCompletedAt: string | null;
  paidTokens: number;             // giá thực trả
  giftedFrom: string | null;      // userId người tặng, nếu có
  usedAt: string | null;
  qrCode: string;                 // chuỗi FE hiển thị thành mã QR
}
```

**Ý nghĩa `status` theo cách FE đang hiểu:**

| status | Ý nghĩa | Dùng được? | Tặng được? |
|---|---|---|---|
| `owned` | Đã mua, chưa dùng | ✅ | ✅ nếu `giftedFrom == null` |
| `gifted` | Voucher **người nhận** đang giữ | ✅ | ❌ |
| `used` | Đã quét tại quầy | ❌ | ❌ |
| `expired` | Đã quá hạn | ❌ | ❌ |
| `available` | Không dùng cho voucher đã sở hữu | — | — |

### 3.5 Group

```ts
type RankRange = 'same' | 'within1' | 'within2' | 'any';
type GroupStatus = 'open' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface GroupMember {
  userId: string;
  userName: string;
  rank: Rank;
  confirmed: boolean;
  arrived: boolean;
  punctuality: number;
}

interface GroupRun {
  id: string;
  creatorId: string;
  date: string;                   // YYYY-MM-DD
  timeSlot: string;               // một trong GROUP_TIME_SLOTS
  meetingPoint: { name: string; latitude: number; longitude: number };
  distanceKm: number;
  rankRange: RankRange;
  status: GroupStatus;
  members: GroupMember[];
  maxMembers: number;             // 6
}
```

### 3.6 Store dashboard & Admin

```ts
interface StoreDashboard {
  storeId: string;
  storeName: string;
  totalVouchersCreated: number;
  totalVouchersUsed: number;
  totalFeesVnd: number;
  recentUsages: { voucherTitle: string; usedAt: string; userName: string }[];
}

interface SeasonInfo {
  id: string;
  name: string;                   // "Mùa 3/2026"
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD
  isActive: boolean;
}

interface PendingStore {
  id: string;                     // = User.id của cửa hàng
  email: string;
  storeName: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
  appliedAt: string;
}
```

---

## 4. Hằng số nghiệp vụ

### 4.1 Hạng

| Index | Mã | Tên hiển thị | Km/tuần cần đạt | Token giữ lại tối đa khi hết mùa |
|---|---|---|---|---|
| 0 | `đồng` | Đồng | 0 | 0 |
| 1 | `bạc` | Bạc | 5 | 100 |
| 2 | `vàng` | Vàng | 10 | 200 |
| 3 | `bạch_kim` | Bạch kim | 15 | 300 |
| 4 | `kim_cương` | Kim cương | 25 | 400 |
| 5 | `cao_thủ` | Cao thủ | 40 | 500 |

### 4.2 Các hằng số khác

| Hằng số | Giá trị |
|---|---|
| Nhiệm vụ ngày | chạy ≥ 2 km → 10 token |
| Nhiệm vụ tuần | mục tiêu = TB 4 tuần gần nhất + 10%; thưởng 7 token / km mục tiêu |
| Phí Hội viên | 39.000 đ/tháng (thanh toán giả lập) |
| Phí cửa hàng | 5.000 đ / lượt voucher được dùng |
| Bán kính "chạy ngang quán" | 50 m |
| Hạn dùng quyền giảm giá voucher | 7 ngày sau khi làm xong nhiệm vụ |
| Khung giờ nhóm chạy | `05:00 05:30 06:00 06:30 07:00 17:00 17:30 18:00 18:30 19:00 19:30 20:00` |
| Số người mỗi nhóm | tối thiểu 2 (tự lập) / 3 (ghép tự động), tối đa 6 |
| Bán kính ghép nhóm | ~3 km |
| Bán kính check-in nhóm | 50 m quanh điểm hội tụ |
| Mùa chạy | T1–T4, T5–T8, T9–T12 |

---

## 5. Danh sách endpoint

Tổng quan:

| Nhóm | Method | Endpoint | Ai gọi |
|---|---|---|---|
| Auth | POST | `/auth/login` | mọi người |
| Auth | POST | `/auth/register` | mọi người |
| Auth | GET | `/auth/me` | đã đăng nhập *(FE chưa gọi, nên có)* |
| Auth | POST | `/auth/subscribe` | runner |
| Run | POST | `/runs/start` | runner, member |
| Run | POST | `/runs/end` | runner, member |
| Run | GET | `/runs` | runner, member |
| Quest | GET | `/quests` | runner, member |
| Quest | POST | `/quests/complete` | runner, member |
| Voucher | GET | `/vouchers` | runner, member, store |
| Voucher | GET | `/vouchers/mine` | runner, member |
| Voucher | POST | `/vouchers/buy` | runner, member |
| Voucher | POST | `/vouchers/gift` | runner, member |
| Store | GET | `/store/dashboard` | store |
| Store | POST | `/store/vouchers` | store (đã duyệt) |
| Store | POST | `/store/scan` | store (đã duyệt) |
| Store | GET | `/store/profile` | store (kể cả chưa duyệt) |
| Store | POST | `/store/profile` | store (kể cả chưa duyệt) |
| Store | GET | `/stores/profile?storeId=` | mọi vai trò đã đăng nhập |
| Group | GET | `/groups` | member |
| Group | GET | `/groups/detail` | member |
| Group | POST | `/groups/create` | member |
| Group | POST | `/groups/join` | member |
| Admin | GET | `/admin/pending-stores` | admin |
| Admin | POST | `/admin/approve-store` | admin |
| Admin | GET | `/admin/seasons` | admin |
| Admin | POST | `/admin/season` | admin |

---

### 5.1 Auth

#### `POST /auth/login`

Request:
```json
{ "email": "minh@demo.com", "password": "demo123" }
```

Response `data`:
```json
{
  "user": {
    "id": "user-minh",
    "email": "minh@demo.com",
    "name": "Trần Minh",
    "role": "member",
    "walletAddress": "0x...",
    "createdAt": "2026-09-01T08:00:00Z",
    "rank": "cao_thủ",
    "tokenBalance": 1000,
    "kmThisWeek": 42,
    "isMember": true,
    "punctuality": 95,
    "seasonBadge": "cao_thủ",
    "skipWeekAvailable": false
  },
  "token": "<jwt>"
}
```

Nếu `role` là `store` thì `user` có các field của `Store`; nếu `admin` thì chỉ có field của `User`.

Lỗi: `"Email hoặc mật khẩu không đúng"`.

#### `POST /auth/register`

Request (FE hiện tại):
```json
{ "email": "lan@demo.com", "name": "Nguyễn Lan", "password": "demo123" }
```

Request (đề xuất, sau khi FE sửa):
```json
{
  "email": "quan@demo.com", "name": "Chủ quán", "password": "...",
  "role": "store",
  "storeName": "Fuji Coffee", "storeAddress": "268 Lý Thường Kiệt",
  "latitude": 10.773, "longitude": 106.660
}
```

Response `data`: `AuthResponse` như login.

BE phải làm:
- Tạo ví cho người dùng (xem [Mục 9](#9-phần-avalanche)).
- Runner mới: `rank: "đồng"`, `tokenBalance: 0`, `kmThisWeek: 0`, `isMember: false`, `punctuality: 100`, `seasonBadge: null`, `skipWeekAvailable: true`.
- Store mới: `approved: false`, chờ admin duyệt.

Lỗi: `"Email đã được sử dụng"`.

#### `GET /auth/me`

Response `data`: `AnyUser` của người đang đăng nhập.

FE chưa gọi, nhưng **nên làm** để FE lấy lại số dư token, hạng, km tuần sau mỗi buổi chạy.

#### `POST /auth/subscribe`

Request: không có body.

Response `data`:
```json
{ "success": true }
```

BE phải làm:
- Chỉ runner được gọi. Lỗi: `"Chỉ người chạy mới đăng ký hội viên"`.
- Đặt `isMember = true`, `role = "member"`, `memberUntil = now + 1 tháng` (nếu đang là hội viên thì cộng nối tiếp vào hạn cũ).
- **Hết hạn** (quyết định #13): job hằng ngày đưa người có `memberUntil < now` về `isMember = false`, `role = "runner"`. Họ được tự động rút khỏi các nhóm chưa diễn ra **mà không bị tính vắng**.
- Môi trường demo: đặt `memberUntil` dài, ví dụ +1 năm, qua biến môi trường `MEMBERSHIP_DAYS`.
- Có thể trả thêm `memberUntil` trong `Runner` (FE bỏ qua cho tới khi dùng).

---

### 5.2 Run

#### `POST /runs/start`

Request: không có body.

Response `data`:
```json
{
  "id": "run-123",
  "userId": "user-lan",
  "distanceKm": 0,
  "durationMinutes": 0,
  "avgPaceMinPerKm": 0,
  "route": [],
  "startedAt": "2026-11-11T05:30:00Z",
  "endedAt": "",
  "passedStoreIds": []
}
```

Lưu ý: `endedAt` là chuỗi rỗng `""`, không phải `null`.

#### `POST /runs/end`

Request:
```json
{
  "runId": "run-123",
  "distanceKm": 3.02,
  "durationMinutes": 18,
  "route": [
    { "latitude": 10.773, "longitude": 106.660, "timestamp": "2026-11-11T05:30:00Z" },
    { "latitude": 10.775, "longitude": 106.662, "timestamp": "2026-11-11T05:48:00Z" }
  ],
  "passedStoreIds": ["store-fuji"]
}
```

Response `data`: `Run` đã cập nhật.

BE phải làm:
1. **Tự tính lại** `distanceKm` từ `route` (haversine), không tin số FE gửi.
2. **Tự tính** `passedStoreIds` từ `route` — bỏ qua giá trị FE gửi (FE đang tính sai, xem [Mục 7](#7-chỗ-fe-lệch-hoặc-thiếu-so-với-spec)).
3. `avgPaceMinPerKm = durationMinutes / distanceKm` (cẩn thận chia cho 0).
4. Cộng km vào `kmThisWeek`.
5. Cập nhật `progressKm` của nhiệm vụ ngày và tuần; nếu đạt thì đánh dấu `completed` và **phát token**.
6. Nếu đi qua đúng 1 quán: tự ghi nhận nhiệm vụ voucher cho quán đó. Nếu nhiều quán: chờ người chạy chọn (xem [Mục 8](#8-endpoint-nên-thêm)).

Lỗi: `"Run not found"` → nên đổi thành `"Không tìm thấy buổi chạy"`.

#### `GET /runs`

Query: `userId` (tuỳ chọn, mặc định là người đang đăng nhập).

Response `data`: `Run[]`, **mới nhất đứng đầu**.

---

### 5.3 Quest

#### `GET /quests`

Response `data` (luôn gồm 1 nhiệm vụ ngày + 1 nhiệm vụ tuần):
```json
[
  {
    "id": "quest-daily-user-lan-2026-11-11",
    "userId": "user-lan",
    "type": "daily",
    "targetKm": 2,
    "progressKm": 0,
    "rewardTokens": 10,
    "status": "active",
    "expiresAt": "2026-11-11T16:59:59Z",
    "completedAt": null
  },
  {
    "id": "quest-weekly-user-lan-2026-W46",
    "userId": "user-lan",
    "type": "weekly",
    "targetKm": 15,
    "progressKm": 3,
    "rewardTokens": 105,
    "status": "active",
    "expiresAt": "2026-11-15T16:59:59Z",
    "completedAt": null
  }
]
```

(`16:59:59Z` = 23:59:59 giờ Việt Nam.)

#### `POST /quests/complete`

Request:
```json
{ "questId": "quest-daily-user-lan-2026-11-11" }
```

Response `data`: `Quest`.

> ⚠️ **Phải trả thành công cả khi nhiệm vụ đã hoàn thành rồi (idempotent).**
>
> Lý do: sau khi kết thúc buổi chạy ≥ 2 km, `run.tsx` tự gọi endpoint này nếu nhiệm vụ ngày trong state FE còn `active`. Nhưng theo spec, BE đã tự chấm nhiệm vụ ở `/runs/end` → lúc FE gọi, nhiệm vụ đã `completed`. Nếu BE báo lỗi, FE không bắt lỗi này (promise bị reject không ai xử lý).
>
> Endpoint này **không được phát token lần nữa**. Chỉ trả về quest hiện tại.
>
> Thêm nữa: FE tự cộng `rewardTokens` vào số dư hiển thị sau khi gọi → màn hình có thể cộng 2 lần (số dư thật trên BE vẫn đúng). Cách sửa: FE gọi `GET /auth/me` sau buổi chạy.

---

### 5.4 Voucher (phía người chạy)

#### `GET /vouchers`

Query: `storeId` (tuỳ chọn — màn của cửa hàng dùng để lấy voucher của chính mình).

Response `data`: `VoucherTemplate[]`
```json
[
  {
    "id": "vt-1",
    "storeId": "store-fuji",
    "storeName": "Fuji Coffee",
    "storeLatitude": 10.773,
    "storeLongitude": 106.660,
    "title": "Giảm 20% toàn menu",
    "description": "Áp dụng cho tất cả đồ uống tại Fuji Coffee",
    "priceTokens": 500,
    "discountPercent": 20,
    "questDescription": "Chạy ngang qua quán",
    "questDiscountPercent": 50,
    "totalSupply": 100,
    "remaining": 73,
    "minRank": "đồng",
    "expiresAt": "2026-12-31T23:59:59Z",
    "imageUrl": null
  }
]
```

Đề xuất trả thêm (FE sẽ bỏ qua cho tới khi được sửa để dùng):
```json
{ "myQuestEligible": true, "myPrice": 250 }
```

#### `GET /vouchers/mine`

Response `data`: `OwnedVoucher[]`
```json
[
  {
    "id": "ov-1",
    "templateId": "vt-1",
    "template": { "...": "VoucherTemplate đầy đủ" },
    "ownerId": "user-minh",
    "status": "owned",
    "purchasedAt": "2026-11-05T10:00:00Z",
    "questCompletedAt": "2026-11-04T07:30:00Z",
    "paidTokens": 250,
    "giftedFrom": null,
    "usedAt": null,
    "qrCode": "ov-1.3f9a1c..."
  }
]
```

BE phải làm: tự chuyển `status` sang `expired` khi `template.expiresAt` đã qua.

#### `POST /vouchers/buy`

Request:
```json
{ "templateId": "vt-1", "questCompleted": true }
```

Response `data`: `OwnedVoucher` vừa mua.

BE phải làm:
1. **Bỏ qua `questCompleted` FE gửi lên.** BE tự xét người này có quyền giảm giá không:
   - đã làm nhiệm vụ voucher của quán này,
   - trong vòng 7 ngày,
   - chưa dùng quyền giảm giá cho voucher này lần nào.
2. Kiểm tra lại (FE có kiểm tra nhưng không được tin):
   - hạng ≥ `minRank` → lỗi `"Chưa đủ hạng"`
   - `remaining > 0` → lỗi `"Voucher đã hết"`
   - chưa hết hạn
   - số dư đủ → lỗi `"Không đủ token"`
   - khu vực (khi có field `area`)
3. Đốt token, `remaining -= 1`, tạo `OwnedVoucher` với `status: "owned"`, sinh `qrCode`.

Giá: `Math.round(priceTokens * (1 - questDiscountPercent / 100))` nếu được giảm, ngược lại `priceTokens`.

> ⚠️ Sau khi mua, FE tự trừ số dư theo **giá FE tự tính**. Nếu giá BE khác, màn hình sẽ lệch cho tới khi tải lại.

#### `POST /vouchers/gift`

Request:
```json
{ "voucherId": "ov-1", "toUserId": "user-lan" }
```

Response `data`: `OwnedVoucher` sau khi tặng.

BE phải làm:
- Chỉ chủ sở hữu được tặng → lỗi `"Voucher không tìm thấy"`.
- `status` phải là `owned` → lỗi `"Chỉ có thể tặng voucher chưa dùng"`.
- `giftedFrom` phải là `null` → lỗi `"Voucher đã được tặng một lần rồi"`.
- Đặt `ownerId = toUserId`, `giftedFrom = <người tặng>`, `status = "gifted"`.
- Giữ nguyên hạn dùng, **không** xét lại hạng và khu vực.
- Nên sinh lại `qrCode` mới để người tặng không còn dùng được mã cũ.
- Nên cho phép `toUserId` là **email** (FE đang bắt gõ user ID).

---

### 5.5 Cửa hàng

#### `GET /store/dashboard`

Response `data`:
```json
{
  "storeId": "store-fuji",
  "storeName": "Fuji Coffee",
  "totalVouchersCreated": 100,
  "totalVouchersUsed": 47,
  "totalFeesVnd": 235000,
  "recentUsages": [
    { "voucherTitle": "Giảm 20% toàn menu", "usedAt": "2026-11-09T14:30:00Z", "userName": "Trần Minh" }
  ]
}
```

- `totalVouchersCreated` = **tổng `totalSupply`** của mọi mẫu voucher của quán (quyết định #12).
- `totalVouchersUsed` = số lượt quét QR thành công.
- `totalFeesVnd` = `totalVouchersUsed × 5000`.
- `recentUsages`: 10 lượt gần nhất, mới nhất trước.

Lỗi: `"Không phải tài khoản cửa hàng"`.

#### `POST /store/vouchers`

Request:
```json
{
  "title": "Giảm 20% toàn menu",
  "description": "Áp dụng cho tất cả đồ uống",
  "priceTokens": 500,
  "discountPercent": 20,
  "questDescription": "Chạy ngang qua quán",
  "questDiscountPercent": 50,
  "totalSupply": 100,
  "minRank": "đồng",
  "expiresAt": "2027-02-01T00:00:00.000Z"
}
```

- `questDescription` là `null` nếu không có nhiệm vụ (khi đó `questDiscountPercent = 0`).

**FE mới (commit `8c40a76`) gửi tên field khác — BE nhận cả hai (quyết định #16):**

| FE mới gửi | Tên cũ | BE xử lý |
|---|---|---|
| `questType` | `questDescription` | `questDescription = questType ?? questDescription ?? null` (chuỗi rỗng → `null`) |
| `quantity` | `totalSupply` | `totalSupply = quantity ?? totalSupply` |
| `expiryDate` (`"31/12/2026"` hoặc `""`) | `expiresAt` (ISO) | Có `expiresAt` ISO thì dùng. Có `expiryDate` dạng `dd/mm/yyyy` thì lấy **23:59:59 giờ VN** của ngày đó. Rỗng/thiếu cả hai thì **now + 90 ngày**. Sai định dạng → `"Hạn sử dụng không hợp lệ (dd/mm/yyyy)"` |

Response `data`: `VoucherTemplate` vừa tạo.

BE phải làm:
- Chỉ cửa hàng `approved = true` được tạo.
- Gán `storeId`, `storeName`, `storeLatitude`, `storeLongitude` từ tài khoản cửa hàng.
- `remaining = totalSupply`, `imageUrl = null`.
- Validate: số dương, `0 ≤ %giảm ≤ 100`, `expiresAt` ở tương lai.

#### `POST /store/scan`

Request:
```json
{ "qrCode": "ov-1.3f9a1c..." }
```

Response `data`:
```json
{ "success": true, "voucherTitle": "Giảm 20% toàn menu", "feeVnd": 5000 }
```

> ⚠️ **Gọi endpoint này là đốt voucher luôn.** Bước "Xác nhận" trên màn `scan.tsx` chỉ là hiệu ứng giao diện, không gọi API.

BE phải làm:
- Kiểm tra voucher **thuộc đúng quán đang quét**.
- `status` là `owned` hoặc `gifted` (chưa dùng), chưa hết hạn.
- Đặt `status = "used"`, `usedAt = now`.
- Ghi một lượt dùng + phí 5.000 đ; tăng `totalUsages`, `totalFeesVnd` của quán.
- Đốt voucher trên chuỗi.

Lỗi gợi ý: `"QR không hợp lệ"`, `"Voucher đã được sử dụng"`, `"Voucher không thuộc cửa hàng này"`, `"Voucher đã hết hạn"`.

---

### 5.6 Nhóm chạy (chỉ Hội viên)

Mọi endpoint nhóm: nếu `isMember = false` → trả lỗi (403), message `"Tính năng dành cho Hội viên"`.

#### `GET /groups`

Query: `userId` (tuỳ chọn — lọc các nhóm người đó đang tham gia).

Response `data`: `GroupRun[]`

BE nên lọc:
- Phạm vi hạng **hai chiều**: hạng của mình nằm trong phạm vi nhóm chọn, và hạng thành viên nằm trong phạm vi mình chọn.
- Bán kính ~3 km.
- Tỷ lệ đúng hẹn (nếu người tạo yêu cầu ≥ 80%).

#### `GET /groups/detail`

Query: `groupId` (bắt buộc).

Response `data`: `GroupRun`
```json
{
  "id": "group-1",
  "creatorId": "user-minh",
  "date": "2026-11-11",
  "timeSlot": "05:30",
  "meetingPoint": { "name": "Công viên Lê Thị Riêng", "latitude": 10.772, "longitude": 106.663 },
  "distanceKm": 5,
  "rankRange": "within1",
  "status": "open",
  "members": [
    { "userId": "user-minh", "userName": "Trần Minh", "rank": "cao_thủ", "confirmed": true, "arrived": false, "punctuality": 95 }
  ],
  "maxMembers": 6
}
```

Lỗi: `"Nhóm không tồn tại"`.

#### `POST /groups/create`

Request:
```json
{
  "date": "2026-11-11",
  "timeSlot": "05:30",
  "meetingPoint": { "name": "Công viên Lê Thị Riêng", "latitude": 10.773, "longitude": 106.660 },
  "distanceKm": 5,
  "rankRange": "within1"
}
```

- `distanceKm` FE cho chọn: `3 | 5 | 7 | 10`.

Response `data`: `GroupRun` vừa tạo.

BE phải làm:
- `timeSlot` thuộc danh sách khung giờ hợp lệ.
- Giờ xuất phát phải ở tương lai.
- `maxMembers = 6`, `status = "open"`.
- Người tạo được thêm vào `members` với `confirmed: true`.

#### `POST /groups/join`

Request:
```json
{ "groupId": "group-1" }
```

Response `data`: `GroupRun` sau khi tham gia.

BE phải làm:
- Thêm người vào với `confirmed: false`, `arrived: false`.
- Lỗi: `"Nhóm đã đầy"`, `"Bạn đã trong nhóm"`, `"Hạng của bạn không phù hợp"`, `"Bạn đang bị khoá tìm nhóm"`.

---

### 5.7 Quản trị

> **FE mới gọi thêm 3 route (quyết định #16).** BE giữ cả route cũ lẫn route mới, cùng một service.
>
> | FE mới gọi | Tương đương |
> |---|---|
> | `GET /admin/stores` → `(PendingStore & { status: 'pending' \| 'approved' \| 'rejected' })[]`, mới nhất trước | mở rộng của `/admin/pending-stores` |
> | `POST /admin/stores/<id>` body `{ "action": "approve" \| "reject" }` → `{ "success": true }` | `/admin/approve-store`. **Ngoại lệ duy nhất** của quy ước "không dùng path param" |
> | `GET /admin/season` | bí danh của `GET /admin/seasons` |

#### `GET /admin/pending-stores`

Response `data`: `PendingStore[]`
```json
[
  {
    "id": "store-pending-1",
    "email": "newcafe@demo.com",
    "storeName": "New Café Bách Khoa",
    "storeAddress": "280 Lý Thường Kiệt, P.14, Q.10",
    "latitude": 10.774,
    "longitude": 106.661,
    "appliedAt": "2026-11-08T10:00:00Z"
  }
]
```

#### `POST /admin/approve-store`

Request:
```json
{ "storeId": "store-pending-1", "approved": true }
```

- `approved: false` nghĩa là **từ chối**.

Response `data`:
```json
{ "success": true }
```

BE: duyệt → `approved = true`; từ chối → trạng thái `rejected` và bỏ khỏi danh sách chờ (mock đang giữ lại, đó là lỗi của mock).

#### `GET /admin/seasons`

Response `data`: `SeasonInfo[]`
```json
[
  { "id": "season-2026-3", "name": "Mùa 3/2026", "startDate": "2026-09-01", "endDate": "2026-12-31", "isActive": true }
]
```

#### `POST /admin/season`

Request:
```json
{ "action": "end" }
```
hoặc
```json
{ "action": "start" }
```

Response `data`: `SeasonInfo` vừa đóng / vừa mở.

BE phải làm:
- `end`: chạy **reset cuối mùa** ([Mục 6.2](#62-reset-cuối-mùa)), đặt `isActive = false`. Lỗi nếu không có mùa đang chạy: `"Không có mùa đang chạy"`.
- `start`: tự tính `name`, `startDate`, `endDate` theo lịch 3 mùa. Lỗi nếu đã có mùa đang chạy. (Mock để `endDate` rỗng — BE nên điền đầy đủ.)

---

## 6. Thuật toán BE phải tự làm

### 6.1 Xếp hạng hàng tuần

Chạy lúc **Chủ nhật 23:59 giờ Việt Nam** cho mọi runner.

```
level(km) = hạng cao nhất có ngưỡng ≤ km        # ngưỡng: 0 / 5 / 10 / 15 / 25 / 40

L      = level(km tuần này)
cur    = hạng hiện tại
streak = danh sách level các tuần liên tiếp trước đó TRONG MÙA NÀY,
         không chứa tuần được miễn                 # quyết định #6, #7

if L > cur:
    new = cur + 1                                  # lên từ từ: tối đa 1 bậc
    if len(streak) >= 2:                           # đủ 3 tuần liên tiếp: 2 tuần trước + tuần này
        new = max(new, min(streak[-2], streak[-1], L))   # lên nhanh
    streak.append(L)
elif L == cur:
    new = cur                                      # giữ hạng
    streak.append(L)
else:                                              # L < cur
    if skipWeekAvailable:                          # quyết định #5: tự dùng
        skipWeekAvailable = false
        new = cur
        streak = []                                # quyết định #6: tuần miễn làm đứt chuỗi
    else:
        new = max(cur - 1, đồng)                   # tụt 1 bậc
        streak.append(L)

seasonBadge = max(seasonBadge, new)
kmThisWeek  = 0
```

Ghi chú:
- Người đang ở **Đồng** không tụt được nữa, nên không dùng lượt miễn khi chạy thiếu.
- Lưu `streak` dưới dạng bảng `weekly_results` (cột `level_idx`, `skip_used`) và đọc lại các tuần liên tiếp của mùa hiện tại. Không cần thêm cột riêng.
- Khi sang mùa mới, `streak` bắt đầu rỗng (quyết định #7).

**Kiểm tra với ví dụ của Lan trong spec:**

| Tuần | Km | Level tuần | Hạng trước | Hạng sau | Giải thích |
|---|---|---|---|---|---|
| 1 | 42 | Cao thủ | Đồng | Bạc | lên tối đa 1 bậc |
| 2 | 45 | Cao thủ | Bạc | Vàng | chưa đủ 3 tuần |
| 3 | 41 | Cao thủ | Vàng | **Cao thủ** | min(CT, CT, CT) = CT → lên nhanh |
| 3' | 20 | Bạch kim | Vàng | **Bạch kim** | min(CT, CT, BK) = BK |
| 3'' | 12 | Vàng | Vàng | Vàng | bằng hạng hiện tại → giữ |
| 3''' | 7 | Bạc | Vàng | Bạc | thấp hơn → tụt 1 bậc |

✅ Khớp cả 6 dòng.

### 6.2 Reset cuối mùa

Khi admin gửi `{ "action": "end" }`, với mỗi runner:

0. **Chấm tuần dở dang** (từ thứ Hai gần nhất tới lúc đóng mùa) theo [6.1](#61-xếp-hạng-hàng-tuần) như một tuần bình thường (quyết định #8). Nếu vừa chấm tuần lúc Chủ nhật 23:59 thì bỏ qua bước này.
1. `tokenBalance = min(tokenBalance, mức giữ tối đa theo hạng hiện tại)` — phần dư **đốt trên chuỗi**.
2. Mint **huy hiệu mùa** (NFT không chuyển được) với `seasonBadge` (hạng cao nhất mùa).
3. `rank = max(rank - 2, đồng)`.
4. `skipWeekAvailable = true`, `seasonBadge = null`.
5. Voucher đã mua **giữ nguyên**.
6. Áp dụng như nhau cho Hội viên.
7. Nhóm chạy đã lên lịch **không bị huỷ** (quyết định #14).

**Kiểm tra với demo bước 8:** Cao thủ, 1.000 token → giữ 500 token, xuống Bạch kim. ✅
Nếu chỉ có 300 token → giữ nguyên 300. ✅

Ngoài ra: **7 ngày trước khi hết mùa** gửi thông báo nhắc tiêu token.

### 6.3 Nhiệm vụ ngày và tuần

| | Nhiệm vụ ngày | Nhiệm vụ tuần |
|---|---|---|
| Sinh lúc | đầu mỗi ngày (hoặc lần đầu `GET /quests` trong ngày) | đầu mỗi tuần (thứ Hai 00:00 giờ VN) |
| Mục tiêu | 2 km, **cộng dồn** mọi buổi chạy trong ngày (#1) | `max(5, ceil(TB km 4 tuần gần nhất × 1,1))` (#2, #3, #4) |
| Thưởng | 10 token | 7 × **km mục tiêu** (#3) |
| Hết hạn | 23:59 cùng ngày | Chủ nhật 23:59 |
| Chấm | trong `/runs/end` | trong `/runs/end` |

```
weeklyTarget(last4WeeksKm) =
    max(5, ceil(avg(last4WeeksKm) × 1.1))     # last4WeeksKm vắt qua mùa được; thiếu tuần thì tính 0
weeklyReward(target) = 7 × target
```

Ví dụ:
- TB 4 tuần 13,6 km → 13,6 × 1,1 = 14,96 → mục tiêu **15 km** → thưởng **105 token** (khớp ví dụ trong spec).
- Người mới (chưa có tuần nào) → mục tiêu **5 km** → thưởng **35 token**.
- Minh, TB 40 km → mục tiêu **44 km** → thưởng **308 token** (khớp mock).

Chọn "thiếu tuần thì tính 0" để người mới không nhận ngay mục tiêu quá cao chỉ vì một tuần chạy nhiều. Có mức sàn 5 km nên mục tiêu không bị quá thấp.

Chạy nhóm vẫn tính km như chạy một mình. Chạy nhóm và nhiệm vụ voucher **không** cho thêm token.

### 6.4 Nhiệm vụ voucher "Chạy ngang qua quán"

```
passedStores = []
for store in các quán có voucher đang bán kèm nhiệm vụ:
    if tồn tại điểm p trong route mà haversine(p, store) < 50 m:
        passedStores.append(store)
```

- **Mỗi buổi chạy chỉ nhận giảm giá cho 1 quán.** Đi qua nhiều quán → người chạy chọn 1.
- Ghi nhận `voucher_quest_claim(userId, storeId, runId, claimedAt)`.
- Quyền giảm giá có hiệu lực **7 ngày** kể từ `claimedAt`.
- Mỗi người chỉ được giảm **1 lần cho mỗi mẫu voucher** (`templateId`) (quyết định #10). Nếu quán có 2 mẫu voucher, một lần chạy ngang quán dùng được cho **một** trong hai mẫu. Lần sau chạy ngang quán thì dùng được cho mẫu còn lại.
- Cửa hàng không phải làm gì.

Ví dụ trong spec: voucher giá 500 token, nhiệm vụ giảm 50% → làm xong chỉ trả 250 token.

### 6.5 Vòng đời voucher

```
[Đang bán] --mua (đốt token)--> [owned] --tặng 1 lần--> [gifted]
                                   |                       |
                                   +------quét QR----------+--> [used]  (đốt voucher, ghi phí 5.000đ)
                                   |                       |
                                   +------quá hạn----------+--> [expired] (không hoàn token)
```

- Điều kiện hạng và khu vực **chỉ xét lúc mua**.
- Voucher mua mà không dùng → cửa hàng không phải trả phí.

### 6.6 Nhóm chạy — các mốc thời gian

Tính từ giờ xuất phát `T`:

| Thời điểm | Việc BE phải làm |
|---|---|
| T − 2h | Hạn xác nhận. Dưới 2 người xác nhận → `status = "cancelled"` (áp dụng cho **cả** nhóm tự lập lẫn ghép tự động, quyết định #11). Đủ 2 → `status = "confirmed"`. Huỷ trước mốc này không bị tính vắng. |
| T − 1h | Gửi nhắc lần 1, kèm thời gian cần để tới điểm hội tụ. |
| T − 30' | Bật chia sẻ vị trí; bản đồ hiện từng người và giờ dự kiến tới. |
| T − 10' | Gửi nhắc lần 2 cho ai chưa di chuyển. |
| T | Ai trong 50 m quanh điểm hội tụ → `arrived = true`. Nhóm chờ tối đa 10 phút. |
| T + 10' | `status = "in_progress"`. Người tới muộn vẫn chạy và được tính km nhưng không có huy hiệu chạy chung. Ai không tới → ghi **vắng**. |
| Kết thúc | Ai chạy hết vòng cùng nhóm → huy hiệu "chạy chung". **Ngừng chia sẻ vị trí ngay.** `status = "completed"`. |

**Độ đúng hẹn:**
- `punctuality = số lần tới đúng giờ / số nhóm đã xác nhận tham gia × 100`.
- Vắng **2 lần không báo** trong một mùa → khoá tìm nhóm 1 tuần.
- Người tự lập nhóm có thể chỉ nhận người có `punctuality ≥ 80`.

**Phạm vi hạng (hai chiều):**

| `rankRange` | Chênh lệch hạng tối đa |
|---|---|
| `same` | 0 |
| `within1` | 1 |
| `within2` | 2 |
| `any` | không giới hạn |

A và B vào chung nhóm được khi `|rank(A) − rank(B)| ≤ range(A)` **và** `≤ range(B)`.

**Ghép tự động:** chọn ngày, một hoặc vài khung giờ, quãng đường, phạm vi hạng → gom 3–6 người trong bán kính ~3 km, trùng khung giờ → chọn điểm hội tụ có sẵn (công viên, cửa hàng đối tác) ở giữa nhóm.

---

## 7. Chỗ FE lệch hoặc thiếu so với spec

| # | Vấn đề | File | Hậu quả với BE | Đề xuất |
|---|---|---|---|---|
| 1 | Chỉ so đường chạy với **1 quán cố định** (`MOCK_STORE`); cứ chạy ≥ 0,1 km là tự đánh dấu đã qua quán đó. | `app/(runner)/(tabs)/run.tsx:116-127` | `passedStoreIds` FE gửi lên sai. | BE tự tính từ `route`. |
| 2 | Không có màn **chọn 1 quán** khi đi qua nhiều quán. | `run.tsx` | | BE thêm `POST /runs/claim-store`. Tạm thời: đi qua đúng 1 quán thì BE tự nhận. |
| 3 | FE tự quyết có được giảm giá bằng cách xét **mọi buổi chạy từ trước tới nay**, không có hạn 7 ngày, không có giới hạn 1 lần. | `app/(runner)/voucher/[id].tsx:41-43`, `(tabs)/vouchers.tsx:17` | Giá FE hiển thị có thể khác giá BE trừ thật. | BE trả thêm `myQuestEligible`, `myPrice`; FE dùng các field này. |
| 4 | Mọi điểm trong `route` có **cùng 1 timestamp** (gán lúc bấm kết thúc). | `run.tsx:130-134` | Không chống gian lận được (không kiểm tra tốc độ). | FE lưu timestamp thật cho từng điểm GPS. |
| 5 | FE tự gọi `/quests/complete` và tự cộng token vào màn hình. | `run.tsx:139-146`, `stores/runner.ts` | Cộng token 2 lần trên màn hình. | BE làm endpoint idempotent; FE gọi `/auth/me` sau buổi chạy. |
| 6 | Sau khi mua voucher, FE tự trừ số dư theo giá FE tính. | `voucher/[id].tsx:68` | Lệch số dư hiển thị. | FE dùng `paidTokens` trả về hoặc gọi `/auth/me`. |
| 7 | Hardcode `seasonDaysLeft = 45` và chữ "Mùa 3/2026". | `(tabs)/index.tsx:35,68` | | BE thêm `GET /seasons/current`. |
| 8 | Huy hiệu các mùa trước là dữ liệu mock. | `app/(runner)/badges.tsx:25` | | BE thêm `GET /me/badges`. |
| 9 | Tặng voucher bằng cách **gõ user ID**; nút chọn nhanh hardcode `user-minh`. | `voucher/[id].tsx:257-263` | | BE nhận thêm email; FE đổi sang ô nhập email. |
| 10 | Nhóm chạy thiếu API: xác nhận, huỷ (nút "Huỷ" chỉ quay lại màn trước), ghép tự động, chia sẻ vị trí, check-in. | `app/(runner)/groups/*` | Spec đánh dấu **bắt buộc MVP**. | Làm cả BE và FE ([Mục 8](#8-endpoint-nên-thêm)). |
| 11 | Điểm hội tụ hardcode toạ độ HCMUT; `date` luôn là hôm nay. | `groups/create.tsx:56-62` | | FE thêm bản đồ chọn điểm và chọn ngày. |
| 12 | Form tạo voucher có ô "khu vực" nhưng **không gửi**; type cũng không có `area`. | `(store)/vouchers/create.tsx` | Không lọc theo khu vực được. | Thêm `area` (mã quận/huyện) vào type và request. Đổi ô nhập chữ thành **danh sách chọn**. BE trả danh sách qua `GET /areas`. Người chạy lấy khu vực từ quận/huyện nơi ở khai báo trong hồ sơ. |
| 13 | `GET /vouchers` không gửi toạ độ người dùng. | `stores/voucher.ts` | Không làm được "voucher gần mình". | FE gửi `lat`, `lng`; BE sắp xếp theo khoảng cách. |
| 14 | Không có API bảng xếp hạng, thông báo, cấu hình nhiệm vụ/hạng. | | Spec xếp vào "Nên có". | Làm sau. |

---

## 8. Endpoint nên thêm

Các endpoint FE chưa gọi, nhưng spec cần hoặc giúp sửa các lệch ở Mục 7.

| Method | Endpoint | Request | Response `data` | Mục đích |
|---|---|---|---|---|
| GET | `/seasons/current` | — | `SeasonInfo & { daysLeft: number }` | Banner mùa trên màn hình chính |
| GET | `/me/badges` | — | `{ seasonId, seasonName, highestRank, txHash }[]` | Màn huy hiệu |
| POST | `/runs/claim-store` | `{ runId, storeId }` | `{ storeId, claimedAt, expiresAt }` | Chọn 1 quán nhận giảm giá |
| GET | `/runs/passed-stores` | `?runId=` | `{ storeId, storeName }[]` | Danh sách quán đã đi qua để chọn |
| POST | `/groups/confirm` | `{ groupId }` | `GroupRun` | Xác nhận tham gia (trước T − 2h) |
| POST | `/groups/leave` | `{ groupId }` | `{ success }` | Huỷ tham gia |
| POST | `/groups/auto-match` | `{ date, timeSlots[], distanceKm, rankRange, latitude, longitude }` | `{ requestId, status }` | Ghép tự động |
| POST | `/groups/location` | `{ groupId, latitude, longitude }` | `{ success }` | Gửi vị trí (từ T − 30') |
| GET | `/groups/locations` | `?groupId=` | `{ userId, latitude, longitude, etaMinutes, updatedAt }[]` | Bản đồ thành viên (poll mỗi 5–10s hoặc WebSocket) |
| GET | `/areas` | — | `{ code, name }[]` | Danh sách quận/huyện cố định cho voucher và bảng xếp hạng |
| GET | `/leaderboard` | `?area=` | `{ userId, name, rank, kmThisWeek }[]` | Bảng xếp hạng khu vực |
| GET | `/notifications` | — | `{ id, type, title, body, createdAt, read }[]` | Thông báo |
| POST | `/admin/run-weekly-ranking` | — | `{ processed }` | Kích hoạt xếp hạng tuần thủ công khi demo |

---

### 8.1 Đã hiện thực (12/11/2026)

Tất cả endpoint ở bảng trên **đã có** trừ `/leaderboard?area=` lọc theo khu vực (chưa có dữ liệu khu vực của người chạy). Hình dạng thực tế và các endpoint thêm:

| Method | Endpoint | Response `data` | Ghi chú |
|---|---|---|---|
| POST | `/runs/end` | `Run` + `claimedStoreId: string \| null` | Qua đúng 1 quán → tự nhận, `claimedStoreId` có giá trị |
| GET | `/runs/passed-stores?runId=` | `{ storeId, storeName, latitude, longitude, claimed }[]` | |
| POST | `/runs/claim-store` | `{ storeId, claimedAt, expiresAt }` | Gọi lặp cùng quán → trả lại; quán khác → `"Buổi chạy này đã nhận giảm giá cho một quán khác"` |
| GET | `/vouchers?storeId=&lat=&lng=` | `VoucherTemplate` + `myQuestEligible`, `myPrice`, `distanceM`, `area`, `chainTokenId` | Có `lat,lng` thì sắp theo khoảng cách |
| GET | `/seasons/current` | `SeasonInfo & { daysLeft }` hoặc `null` | |
| GET | `/me/badges` | `{ seasonId, seasonName, highestRank, txHash, current }[]` | `current: true` = huy hiệu tạm của mùa đang chạy |
| GET | `/me/wallet` | `{ address, explorerUrl, chain, tokenBalance, transactions[] }` | Mở Snowtrace khi demo |
| GET/POST | `/groups/auto-match` | `{ requestId, status, groupId }` | POST body như bảng trên; GET = yêu cầu gần nhất |
| GET | `/groups/meeting-points` | `{ name, latitude, longitude, type: 'public' \| 'store' }[]` | Điểm hội tụ có sẵn |
| POST | `/groups/location` | `{ success, arrived }` | Chỉ từ T−30' tới khi kết thúc |
| GET | `/groups/locations?groupId=` | `{ userId, userName, latitude, longitude, etaMinutes, arrived, updatedAt }[]` | |
| GET | `/groups`, `/groups/detail` | `GroupRun` + `startsAt`, `milestone`, `minPunctuality`, `autoMatched` | |
| POST | `/notifications/read` | `{ success }` | body `{ ids? }`, thiếu = đọc hết |
| GET | `/areas` | `{ code, name }[]` | Quận/huyện TP.HCM |
| POST | `/admin/run-weekly-ranking` · `/admin/run-group-timeline` · `/admin/run-membership-expiry` · `/admin/process-chain-outbox` | `{ processed, ... }` | Kích hoạt job bằng tay khi demo |
| GET/POST | `/admin/clock` | `{ now, offsetMs }` | POST `{ now: ISO }` hoặc `{ offsetMs }`. Chỉ khi `ALLOW_CLOCK_OVERRIDE=true` |
| GET | `/admin/chain-txs` | 50 lệnh chain gần nhất kèm `txHash`, `explorerUrl` | |

### 8.2 Hồ sơ quán (thêm 18/11/2026 — FE + mock + BE xong)

Trang "Giới thiệu quán" cho người chạy đọc trước khi mua voucher, và trang "Hồ sơ quán" để chủ quán tự viết. Kiểu `StoreProfile` nằm trong `kilomeet-app/src/api/types.ts`:

```ts
interface StoreProfile {
  storeId: string; storeName: string;
  tagline: string;        // ≤ 60 ký tự, hiện trên thẻ quán
  description: string;    // ≤ 500 ký tự
  address: string; latitude: number; longitude: number;   // chỉ đọc, lấy từ Store
  coverTheme: 'coffee' | 'tea' | 'gym';                    // ảnh bìa minh hoạ
  tags: string[];                                          // ≤ 6
  openingHours: { label: string; open: 'HH:mm'; close: 'HH:mm'; enabled: boolean }[];
  highlights: { name: string; priceVnd: number }[];        // ≤ 3
  phone: string;
  verified: boolean; totalUsages: number; runnerSharePercent: number;  // chỉ đọc, BE tính
}
```

| Method | Endpoint | Ai gọi | Request | Response `data` |
|---|---|---|---|---|
| GET | `/stores/profile?storeId=` | Người chạy (mọi vai trò đã đăng nhập) | — | `StoreProfile` |
| GET | `/store/profile` | Tài khoản cửa hàng | — | `StoreProfile` của chính quán |
| POST | `/store/profile` | Tài khoản cửa hàng | `Pick<StoreProfile, 'storeName' \| 'tagline' \| 'description' \| 'coverTheme' \| 'tags' \| 'openingHours' \| 'highlights' \| 'phone'>` | `StoreProfile` sau khi lưu |

- Quán chưa có hồ sơ: trả hồ sơ mặc định (`tagline`, `description` rỗng, `coverTheme: 'coffee'`, `openingHours` 3 dòng T2–T6 / Thứ 7 / Chủ nhật), **không** trả 404.
- `runnerSharePercent` = % lượt dùng voucher của quán có `questCompletedAt` khác `null`. `totalUsages` = số lượt quét QR.
- Không cho đổi toạ độ qua endpoint này (đổi vị trí cần quản trị duyệt lại).
- Lỗi: `"Không tìm thấy cửa hàng"`, `"Không phải tài khoản cửa hàng"`, `"Câu giới thiệu ngắn tối đa 60 ký tự"`, `"Giới thiệu chi tiết tối đa 500 ký tự"`, `"Giờ mở cửa phải theo dạng HH:mm"`.
- Khi BE chưa có `/stores/profile`, FE dựng hồ sơ tối thiểu từ `VoucherTemplate` nên màn vẫn hiện (`src/lib/storeProfile.ts`).
- `POST /store/profile` **chỉ cập nhật field được gửi** (gửi một phần cũng được). Field chỉ đọc (`address`, `latitude`, `longitude`, `verified`, `totalUsages`, `runnerSharePercent`) gửi lên thì bị bỏ qua. Đổi `storeName` thì tên mới hiện luôn ở `/vouchers`.
- Quán chưa duyệt: chủ quán vẫn xem/sửa hồ sơ của mình; người chạy gọi `/stores/profile` thì nhận `"Không tìm thấy cửa hàng"`.
- `tags` trùng thì gộp lại. Giới hạn: `tags` ≤ 6, `highlights` ≤ 3, `openingHours` ≤ 7 dòng.
- Lỗi thêm (BE, 18/11): `"Thiếu storeId"`, `"Vui lòng nhập tên quán"`, `"Ảnh bìa không hợp lệ"`, `"Chọn tối đa 6 thẻ tiện ích"`, `"Tối đa 3 món nổi bật"`, `"Giá món phải là số nguyên không âm"`, `"Số điện thoại không hợp lệ"`.
- BE: cột hồ sơ nằm trên bảng `stores` (migration `store_profile`), code ở `kilomeet-api/src/modules/store/profile.ts`, hàm thuần ở `src/domain/store-profile.ts`.

---

## 9. Phần Avalanche

FE có cài `ethers` nhưng **không dùng ở đâu cả** → ví do **server quản lý** (custodial).

| Hợp đồng | Chuẩn | BE làm gì | MVP |
|---|---|---|---|
| RunToken | ERC-20 | BE giữ quyền minter/burner. Mint khi hoàn thành nhiệm vụ, burn khi mua voucher và khi reset mùa. **Không có transfer** giữa người dùng. Đặt `decimals = 0` cho khớp số nguyên ở FE. | Bắt buộc |
| Voucher | ERC-1155 | Mỗi `VoucherTemplate` là 1 `tokenId`. Mua = mint cho người mua; tặng = BE chuyển với tư cách operator (chỉ 1 lần); quét QR = burn — sự kiện burn là căn cứ tính phí. | Bắt buộc |
| Huy hiệu mùa | NFT không chuyển được (soulbound) | Mint khi đóng mùa. | Nên có |

Ghi chú:
- Người dùng **không tự ký** giao dịch → **không cần** chuyển AVAX thử nghiệm vào từng ví mới như spec viết. Chỉ cần nạp AVAX cho ví server trên Fuji.
- Gọi chuỗi chậm → **ghi DB trước**, đưa giao dịch vào hàng đợi, lưu `txHash` để mở Snowtrace khi demo.
- Ví người dùng: sinh keypair khi đăng ký, lưu private key **đã mã hoá**, hoặc chỉ cần địa chỉ (vì server là operator).

---

## 10. Gợi ý lược đồ cơ sở dữ liệu

```
users              (id, email, password_hash, name, role, wallet_address, wallet_key_enc, created_at)
runner_profiles    (user_id, rank_idx, token_balance, km_this_week, is_member, member_until, area,
                    punctuality, season_badge_idx, skip_week_available, group_ban_until, no_show_count)
stores             (user_id, store_name, store_address, lat, lng, status[pending|approved|rejected],
                    applied_at, total_usages, total_fees_vnd)
seasons            (id, name, start_date, end_date, is_active)
weekly_results     (user_id, season_id, week_start, km, level_idx, rank_before, rank_after, skip_used)
runs               (id, user_id, distance_km, duration_min, avg_pace, route_json, started_at, ended_at)
run_passed_stores  (run_id, store_id)
quests             (id, user_id, type, period_key, target_km, progress_km, reward_tokens, status,
                    expires_at, completed_at, tx_hash)
voucher_templates  (id, store_id, title, description, price_tokens, discount_percent,
                    quest_description, quest_discount_percent, total_supply, remaining,
                    min_rank_idx, area, expires_at, image_url, chain_token_id)
voucher_quest_claims (id, user_id, store_id, run_id, claimed_at, used_for_template_id)
owned_vouchers     (id, template_id, owner_id, status, purchased_at, quest_completed_at,
                    paid_tokens, gifted_from, used_at, qr_code, tx_hash)
voucher_usages     (id, owned_voucher_id, store_id, used_at, fee_vnd, tx_hash)
groups             (id, creator_id, date, time_slot, meeting_name, meeting_lat, meeting_lng,
                    distance_km, rank_range, min_punctuality, status, max_members)
group_members      (group_id, user_id, rank_range, confirmed, arrived, arrived_at, absent,
                    completed_with_group)
group_locations    (group_id, user_id, lat, lng, updated_at)
season_badges      (user_id, season_id, highest_rank_idx, tx_hash)
token_ledger       (id, user_id, delta, reason[quest|buy|season_reset], ref_id, tx_hash, created_at)
```

`token_ledger` giúp đối chiếu số dư DB với số dư on-chain.

---

## 11. Quyết định cho các điểm spec chưa rõ

> ✅ **Đã chốt ngày 11/11/2026** (#1–14) và **12/11/2026** (#15–16): duyệt toàn bộ theo gợi ý. Các mục khác trong tài liệu đã được cập nhật cho khớp.
> Muốn đổi quyết định nào thì sửa ở bảng này **và** ở mục được dẫn trong cột "Áp dụng ở".

| # | Câu hỏi | Quyết định | Áp dụng ở |
|---|---|---|---|
| 1 | Nhiệm vụ ngày 2 km tính trong 1 buổi hay cộng dồn cả ngày? | **Cộng dồn** km mọi buổi chạy trong ngày (giờ VN) | [6.3](#63-nhiệm-vụ-ngày-và-tuần) |
| 2 | Nhiệm vụ tuần với người mới chưa có lịch sử? | **Mức sàn 5 km**: mục tiêu không bao giờ dưới 5 km | [6.3](#63-nhiệm-vụ-ngày-và-tuần) |
| 3 | Mục tiêu tuần làm tròn thế nào? Thưởng theo mục tiêu hay km thực? | **Làm tròn lên số nguyên**; thưởng = 7 × **km mục tiêu** | [6.3](#63-nhiệm-vụ-ngày-và-tuần) |
| 4 | TB 4 tuần có tính vắt qua hai mùa không? | **Có**, luôn lấy 4 tuần gần nhất | [6.3](#63-nhiệm-vụ-ngày-và-tuần) |
| 5 | Lượt miễn kiểm tra 1 tuần: tự dùng hay người chạy chọn? | **Tự dùng** ở lần đầu tiên bị tụt hạng trong mùa | [6.1](#61-xếp-hạng-hàng-tuần) |
| 6 | Tuần được miễn có làm đứt chuỗi 3 tuần để lên nhanh không? | **Có**, chuỗi bắt đầu đếm lại từ tuần sau | [6.1](#61-xếp-hạng-hàng-tuần) |
| 7 | Chuỗi 3 tuần có tính vắt qua hai mùa không? | **Không**, chuỗi bắt đầu lại khi sang mùa mới | [6.1](#61-xếp-hạng-hàng-tuần) |
| 8 | Tuần dở dang cuối mùa xử lý thế nào? | **Chấm tuần dở dang** (theo luật xếp hạng thường) ngay trước khi reset | [6.2](#62-reset-cuối-mùa) |
| 9 | "Khu vực" của voucher là gì? | **Quận/huyện**, chọn từ danh sách cố định | [3.4](#34-voucher), [7](#7-chỗ-fe-lệch-hoặc-thiếu-so-với-spec) |
| 10 | "Giảm giá 1 lần cho mỗi voucher": mỗi mẫu hay mỗi quán? | **Mỗi mẫu voucher** (`templateId`) | [6.4](#64-nhiệm-vụ-voucher-chạy-ngang-qua-quán) |
| 11 | Ngưỡng huỷ nhóm ở T − 2h có khác giữa tự lập và ghép tự động? | **Cùng ngưỡng 2** người xác nhận | [6.6](#66-nhóm-chạy--các-mốc-thời-gian) |
| 12 | `totalVouchersCreated` là số mẫu hay tổng số lượng? | **Tổng số lượng phát hành** (tổng `totalSupply`) | [5.5](#55-cửa-hàng) |
| 13 | Gói Hội viên hết hạn có tự quay về `runner`? | **Có**. Môi trường demo đặt hạn dài | [5.1](#51-auth) |
| 14 | Hết mùa có huỷ nhóm chạy đã lên lịch không? | **Không** | [6.2](#62-reset-cuối-mùa) |
| 15 | Stack BE? *(chốt 12/11)* | Node 24 + TypeScript, Fastify, Prisma + PostgreSQL (Docker), Zod 4, Vitest, node-cron, Hardhat + OpenZeppelin + ethers v6 | `CLAUDE.md` Mục 3 |
| 16 | FE mới đổi hợp đồng ở 4 chỗ (A–D)? *(chốt 12/11)* | **BE chiều theo FE**: thêm `GET /admin/stores`, `POST /admin/stores/<id>`, `GET /admin/season`; `/store/vouchers` nhận cả tên field mới (`questType`, `quantity`, `expiryDate`) lẫn cũ. Route cũ giữ làm bí danh | [5.5](#55-cửa-hàng), [5.7](#57-quản-trị) |

**Các điểm dưới đây Claude tạm chốt khi code (12/11), chờ bạn duyệt.** Muốn đổi thì sửa ở bảng này và ở hàm được dẫn.

| # | Câu hỏi | Tạm chốt | Code |
|---|---|---|---|
| 17 | Nhóm lập sau mốc T−2h thì hạn xác nhận là khi nào? | Dời tới **T−30'** | `groups/service.ts` `lateCreated` |
| 18 | Tới hạn xác nhận mà thành viên chưa xác nhận? | Bị **rút khỏi nhóm**, không tính vắng. Vào nhóm đã chốt thì tự xác nhận | `evaluateConfirm`, `joinGroup` |
| 19 | Rời nhóm sau hạn xác nhận? | Vẫn rời được nhưng **bị ghi vắng** | `leaveGroup` |
| 20 | "Đúng hẹn" là gì? | Có mặt trong 50 m quanh điểm hội tụ **trước T+10'**. `punctuality = đúng hẹn / số nhóm đã xác nhận` | `applyMilestone('T+10m')` |
| 21 | Khi nào nhóm "kết thúc" để ngừng chia sẻ vị trí? | **T + 10' + 10 phút/km** | `domain/group.ts` `groupEndsAt` |
| 22 | Ghép tự động: điều kiện? | Khung giờ cách hiện tại ≥ 2h, **cùng quãng đường**, trong 3 km quanh người gửi, hạng hợp từng đôi, người đăng ký sớm trước; điểm hội tụ có sẵn gần tâm nhóm nhất | `domain/group.ts` `autoMatch` |
| 23 | Ai được mint huy hiệu mùa? | Chỉ khi hạng cao nhất mùa **> Đồng** | `seasons/service.ts` `endSeason` |
| 24 | Buổi chạy thuộc ngày nào (nhiệm vụ ngày)? | Theo **giờ kết thúc** (giờ VN) | `quests/service.ts` `kmToday` |
| 25 | Chống gian lận km? | Bỏ đoạn GPS có vận tốc **> 25 km/h** (khi có timestamp) | `domain/geo.ts` `routeDistanceKm` |
| 26 | `GET /runs?userId=` của người khác? | **Bỏ qua** tham số, chỉ trả lịch sử của chính mình | `runs/routes.ts` |
| 27 | Hạn voucher khi FE gửi `dd/mm/yyyy` | 23:59:59.999 giờ VN ngày đó | `domain/pricing.ts` `parseExpiryInput` |

---

## 12. Thứ tự làm theo kịch bản demo

| Bước | Việc BE | Demo bước | Cần FE sửa song song |
|---|---|---|---|
| 1 | Auth (`login`, `register`, `me`), JWT, envelope response, tạo ví | 1 | `setBaseUrl`, header `Authorization`, lưu token |
| 2 | `/runs/*`, `/quests/*`, chấm nhiệm vụ, phát token, cộng km | 2–3 | Gọi `/auth/me` sau buổi chạy; timestamp thật cho GPS |
| 3 | Voucher: danh sách, mua, tặng, của tôi; logic chạy ngang quán | 4–5 | Dùng `myPrice`; ô tặng bằng email |
| 4 | Quét QR, dashboard cửa hàng | 6 | Đăng ký cửa hàng gửi role + thông tin quán |
| 5 | Duyệt quán, đóng/mở mùa có reset, `/seasons/current` | 8 | Banner mùa đọc từ API |
| 6 | Nhóm chạy: confirm, leave, auto-match, location, job theo mốc giờ, check-in, đúng hẹn | 7 | Màn xác nhận, bản đồ thành viên, chọn điểm hội tụ |
| 7 | Job xếp hạng tuần (CN 23:59 giờ VN) + endpoint admin kích hoạt thủ công | 3 | — |
| 8 | Smart contract trên Fuji, hàng đợi giao dịch, lưu `txHash` | 1–8 | — |

### Tài khoản demo cần seed

| Email | Mật khẩu | Vai trò | Trạng thái |
|---|---|---|---|
| `lan@demo.com` | `demo123` | runner | Đồng, 0 token |
| `minh@demo.com` | `demo123` | member | Cao thủ, 1.000 token, 42 km tuần này, 24 buổi chạy |
| `quanfuji@demo.com` | `demo123` | store | Fuji Coffee, đã duyệt, toạ độ 10.773, 106.660 (gần HCMUT) |
| `admin@demo.com` | `demo123` | admin | — |

Cần thêm 1–2 tài khoản member gần nhau để demo ghép nhóm (bước 7), và ít nhất 2 quán gần HCMUT có nhiệm vụ "chạy ngang qua quán" để demo bước 4.
