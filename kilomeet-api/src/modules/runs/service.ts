import type { Prisma, Run } from '@prisma/client';
import type { z } from 'zod';
import { routeDistanceKm, storesPassed, type RoutePoint } from '../../domain/geo.js';
import { claimExpiresAt } from '../../domain/pricing.js';
import { vnWeekStart } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { round2 } from '../auth/present.js';
import { ensureQuests, kmToday, updateQuestProgress } from '../quests/service.js';
import type { ClaimStoreBody, EndRunBody } from './schemas.js';

export function toApiRun(r: Run) {
  return {
    id: r.id,
    userId: r.userId,
    distanceKm: round2(r.distanceKm),
    durationMinutes: round2(r.durationMinutes),
    avgPaceMinPerKm: round2(r.avgPaceMinPerKm),
    route: r.route as unknown as RoutePoint[],
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : '', // '' khi chưa kết thúc, KHÔNG phải null
    passedStoreIds: r.passedStoreIds,
    // Thêm (FE bỏ qua):
    claimedStoreId: r.claimedStoreId,
  };
}

export async function startRun(userId: string) {
  const run = await prisma.run.create({ data: { userId, startedAt: clock.now() } });
  return toApiRun(run);
}

/** Quán đã duyệt đang bán voucher có nhiệm vụ "chạy ngang quán" còn hàng, còn hạn. */
async function questStores(tx: Tx, now: Date) {
  const stores = await tx.store.findMany({
    where: {
      status: 'approved',
      user: {
        voucherTemplates: {
          some: { questDescription: { not: null }, questDiscountPercent: { gt: 0 }, remaining: { gt: 0 }, expiresAt: { gt: now } },
        },
      },
    },
  });
  return stores.map((s) => ({ id: s.userId, name: s.storeName, latitude: s.lat, longitude: s.lng }));
}

function normalizeRoute(route: z.output<typeof EndRunBody>['route'], fallback: Date): RoutePoint[] {
  return route.map((p) => {
    const t = p.timestamp ? Date.parse(p.timestamp) : NaN;
    return {
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: Number.isNaN(t) ? fallback.toISOString() : new Date(t).toISOString(),
    };
  });
}

/**
 * Kết thúc buổi chạy (1 transaction, idempotent theo runId):
 * tự tính km + quán đi ngang, cộng km tuần, chấm nhiệm vụ, phát token.
 */
