// KILOMeet — Domain Types

// ─── Enums & Constants ──────────────────────────────────────────

export const RANKS = ['đồng', 'bạc', 'vàng', 'bạch_kim', 'kim_cương', 'cao_thủ'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_INDEX: Record<Rank, number> = {
  đồng: 0, bạc: 1, vàng: 2, bạch_kim: 3, kim_cương: 4, cao_thủ: 5,
};

/** km/week threshold to reach each rank */
export const RANK_KM_THRESHOLD: Record<Rank, number> = {
  đồng: 0, bạc: 5, vàng: 10, bạch_kim: 15, kim_cương: 25, cao_thủ: 40,
};

/** Max tokens retained at end-of-season per rank */
export const RANK_TOKEN_RETENTION: Record<Rank, number> = {
  đồng: 0, bạc: 100, vàng: 200, bạch_kim: 300, kim_cương: 400, cao_thủ: 500,
};

export const DAILY_QUEST_KM = 2;
export const DAILY_QUEST_REWARD = 10;
export const WEEKLY_QUEST_TOKEN_PER_KM = 7;
export const MEMBERSHIP_VND = 39_000;
export const VOUCHER_USE_FEE_VND = 5_000;
export const STORE_PROXIMITY_M = 50;

export const GROUP_TIME_SLOTS = [
  '05:00', '05:30', '06:00', '06:30', '07:00',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
] as const;

export const GROUP_SIZE = { min: 2, max: 6 } as const;

// ─── User & Auth ────────────────────────────────────────────────

export type UserRole = 'runner' | 'member' | 'store' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  createdAt: string;
}

export interface Runner extends User {
  role: 'runner' | 'member';
  rank: Rank;
  tokenBalance: number;
  kmThisWeek: number;
  /** Whether the user has a paid membership */
  isMember: boolean;
  /** Punctuality percentage for group runs (members only) */
  punctuality: number;
  /** Season badge: highest rank achieved this season */
  seasonBadge: Rank | null;
  /** One free skip-week per season; false = already used */
  skipWeekAvailable: boolean;
}

export interface Store extends User {
  role: 'store';
  storeName: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
  approved: boolean;
  /** Total voucher usages at this store */
  totalUsages: number;
  /** Total fees owed (usages * 5000 VND) */
  totalFeesVnd: number;
}

export interface Admin extends User {
  role: 'admin';
}

export type AnyUser = Runner | Store | Admin;

export interface AuthResponse {
  user: AnyUser;
  token: string;
}

// ─── Runs ───────────────────────────────────────────────────────

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface Run {
  id: string;
  userId: string;
  distanceKm: number;
  durationMinutes: number;
  avgPaceMinPerKm: number;
  route: GpsPoint[];
  startedAt: string;
  endedAt: string;
  /** Store IDs the route passed within 50m of */
  passedStoreIds: string[];
}

// ─── Quests ─────────────────────────────────────────────────────

export type QuestType = 'daily' | 'weekly';
export type QuestStatus = 'active' | 'completed' | 'expired';

export interface Quest {
  id: string;
  userId: string;
  type: QuestType;
  targetKm: number;
  progressKm: number;
  rewardTokens: number;
  status: QuestStatus;
  /** ISO date string */
  expiresAt: string;
  completedAt: string | null;
}

// ─── Vouchers ───────────────────────────────────────────────────

export type VoucherStatus = 'available' | 'owned' | 'gifted' | 'used' | 'expired';

export interface VoucherTemplate {
  id: string;
  storeId: string;
  storeName: string;
  storeLatitude: number;
  storeLongitude: number;
  title: string;
  description: string;
  /** Base price in tokens */
  priceTokens: number;
  /** Discount percentage (e.g. 20 = 20% off purchase) */
  discountPercent: number;
  /** Voucher quest: e.g. "run past store" */
  questDescription: string | null;
  /** Discount on token price for completing voucher quest (e.g. 50 = pay half) */
  questDiscountPercent: number;
  /** Total supply */
  totalSupply: number;
  /** Remaining available */
  remaining: number;
  /** Minimum rank to buy */
  minRank: Rank;
  expiresAt: string;
  imageUrl: string | null;
  /** BE trả thêm: người đang đăng nhập có quyền giảm giá nhiệm vụ không (7 ngày, 1 lần/mẫu) */
  myQuestEligible?: boolean;
  /** BE trả thêm: giá thực sẽ trả nếu mua bây giờ */
  myPrice?: number;
}

