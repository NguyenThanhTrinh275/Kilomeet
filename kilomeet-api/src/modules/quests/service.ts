import type { Quest } from '@prisma/client';
import {
  DAILY_QUEST_KM, DAILY_QUEST_REWARD, dailyQuestId, questReached, weeklyQuestId, weeklyReward, weeklyTarget,
} from '../../domain/quest.js';
import { addDays, endOfVnDay, endOfVnWeek, vnDayKey, vnDayStart, vnWeekStart } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { notFound } from '../../lib/errors.js';
import { applyTokenDelta } from '../../lib/ledger.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { effectiveKmThisWeek, round2 } from '../auth/present.js';

export function toApiQuest(q: Quest) {
  return {
    id: q.id,
    userId: q.userId,
    type: q.type,
    targetKm: q.targetKm,
    progressKm: round2(q.progressKm),
    rewardTokens: q.rewardTokens,
    status: q.status,
    expiresAt: q.expiresAt.toISOString(),
    completedAt: q.completedAt?.toISOString() ?? null,
  };
}

/** Tổng km các buổi chạy kết thúc trong ngày VN của `now` (quyết định #1: cộng dồn). */
export async function kmToday(tx: Tx, userId: string, now: Date): Promise<number> {
  const r = await tx.run.aggregate({
    where: { userId, endedAt: { gte: vnDayStart(vnDayKey(now)), lte: now } },
    _sum: { distanceKm: true },
  });
  return r._sum.distanceKm ?? 0;
}

/** Km 4 tuần lịch ngay trước tuần hiện tại (vắt qua mùa được — #4). Thiếu tuần = 0. */
async function last4WeeksKm(tx: Tx, userId: string, now: Date): Promise<number[]> {
  const week = vnWeekStart(now);
  const keys = [1, 2, 3, 4].map((i) => addDays(week, -7 * i));
  const rows = await tx.weeklyResult.findMany({ where: { userId, weekStart: { in: keys } } });
  return keys.map((k) => rows.find((r) => r.weekStart === k)?.km ?? 0);
}

/**
 * Đảm bảo có nhiệm vụ ngày + tuần cho thời điểm `now` (sinh lười), chuyển nhiệm vụ cũ sang expired.
 * Trả [daily, weekly].
 */
export async function ensureQuests(tx: Tx, userId: string, now: Date): Promise<[Quest, Quest]> {
  await tx.quest.updateMany({ where: { userId, status: 'active', expiresAt: { lt: now } }, data: { status: 'expired' } });

  const day = vnDayKey(now);
  const week = vnWeekStart(now);
  const profile = await tx.runnerProfile.findUniqueOrThrow({ where: { userId } });

  const existing = await tx.quest.findMany({
    where: { userId, OR: [{ type: 'daily', periodKey: day }, { type: 'weekly', periodKey: week }] },
  });
  if (!existing.some((q) => q.type === 'daily')) {
    await tx.quest.createMany({
      data: [{
        id: dailyQuestId(userId, day), userId, type: 'daily', periodKey: day,
        targetKm: DAILY_QUEST_KM, rewardTokens: DAILY_QUEST_REWARD,
        progressKm: await kmToday(tx, userId, now), expiresAt: endOfVnDay(now),
      }],
      skipDuplicates: true,
    });
  }
  if (!existing.some((q) => q.type === 'weekly')) {
    const target = weeklyTarget(await last4WeeksKm(tx, userId, now));
    await tx.quest.createMany({
      data: [{
        id: weeklyQuestId(userId, week), userId, type: 'weekly', periodKey: week,
        targetKm: target, rewardTokens: weeklyReward(target),
        progressKm: effectiveKmThisWeek(profile, now), expiresAt: endOfVnWeek(now),
      }],
      skipDuplicates: true,
    });
  }

  const quests = await tx.quest.findMany({
    where: { userId, OR: [{ type: 'daily', periodKey: day }, { type: 'weekly', periodKey: week }] },
  });
  const daily = quests.find((q) => q.type === 'daily')!;
  const weekly = quests.find((q) => q.type === 'weekly')!;
  return [daily, weekly];
}

/** Cập nhật tiến độ; đạt mục tiêu thì completed + phát token (đúng 1 lần). */
export async function updateQuestProgress(
  tx: Tx,
  q: Quest,
  progressKm: number,
  wallet: string,
  now: Date,
): Promise<Quest> {
  if (q.status !== 'active') return q;
  if (!questReached(progressKm, q.targetKm)) {
    return tx.quest.update({ where: { id: q.id }, data: { progressKm } });
  }
  const done = await tx.quest.updateMany({
    where: { id: q.id, status: 'active' },
    data: { progressKm, status: 'completed', completedAt: now },
  });
  if (done.count === 1) {
    await applyTokenDelta(tx, { userId: q.userId, wallet, delta: q.rewardTokens, reason: 'quest', refId: q.id });
  }
  return tx.quest.findUniqueOrThrow({ where: { id: q.id } });
}

/** GET /quests: luôn gồm 1 nhiệm vụ ngày + 1 nhiệm vụ tuần. */
export async function listQuests(userId: string) {
  const now = clock.now();
  const quests = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const [daily, weekly] = await ensureQuests(tx, userId, now);
    // Nhiệm vụ vừa sinh có thể đã đạt sẵn (vd. km tuần có trước khi sinh nhiệm vụ).
    return [
      await updateQuestProgress(tx, daily, daily.progressKm, user.walletAddress, now),
      await updateQuestProgress(tx, weekly, weekly.progressKm, user.walletAddress, now),
    ];
  });
  return quests.map(toApiQuest);
}

/** POST /quests/complete: idempotent, KHÔNG phát token. Chấm điểm nằm ở /runs/end. */
export async function getQuest(userId: string, questId: string) {
  const q = await prisma.quest.findFirst({ where: { id: questId, userId } });
  if (!q) throw notFound('Không tìm thấy nhiệm vụ');
  return toApiQuest(q);
}