export async function endRun(userId: string, body: z.output<typeof EndRunBody>) {
  const now = clock.now();
  const run = await prisma.$transaction(async (tx) => {
    // Khoá + đánh dấu kết thúc nguyên tử: lần gọi thứ 2 nhận count = 0 → trả run cũ.
    const claimed = await tx.run.updateMany({ where: { id: body.runId, userId, endedAt: null }, data: { endedAt: now } });
    if (claimed.count === 0) {
      const existing = await tx.run.findFirst({ where: { id: body.runId, userId } });
      if (!existing) throw notFound('Không tìm thấy buổi chạy');
      return existing;
    }
    const startedRun = await tx.run.findUniqueOrThrow({ where: { id: body.runId } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const route = normalizeRoute(body.route, now);
    const distanceKm = routeDistanceKm(route);
    // Thời lượng: FE gửi (đã trừ lúc tạm dừng). Không cho vượt thời gian thực tế của buổi chạy
    // (theo đồng hồ server hoặc theo timestamp GPS, lấy cái dài hơn — để phát lại route mẫu vẫn đúng).
    const elapsedMin = Math.max(0, (now.getTime() - startedRun.startedAt.getTime()) / 60_000);
    const spanMin = route.length > 1
      ? Math.max(0, (Date.parse(route[route.length - 1]!.timestamp!) - Date.parse(route[0]!.timestamp!)) / 60_000)
      : 0;
    const maxMin = Math.max(elapsedMin, spanMin) + 1;
    const durationMinutes = Math.min(body.durationMinutes ?? Math.max(elapsedMin, spanMin), maxMin);
    const avgPace = distanceKm > 0 ? durationMinutes / distanceKm : 0;

    const passed = storesPassed(route, await questStores(tx, now));
    const passedStoreIds = passed.map((s) => s.id);
    const autoClaim = passed.length === 1 ? passed[0]!.id : null;

    const updated = await tx.run.update({
      where: { id: body.runId },
      data: {
        distanceKm, durationMinutes, avgPaceMinPerKm: avgPace,
        route: route as unknown as Prisma.InputJsonArray, passedStoreIds, claimedStoreId: autoClaim,
      },
    });
    // Đi qua đúng 1 quán → tự ghi nhận nhiệm vụ voucher. Nhiều quán → chờ /runs/claim-store.
    if (autoClaim) {
      await tx.voucherQuestClaim.create({ data: { userId, storeId: autoClaim, runId: updated.id, claimedAt: now } });
    }

    // Cộng km tuần (tự sang tuần mới nếu km_week_start cũ). Nguyên tử, chịu được 2 buổi kết thúc cùng lúc.
    const week = vnWeekStart(now);
    const first = route[0];
    const [p] = await tx.$queryRaw<{ km_this_week: number }[]>`
      UPDATE runner_profiles
      SET km_this_week = CASE WHEN km_week_start = ${week} THEN km_this_week + ${distanceKm} ELSE ${distanceKm} END,
          km_week_start = ${week},
          home_lat = COALESCE(${first?.latitude ?? null}::float8, home_lat),
          home_lng = COALESCE(${first?.longitude ?? null}::float8, home_lng)
      WHERE user_id = ${userId}
      RETURNING km_this_week`;

    const [daily, weekly] = await ensureQuests(tx, userId, now);
    await updateQuestProgress(tx, daily, await kmToday(tx, userId, now), user.walletAddress, now);
    await updateQuestProgress(tx, weekly, p?.km_this_week ?? 0, user.walletAddress, now);
    return updated;
  });
  return toApiRun(run);
}

export async function listRuns(userId: string) {
  const runs = await prisma.run.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 200 });
  return runs.map(toApiRun);
}

async function ownEndedRun(userId: string, runId: string) {
  const run = await prisma.run.findFirst({ where: { id: runId, userId } });
  if (!run) throw notFound('Không tìm thấy buổi chạy');
  if (!run.endedAt) throw badRequest('Buổi chạy chưa kết thúc');
  return run;
}

/** Danh sách quán buổi chạy đã đi ngang (để chọn 1 quán nhận giảm giá). */
export async function passedStores(userId: string, runId: string) {
  const run = await ownEndedRun(userId, runId);
  const stores = await prisma.store.findMany({ where: { userId: { in: run.passedStoreIds } } });
  return run.passedStoreIds.flatMap((id) => {
    const s = stores.find((x) => x.userId === id);
    return s ? [{ storeId: id, storeName: s.storeName, latitude: s.lat, longitude: s.lng, claimed: run.claimedStoreId === id }] : [];
  });
}

/** Mỗi buổi chạy chỉ nhận giảm giá cho đúng 1 quán. */
export async function claimStore(userId: string, body: z.output<typeof ClaimStoreBody>) {
  const now = clock.now();
  const run = await ownEndedRun(userId, body.runId);
  if (!run.passedStoreIds.includes(body.storeId)) throw badRequest('Buổi chạy không đi ngang quán này');
  const claim = await prisma.$transaction(async (tx) => {
    const set = await tx.run.updateMany({ where: { id: run.id, claimedStoreId: null }, data: { claimedStoreId: body.storeId } });
    if (set.count === 0) {
      const existing = await tx.voucherQuestClaim.findUnique({ where: { runId: run.id } });
      if (existing && existing.storeId === body.storeId) return existing; // gọi lặp cùng quán → trả lại
      throw conflict('Buổi chạy này đã nhận giảm giá cho một quán khác');
    }
    return tx.voucherQuestClaim.create({ data: { userId, storeId: body.storeId, runId: run.id, claimedAt: now } });
  });
  return {
    storeId: claim.storeId,
    claimedAt: claim.claimedAt.toISOString(),
    expiresAt: claimExpiresAt(claim.claimedAt).toISOString(),
  };
}
