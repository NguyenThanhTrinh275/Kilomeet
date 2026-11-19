// Hồ sơ quán (hợp đồng Mục 8.2): người chạy đọc trước khi mua voucher, chủ quán tự sửa.
import type { Prisma, Store } from '@prisma/client';
import type { z } from 'zod';
import {
  COVER_THEMES,
  DEFAULT_OPENING_HOURS,
  runnerSharePercent,
  type CoverTheme,
  type Highlight,
  type OpeningHours,
} from '../../domain/store-profile.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { StoreProfileBody } from './schemas.js';

async function toProfile(store: Store) {
  const [usageRows, questRows] = await Promise.all([
    prisma.voucherUsage.count({ where: { storeId: store.userId } }),
    prisma.voucherUsage.count({ where: { storeId: store.userId, ownedVoucher: { questCompletedAt: { not: null } } } }),
  ]);
  const hours = Array.isArray(store.openingHours) ? (store.openingHours as unknown as OpeningHours[]) : DEFAULT_OPENING_HOURS;
  return {
    storeId: store.userId,
    storeName: store.storeName,
    tagline: store.tagline,
    description: store.description,
    address: store.storeAddress,
    latitude: store.lat,
    longitude: store.lng,
    coverTheme: (COVER_THEMES as readonly string[]).includes(store.coverTheme) ? (store.coverTheme as CoverTheme) : 'coffee',
    tags: store.tags,
    openingHours: hours,
    highlights: Array.isArray(store.highlights) ? (store.highlights as unknown as Highlight[]) : [],
    phone: store.phone,
    verified: store.status === 'approved',
    totalUsages: store.totalUsages,
    runnerSharePercent: runnerSharePercent(usageRows, questRows),
  };
}

/** GET /stores/profile?storeId= — mọi vai trò đã đăng nhập. Quán chưa duyệt chỉ chủ quán/quản trị xem được. */
export async function getProfile(storeId: string, viewer: { id: string; role: string }) {
  const store = await prisma.store.findUnique({ where: { userId: storeId } });
  if (!store) throw notFound('Không tìm thấy cửa hàng');
  if (store.status !== 'approved' && viewer.id !== storeId && viewer.role !== 'admin') {
    throw notFound('Không tìm thấy cửa hàng');
  }
  return toProfile(store);
}

async function ownStore(userId: string) {
  const store = await prisma.store.findUnique({ where: { userId } });
  if (!store) throw forbidden('Không phải tài khoản cửa hàng');
  return store;
}

/** GET /store/profile — hồ sơ của chính quán (kể cả khi chưa được duyệt). */
export async function getMyProfile(userId: string) {
  return toProfile(await ownStore(userId));
}

/** POST /store/profile — chỉ cập nhật các field được gửi. Không đổi toạ độ/địa chỉ ở đây. */
export async function updateMyProfile(userId: string, b: z.output<typeof StoreProfileBody>) {
  await ownStore(userId);
  const data: Prisma.StoreUpdateInput = {};
  if (b.storeName !== undefined) data.storeName = b.storeName;
  if (b.tagline !== undefined) data.tagline = b.tagline;
  if (b.description !== undefined) data.description = b.description;
  if (b.coverTheme !== undefined) data.coverTheme = b.coverTheme;
  if (b.tags !== undefined) data.tags = b.tags;
  if (b.openingHours !== undefined) data.openingHours = b.openingHours as unknown as Prisma.InputJsonValue;
  if (b.highlights !== undefined) data.highlights = b.highlights as unknown as Prisma.InputJsonValue;
  if (b.phone !== undefined) data.phone = b.phone;
  const store = await prisma.store.update({ where: { userId }, data });
  return toProfile(store);
}
