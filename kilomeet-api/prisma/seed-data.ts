// Dữ liệu demo. Chạy qua prisma/seed.ts (`pnpm db:seed`, `pnpm demo:reset`) và trong test.
// ID giữ giống mock FE (user-lan, store-fuji, vt-1, ...) để dễ đối chiếu.
import { randomBytes } from 'node:crypto';
import type { PrismaClient, Role, StoreStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { VOUCHER_FEE_VND } from '../src/domain/fee.js';
import { seasonOf } from '../src/domain/season.js';
import { addDays, vnDayStart, vnWeekStart } from '../src/domain/time.js';
import { voucherTypeOp } from '../src/lib/outbox.js';
import { walletAddressFor } from '../src/lib/wallet.js';

export const DEMO_PASSWORD = 'demo123';

interface RunnerSeed {
  id: string; email: string; name: string; role: Extract<Role, 'runner' | 'member'>; createdAt: string;
  rankIdx: number; tokenBalance: number; kmThisWeek: number; punctuality: number;
  seasonBadgeIdx: number | null; skipWeekAvailable: boolean;
  /** km 4 tuần trước (gần nhất trước) → weekly_results, dùng cho mục tiêu tuần */
  history: number[];
  home: [number, number] | null;
}

interface StoreSeed {
  id: string; email: string; name: string; createdAt: string; storeName: string; storeAddress: string;
  lat: number; lng: number; status: StoreStatus; totalUsages: number;
  /** Ví phí trả trước ban đầu (VND, quyết định #28). */
  feeVnd?: number;
}

const runners: RunnerSeed[] = [
  { id: 'user-lan', email: 'lan@demo.com', name: 'Nguyễn Lan', role: 'runner', createdAt: '2026-11-01T08:00:00Z',
    rankIdx: 0, tokenBalance: 0, kmThisWeek: 0, punctuality: 100, seasonBadgeIdx: null, skipWeekAvailable: true,
    history: [], home: [10.7705, 106.6625] },
  { id: 'user-minh', email: 'minh@demo.com', name: 'Trần Minh', role: 'member', createdAt: '2026-09-01T08:00:00Z',
    rankIdx: 5, tokenBalance: 1000, kmThisWeek: 42, punctuality: 95, seasonBadgeIdx: 5, skipWeekAvailable: false,
    history: [40, 42, 38, 40], home: [10.7728, 106.6603] },
  // Hai hội viên ở gần HCMUT để demo ghép nhóm (bước 7).
  { id: 'user-an', email: 'an@demo.com', name: 'Lê An', role: 'member', createdAt: '2026-09-10T08:00:00Z',
    rankIdx: 4, tokenBalance: 420, kmThisWeek: 18, punctuality: 90, seasonBadgeIdx: 4, skipWeekAvailable: true,
    history: [26, 25, 28, 22], home: [10.7745, 106.6585] },
  { id: 'user-binh', email: 'binh@demo.com', name: 'Phạm Bình', role: 'member', createdAt: '2026-09-12T08:00:00Z',
    rankIdx: 5, tokenBalance: 760, kmThisWeek: 30, punctuality: 100, seasonBadgeIdx: 5, skipWeekAvailable: true,
    history: [41, 40, 45, 39], home: [10.7712, 106.6631] },
];

const stores: StoreSeed[] = [
  { id: 'store-fuji', email: 'quanfuji@demo.com', name: 'Quán Fuji Coffee', createdAt: '2026-09-15T08:00:00Z',
    storeName: 'Fuji Coffee', storeAddress: '268 Lý Thường Kiệt, P.14, Q.10', lat: 10.773, lng: 106.66, status: 'approved', totalUsages: 47, feeVnd: 150_000 },
  { id: 'store-highlands', email: 'highlands@demo.com', name: 'Highlands Lý Thường Kiệt', createdAt: '2026-09-20T08:00:00Z',
    storeName: 'Highlands Coffee', storeAddress: '290 Lý Thường Kiệt, P.14, Q.10', lat: 10.775, lng: 106.662, status: 'approved', totalUsages: 12, feeVnd: 90_000 },
  { id: 'store-phuclong', email: 'phuclong@demo.com', name: 'Phúc Long Bách Khoa', createdAt: '2026-09-21T08:00:00Z',
    storeName: 'Phúc Long', storeAddress: '250 Lý Thường Kiệt, P.14, Q.10', lat: 10.771, lng: 106.658, status: 'approved', totalUsages: 8, feeVnd: 60_000 },
  { id: 'store-cong', email: 'cong@demo.com', name: 'Cộng Cà Phê Tô Hiến Thành', createdAt: '2026-09-22T08:00:00Z',
    storeName: 'Cộng Cà Phê', storeAddress: '1 Tô Hiến Thành, P.13, Q.10', lat: 10.776, lng: 106.664, status: 'approved', totalUsages: 5, feeVnd: 60_000 },
  { id: 'store-banhmi', email: 'banhmi@demo.com', name: 'Bánh Mì Huỳnh Hoa', createdAt: '2026-09-23T08:00:00Z',
    storeName: 'Bánh Mì Huỳnh Hoa', storeAddress: '210 Lý Thường Kiệt, P.14, Q.10', lat: 10.77, lng: 106.656, status: 'approved', totalUsages: 20, feeVnd: 90_000 },
  { id: 'store-juice', email: 'juice@demo.com', name: 'Juice Factory', createdAt: '2026-09-24T08:00:00Z',
    storeName: 'Juice Factory', storeAddress: '275 Lý Thường Kiệt, P.14, Q.10', lat: 10.774, lng: 106.661, status: 'approved', totalUsages: 3 },
  { id: 'store-pending-1', email: 'newcafe@demo.com', name: 'Chủ New Café', createdAt: '2026-11-08T10:00:00Z',
    storeName: 'New Café Bách Khoa', storeAddress: '280 Lý Thường Kiệt, P.14, Q.10', lat: 10.7741, lng: 106.6612, status: 'pending', totalUsages: 0 },
  { id: 'store-pending-2', email: 'juicebar@demo.com', name: 'Chủ Fresh Juice', createdAt: '2026-11-09T09:00:00Z',
    storeName: 'Fresh Juice Corner', storeAddress: '15 Tô Hiến Thành, P.15, Q.10', lat: 10.7768, lng: 106.6655, status: 'pending', totalUsages: 0 },
];

/** Hồ sơ quán (Mục 8.2) — giống mock FE `mock/profile.ts`. Quán không có ở đây dùng hồ sơ mặc định. */
const storeProfiles: Record<string, {
  tagline: string; description: string; coverTheme: 'coffee' | 'tea' | 'gym'; tags: string[];
  highlights: { name: string; priceVnd: number }[]; phone: string;
}> = {
  'store-fuji': {
    tagline: 'Cà phê rang xay cạnh HCMUT',
    description:
      'Fuji Coffee là quán cà phê nhỏ do hai cựu sinh viên Bách Khoa mở. Hạt cà phê được rang mỗi sáng ngay tại quán.\n\nQuán mở từ 6:00 để đón người chạy sáng sớm quanh HCMUT: có nước lọc miễn phí, chỗ gửi xe và góc ngồi ngoài trời để giãn cơ sau buổi chạy.',
    coverTheme: 'coffee',
    tags: ['Cà phê', 'Wifi', 'Gửi xe', 'Ngồi ngoài trời', 'Nước free cho runner'],
    highlights: [{ name: 'Cà phê muối', priceVnd: 35_000 }, { name: 'Cold brew cam sả', priceVnd: 45_000 }],
    phone: '0909 123 456',
  },
  'store-highlands': {
    tagline: 'Cà phê phin & trà đào cho buổi sáng',
    description: 'Highlands Lý Thường Kiệt nằm ngay cung chạy quanh HCMUT. Không gian rộng, máy lạnh mát, có chỗ để xe và ổ cắm sạc điện thoại.',
    coverTheme: 'coffee', tags: ['Cà phê', 'Trà', 'Máy lạnh', 'Gửi xe'],
    highlights: [{ name: 'Trà đào cam sả', priceVnd: 49_000 }, { name: 'Phin sữa đá', priceVnd: 35_000 }], phone: '',
  },
  'store-phuclong': {
    tagline: 'Trà & nước ép mát lạnh sau buổi chạy',
    description: 'Phúc Long Bách Khoa phục vụ trà sữa, trà trái cây và nước ép. Ghé sau buổi chạy để nạp lại năng lượng.',
    coverTheme: 'tea', tags: ['Trà', 'Trà sữa', 'Mang đi'], highlights: [{ name: 'Trà sữa Phúc Long', priceVnd: 55_000 }], phone: '',
  },
  'store-cong': {
    tagline: 'Cà phê cốt dừa, không gian hoài cổ',
    description: 'Cộng Cà Phê Tô Hiến Thành có tầng lầu yên tĩnh để ngồi nghỉ, phù hợp hẹn nhóm chạy sau buổi tập.',
    coverTheme: 'coffee', tags: ['Cà phê', 'Wifi', 'Ngồi lâu'], highlights: [{ name: 'Cốt dừa cà phê', priceVnd: 55_000 }], phone: '',
  },
  'store-banhmi': {
    tagline: 'Bữa sáng nhanh cho dân chạy bộ',
    description: 'Bánh mì thập cẩm đầy đặn, làm nhanh trong 2 phút. Mở từ 5:30 sáng cho người chạy sớm.',
    coverTheme: 'gym', tags: ['Ăn sáng', 'Mang đi'], highlights: [{ name: 'Bánh mì đặc biệt', priceVnd: 68_000 }], phone: '',
  },
  'store-juice': {
    tagline: 'Smoothie & nước ép trái cây tươi',
    description: 'Juice Factory ép trái cây tươi mỗi ngày, có smoothie bowl giàu năng lượng cho người vừa chạy xong.',
    coverTheme: 'tea', tags: ['Nước ép', 'Smoothie', 'Healthy'], highlights: [{ name: 'Smoothie bowl', priceVnd: 65_000 }], phone: '',
  },
};

const RUN_QUEST = 'Chạy ngang qua quán';
const templates = [
  { id: 'vt-1', storeId: 'store-fuji', title: 'Giảm 20% toàn menu', description: 'Áp dụng cho tất cả đồ uống tại Fuji Coffee',
    priceTokens: 500, discountPercent: 20, quest: RUN_QUEST, questDiscountPercent: 50, totalSupply: 100, remaining: 73, minRankIdx: 0 },
  { id: 'vt-2', storeId: 'store-highlands', title: 'Trà đào miễn phí size M', description: 'Đổi 1 ly trà đào cam sả size M',
    priceTokens: 300, discountPercent: 100, quest: RUN_QUEST, questDiscountPercent: 30, totalSupply: 50, remaining: 32, minRankIdx: 1 },
  { id: 'vt-3', storeId: 'store-phuclong', title: 'Giảm 30% trà sữa', description: 'Áp dụng cho các loại trà sữa',
    priceTokens: 400, discountPercent: 30, quest: null, questDiscountPercent: 0, totalSupply: 80, remaining: 55, minRankIdx: 0 },
  { id: 'vt-4', storeId: 'store-cong', title: 'Mua 1 tặng 1', description: 'Mua 1 ly bất kỳ, tặng 1 ly cùng loại',
    priceTokens: 600, discountPercent: 50, quest: RUN_QUEST, questDiscountPercent: 40, totalSupply: 30, remaining: 18, minRankIdx: 2 },
  { id: 'vt-5', storeId: 'store-banhmi', title: 'Giảm 15k bánh mì đặc biệt', description: 'Giảm 15.000đ cho bánh mì thập cẩm đặc biệt',
    priceTokens: 200, discountPercent: 15, quest: RUN_QUEST, questDiscountPercent: 50, totalSupply: 200, remaining: 145, minRankIdx: 0 },
  { id: 'vt-6', storeId: 'store-juice', title: 'Smoothie bowl miễn phí', description: 'Đổi 1 smoothie bowl trái cây tùy chọn',
    priceTokens: 450, discountPercent: 100, quest: null, questDiscountPercent: 0, totalSupply: 40, remaining: 28, minRankIdx: 0 },
];

/** Xoá sạch dữ liệu rồi tạo trạng thái demo. Test cũng gọi hàm này. */
export async function seedDemo(prisma: PrismaClient, now: Date = new Date()): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const seedRun = `${now.getTime()}-${randomBytes(3).toString('hex')}`;

  // Bảng con xoá theo cascade của users; còn lại xoá tay.
  await prisma.chainOutbox.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.season.deleteMany();

  const week = vnWeekStart(now);
  const season = seasonOf(now);
  await prisma.season.create({ data: { ...season, isActive: true } });

  // Mỗi lần seed dùng một dải chỉ số ví HD mới (theo phút kể từ 01/01/2026 × 1000, < 2^31 tới ~2030):
  // ví demo luôn mới tinh trên chain → số dư on-chain = DB sau mỗi demo:reset, không cộng dồn.
  let walletIndex = Math.max(0, Math.floor((now.getTime() - Date.UTC(2026, 0, 1)) / 60_000)) * 1000;
  const base = (id: string, email: string, name: string, role: Role, createdAt: string) => {
    walletIndex += 1;
    return { id, email, name, role, passwordHash, walletIndex, walletAddress: walletAddressFor(walletIndex), createdAt: new Date(createdAt) };
  };

  await prisma.user.create({ data: base('user-admin', 'admin@demo.com', 'Admin KILOMeet', 'admin', '2026-08-01T08:00:00Z') });

  for (const r of runners) {
    await prisma.user.create({
      data: {
        ...base(r.id, r.email, r.name, r.role, r.createdAt),
        runner: {
          create: {
            rankIdx: r.rankIdx, tokenBalance: r.tokenBalance, kmThisWeek: r.kmThisWeek, kmWeekStart: week,
            isMember: r.role === 'member',
            memberUntil: r.role === 'member' ? new Date(now.getTime() + 365 * 86_400_000) : null,
            punctuality: r.punctuality, seasonBadgeIdx: r.seasonBadgeIdx, skipWeekAvailable: r.skipWeekAvailable,
            homeLat: r.home?.[0] ?? null, homeLng: r.home?.[1] ?? null,
            groupsJoined: r.role === 'member' ? 20 : 0,
            groupsOnTime: r.role === 'member' ? Math.round((r.punctuality / 100) * 20) : 0,
          },
        },
      },
    });
    // Lịch sử 4 tuần trước → mục tiêu tuần (Minh TB 40 km → 44 km / 308 token).
    for (const [i, km] of r.history.entries()) {
      const ws = addDays(week, -7 * (i + 1));
      const wsSeason = seasonOf(vnDayStart(ws));
      await prisma.weeklyResult.create({
        data: { userId: r.id, seasonId: wsSeason.id === season.id ? season.id : null, weekStart: ws, km,
          levelIdx: r.rankIdx, rankBefore: r.rankIdx, rankAfter: r.rankIdx, createdAt: vnDayStart(addDays(ws, 7)) },
      });
    }
    if (r.tokenBalance > 0) {
      await prisma.tokenLedger.create({ data: { userId: r.id, delta: r.tokenBalance, reason: 'quest', refId: 'seed-opening-balance' } });
      // Số dư mở đầu cũng mint on-chain, để burn (mua voucher, reset mùa) sau này không thiếu số dư.
      // Ví mỗi lần seed là ví mới (xem walletIndex ở trên) nên số dư chain = DB; khoá thưởng vẫn khác nhau mỗi lần cho chắc.
      const key = `seed:${r.id}:${seedRun}`;
      await prisma.chainOutbox.create({
        data: { op: 'mintToken', payload: { to: walletAddressFor(walletIndex), amount: r.tokenBalance, key }, ref: key },
      });
    }
  }

  // Minh: 24 buổi chạy trong 4 tuần trước (6 buổi/tuần ~6,7 km).
  for (let i = 0; i < 24; i++) {
    const day = addDays(week, -28 + Math.floor(i / 6) * 7 + (i % 6));
    const startedAt = new Date(vnDayStart(day).getTime() + 5.5 * 3600_000);
    const km = 6 + (i % 3) * 0.7;
    const durationMinutes = km * 5.2;
    await prisma.run.create({
      data: {
        userId: 'user-minh', distanceKm: km, durationMinutes, avgPaceMinPerKm: 5.2, route: [],
        startedAt, endedAt: new Date(startedAt.getTime() + durationMinutes * 60_000),
      },
    });
  }

  for (const s of stores) {
    await prisma.user.create({
      data: {
        ...base(s.id, s.email, s.name, 'store', s.createdAt),
        store: {
          create: {
            storeName: s.storeName, storeAddress: s.storeAddress, lat: s.lat, lng: s.lng, status: s.status,
            appliedAt: new Date(s.createdAt), totalUsages: s.totalUsages, totalFeesVnd: s.totalUsages * VOUCHER_FEE_VND,
            feeBalanceVnd: s.feeVnd ?? 0,
            ...(s.feeVnd ? { feeEntries: { create: { kind: 'topup', amountVnd: s.feeVnd, balanceDelta: s.feeVnd, heldDelta: 0, ref: `topup:${s.id}:seed-${seedRun}`, createdAt: new Date(now.getTime() - 86_400_000) } } } : {}),
            ...(storeProfiles[s.id] ?? {}),
          },
        },
      },
    });
  }

  const expiresAt = new Date(now.getTime() + 60 * 86_400_000);
  for (const s of stores.filter((x) => x.status === 'approved')) {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
    await prisma.chainOutbox.create({
      data: { op: 'approveMerchant', payload: { merchant: u.walletAddress, approved: true }, ref: `seed:store:${s.id}:${seedRun}` },
    });
  }
  for (const [i, t] of templates.entries()) {
    const created = await prisma.voucherTemplate.create({
      data: {
        id: t.id, storeId: t.storeId, title: t.title, description: t.description, priceTokens: t.priceTokens,
        discountPercent: t.discountPercent, questDescription: t.quest, questDiscountPercent: t.questDiscountPercent,
        totalSupply: t.totalSupply, remaining: t.remaining, minRankIdx: t.minRankIdx, expiresAt,
        createdAt: new Date(now.getTime() - (templates.length - i) * 60_000),
      },
      include: { store: true },
    });
    const { op, ...payload } = voucherTypeOp(created, created.store.walletAddress);
    await prisma.chainOutbox.create({ data: { op, payload, ref: `seed:voucher-type:${t.id}:${seedRun}` } });
  }

  // Seed đặt ID tự tăng bằng tay → đẩy sequence lên để bản ghi tạo sau không trùng.
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('users', 'wallet_index'), (SELECT MAX(wallet_index) FROM users))`);
}

export const SEED_ACCOUNT_COUNT = 1 + runners.length + stores.length;