export interface OwnedVoucher {
  id: string;
  templateId: string;
  template: VoucherTemplate;
  ownerId: string;
  status: VoucherStatus;
  purchasedAt: string;
  /** Set if voucher quest was completed — 7-day window for discounted buy */
  questCompletedAt: string | null;
  /** Price actually paid */
  paidTokens: number;
  /** If gifted, original buyer */
  giftedFrom: string | null;
  usedAt: string | null;
  /** QR code data for store to scan */
  qrCode: string;
}

// ─── Groups ─────────────────────────────────────────────────────

export type RankRange = 'same' | 'within1' | 'within2' | 'any';
export type GroupStatus = 'open' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface GroupMember {
  userId: string;
  userName: string;
  rank: Rank;
  confirmed: boolean;
  arrived: boolean;
  punctuality: number;
}

export interface GroupRun {
  id: string;
  creatorId: string;
  date: string;
  timeSlot: (typeof GROUP_TIME_SLOTS)[number];
  meetingPoint: {
    name: string;
    latitude: number;
    longitude: number;
  };
  distanceKm: number;
  rankRange: RankRange;
  status: GroupStatus;
  members: GroupMember[];
  maxMembers: number;
  /** BE trả thêm: giờ xuất phát tuyệt đối (ISO) */
  startsAt?: string;
  /** BE trả thêm: mốc đã xử lý gần nhất ('' | 'T-2h' | 'T-1h' | 'T-30m' | 'T-10m' | 'T' | 'T+10m' | 'end') */
  milestone?: string;
}

// ─── Store Dashboard ────────────────────────────────────────────

export interface StoreDashboard {
  storeId: string;
  storeName: string;
  totalVouchersCreated: number;
  totalVouchersUsed: number;
  totalFeesVnd: number;
  recentUsages: {
    voucherTitle: string;
    usedAt: string;
    userName: string;
  }[];
}

// ─── Admin ──────────────────────────────────────────────────────

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface PendingStore {
  id: string;
  email: string;
  storeName: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
  appliedAt: string;
}

// ─── API Response Wrappers ──────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ─── Store profile (trang giới thiệu quán) ──────────────────────

export type StoreCoverTheme = 'coffee' | 'tea' | 'gym';

export interface StoreOpeningHours {
  /** Nhãn nhóm ngày, ví dụ "T2 – T6", "Thứ 7", "Chủ nhật" */
  label: string;
  /** HH:mm */
  open: string;
  /** HH:mm */
  close: string;
  enabled: boolean;
}

export interface StoreHighlight {
  name: string;
  priceVnd: number;
}

/** GET /stores/profile?storeId=… (người chạy) · GET/POST /store/profile (chủ quán) */
export interface StoreProfile {
  storeId: string;
  storeName: string;
  /** Câu giới thiệu ngắn, tối đa 60 ký tự — hiện trên thẻ quán */
  tagline: string;
  /** Giới thiệu chi tiết, tối đa 500 ký tự */
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  coverTheme: StoreCoverTheme;
  tags: string[];
  openingHours: StoreOpeningHours[];
  highlights: StoreHighlight[];
  phone: string;
  /** Chỉ đọc — BE tính */
  verified: boolean;
  totalUsages: number;
  /** % lượt dùng voucher đến từ người đã chạy ngang quán */
  runnerSharePercent: number;
}

export type StoreProfileUpdate = Pick<
  StoreProfile,
  'storeName' | 'tagline' | 'description' | 'coverTheme' | 'tags' | 'openingHours' | 'highlights' | 'phone'
>;
