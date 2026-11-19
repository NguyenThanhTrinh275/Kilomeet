// Zod schema dựng theo kilomeet-app/src/api/types.ts — FE là hợp đồng.
// Dùng cho contract test: parse response của BE; đổi tên/xoá field là test đỏ.
// Các object là `looseObject` vì BE được phép trả THÊM field.
import { z } from 'zod';

export const RANKS = ['đồng', 'bạc', 'vàng', 'bạch_kim', 'kim_cương', 'cao_thủ'] as const;
export const RankZ = z.enum(RANKS);
export type Rank = z.infer<typeof RankZ>;

const IsoZ = z.iso.datetime({ offset: true });
const DateOnlyZ = z.iso.date();
const IntZ = z.number().int();

export const UserRoleZ = z.enum(['runner', 'member', 'store', 'admin']);

const UserBase = {
  id: z.string(),
  email: z.string(),
  name: z.string(),
  walletAddress: z.string(),
  createdAt: IsoZ,
};

export const RunnerZ = z.looseObject({
  ...UserBase,
  role: z.enum(['runner', 'member']),
  rank: RankZ,
  tokenBalance: IntZ,
  kmThisWeek: z.number(),
  isMember: z.boolean(),
  punctuality: z.number(),
  seasonBadge: RankZ.nullable(),
  skipWeekAvailable: z.boolean(),
});

export const StoreZ = z.looseObject({
  ...UserBase,
  role: z.literal('store'),
  storeName: z.string(),
  storeAddress: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  approved: z.boolean(),
  totalUsages: IntZ,
  totalFeesVnd: IntZ,
});

export const AdminZ = z.looseObject({ ...UserBase, role: z.literal('admin') });

export const AnyUserZ = z.union([RunnerZ, StoreZ, AdminZ]);

export const AuthResponseZ = z.looseObject({ user: AnyUserZ, token: z.string() });

export const GpsPointZ = z.looseObject({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),
});

export const RunZ = z.looseObject({
  id: z.string(),
  userId: z.string(),
  distanceKm: z.number(),
  durationMinutes: z.number(),
  avgPaceMinPerKm: z.number(),
  route: z.array(GpsPointZ),
  startedAt: IsoZ,
  /** '' khi chưa kết thúc — KHÔNG phải null */
  endedAt: z.union([z.literal(''), IsoZ]),
  passedStoreIds: z.array(z.string()),
});

export const QuestZ = z.looseObject({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['daily', 'weekly']),
  targetKm: z.number(),
  progressKm: z.number(),
  rewardTokens: IntZ,
  status: z.enum(['active', 'completed', 'expired']),
  expiresAt: IsoZ,
  completedAt: IsoZ.nullable(),
});

export const VoucherTemplateZ = z.looseObject({
  id: z.string(),
  storeId: z.string(),
  storeName: z.string(),
  storeLatitude: z.number(),
  storeLongitude: z.number(),
  title: z.string(),
  description: z.string(),
  priceTokens: IntZ,
  discountPercent: z.number(),
  questDescription: z.string().nullable(),
  questDiscountPercent: z.number(),
  totalSupply: IntZ,
  remaining: IntZ,
  minRank: RankZ,
  expiresAt: IsoZ,
  imageUrl: z.string().nullable(),
});

export const OwnedVoucherZ = z.looseObject({
  id: z.string(),
  templateId: z.string(),
  template: VoucherTemplateZ,
  ownerId: z.string(),
  status: z.enum(['available', 'owned', 'gifted', 'used', 'expired']),
  purchasedAt: IsoZ,
  questCompletedAt: IsoZ.nullable(),
  paidTokens: IntZ,
  giftedFrom: z.string().nullable(),
  usedAt: IsoZ.nullable(),
  qrCode: z.string(),
});

export const GROUP_TIME_SLOTS = [
  '05:00', '05:30', '06:00', '06:30', '07:00',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
] as const;

export const GroupMemberZ = z.looseObject({
  userId: z.string(),
  userName: z.string(),
  rank: RankZ,
  confirmed: z.boolean(),
  arrived: z.boolean(),
  punctuality: z.number(),
});

export const GroupRunZ = z.looseObject({
  id: z.string(),
  creatorId: z.string(),
  date: DateOnlyZ,
  timeSlot: z.enum(GROUP_TIME_SLOTS),
  meetingPoint: z.looseObject({ name: z.string(), latitude: z.number(), longitude: z.number() }),
  distanceKm: z.number(),
  rankRange: z.enum(['same', 'within1', 'within2', 'any']),
  status: z.enum(['open', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  members: z.array(GroupMemberZ),
  maxMembers: IntZ,
});

export const StoreDashboardZ = z.looseObject({
  storeId: z.string(),
  storeName: z.string(),
  totalVouchersCreated: IntZ,
  totalVouchersUsed: IntZ,
  totalFeesVnd: IntZ,
  recentUsages: z.array(
    z.looseObject({ voucherTitle: z.string(), usedAt: IsoZ, userName: z.string() }),
  ),
});

/** GET /store/fee · POST /store/fee/topup — ví phí trả trước (Mục 5.5b). */
export const StoreFeeWalletZ = z.looseObject({
  balanceVnd: IntZ,
  heldVnd: IntZ,
  availableVnd: IntZ,
  feePerVoucherVnd: IntZ,
  sellableCount: IntZ,
  unsoldCount: IntZ,
  shortfallVnd: IntZ,
  heldCount: IntZ,
  totalPaidVnd: IntZ,
  presetsVnd: z.array(IntZ),
  entries: z.array(
    z.looseObject({
      id: z.string(),
      kind: z.enum(['topup', 'hold', 'charge', 'release']),
      title: z.string(),
      subtitle: z.string(),
      amountVnd: IntZ,
      balanceDeltaVnd: IntZ,
      heldDeltaVnd: IntZ,
      createdAt: IsoZ,
    }),
  ),
});

export const SeasonInfoZ = z.looseObject({
  id: z.string(),
  name: z.string(),
  startDate: DateOnlyZ,
  endDate: DateOnlyZ,
  isActive: z.boolean(),
});

export const PendingStoreZ = z.looseObject({
  id: z.string(),
  email: z.string(),
  storeName: z.string(),
  storeAddress: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  appliedAt: IsoZ,
});

export const AdminStoreZ = PendingStoreZ.extend({
  status: z.enum(['pending', 'approved', 'rejected']),
});

const HhmmZ = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** types.ts `StoreProfile` (Mục 8.2) */
export const StoreProfileZ = z.looseObject({
  storeId: z.string(),
  storeName: z.string(),
  tagline: z.string().max(60),
  description: z.string().max(500),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  coverTheme: z.enum(['coffee', 'tea', 'gym']),
  tags: z.array(z.string()),
  openingHours: z.array(z.looseObject({ label: z.string(), open: HhmmZ, close: HhmmZ, enabled: z.boolean() })),
  highlights: z.array(z.looseObject({ name: z.string(), priceVnd: IntZ })),
  phone: z.string(),
  verified: z.boolean(),
  totalUsages: IntZ,
  runnerSharePercent: IntZ.min(0).max(100),
});

/** Envelope thành công bọc schema `data`. */
export const okZ = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });
export const FailZ = z.object({ success: z.literal(false), message: z.string().min(1) });
