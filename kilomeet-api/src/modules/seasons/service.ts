import type { Season } from '@prisma/client';
import { nextRank, rankName, seasonReset } from '../../domain/rank.js';
import { chainSeasonNumber, daysLeft, nextSeason, seasonOf, type SeasonDef } from '../../domain/season.js';
import { addDays, vnWeekStart } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { badRequest } from '../../lib/errors.js';
import { applyTokenDelta } from '../../lib/ledger.js';
import { enqueueChain } from '../../lib/outbox.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { effectiveKmThisWeek } from '../auth/present.js';

export function toApiSeason(s: Season) {
  return { id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, isActive: s.isActive };
}

export const activeSeason = (tx: Tx | typeof prisma = prisma) => tx.season.findFirst({ where: { isActive: true } });

/** Level các tuần liên tiếp ngay trước `week`, cùng mùa, sau tuần miễn gần nhất (cũ → mới). */
async function streakBefore(tx: Tx, userId: string, seasonId: string | null, week: string): Promise<number[]> {
  const rows = await tx.weeklyResult.findMany({
    where: { userId, seasonId, weekStart: { lt: week } },
    orderBy: { weekStart: 'desc' },
    take: 2,
  });
  const out: number[] = [];
  let expected = addDays(week, -7);
  for (const r of rows) {
    if (r.weekStart !== expected || r.skipUsed) break;
    out.unshift(r.levelIdx);
    expected = addDays(expected, -7);
  }
  return out;
}

/** Chấm tuần chứa `now` cho 1 người. Idempotent theo (user, weekStart). Trả true nếu vừa chấm. */
async function gradeWeek(tx: Tx, userId: string, seasonId: string | null, now: Date): Promise<boolean> {
  const week = vnWeekStart(now);
  const done = await tx.weeklyResult.findUnique({ where: { userId_weekStart: { userId, weekStart: week } } });
  if (done) return false;
  const p = await tx.runnerProfile.findUniqueOrThrow({ where: { userId } });
  const km = effectiveKmThisWeek(p, now);
  const r = nextRank({
    cur: p.rankIdx,
    km,
    skipWeekAvailable: p.skipWeekAvailable,
    streak: await streakBefore(tx, userId, seasonId, week),
    seasonBadge: p.seasonBadgeIdx,
  });
  const created = await tx.weeklyResult.createMany({
    data: [{ userId, seasonId, weekStart: week, km, levelIdx: r.level, rankBefore: p.rankIdx, rankAfter: r.next, skipUsed: r.skipUsed, createdAt: now }],
    skipDuplicates: true,
  });
  if (created.count === 0) return false;
  await tx.runnerProfile.update({
    where: { userId },
    data: {
      rankIdx: r.next, skipWeekAvailable: r.skipWeekAvailable, seasonBadgeIdx: r.seasonBadge,
      kmThisWeek: 0, kmWeekStart: week,
    },
  });
  return true;
}

const runnerIds = async () =>
  (await prisma.runnerProfile.findMany({ select: { userId: true } })).map((r) => r.userId);

/** Job Chủ nhật 23:59 giờ VN (hoặc POST /admin/run-weekly-ranking). */
export async function runWeeklyRanking(now = clock.now()) {
  const season = await activeSeason();
  let processed = 0;
  for (const userId of await runnerIds()) {
    if (await prisma.$transaction((tx) => gradeWeek(tx, userId, season?.id ?? null, now))) processed++;
  }
  return { processed, weekStart: vnWeekStart(now) };
}

const resetRef = (seasonId: string, userId: string) => `season_reset:${seasonId}:${userId}`;

/** Chốt mùa cho 1 người trong 1 transaction. Đã chốt (có lệnh settleSeason với ref này) thì bỏ qua. */
async function resetRunner(season: Season, userId: string, now: Date) {
  await prisma.$transaction(async (tx) => {
    // Khoá dòng hồ sơ: 2 lần đóng mùa chạy song song không chốt 1 người 2 lần.
    await tx.$queryRaw`SELECT 1 FROM runner_profiles WHERE user_id = ${userId} FOR UPDATE`;
    if (await tx.chainOutbox.findFirst({ where: { ref: resetRef(season.id, userId) }, select: { id: true } })) return;
    await gradeWeek(tx, userId, season.id, now);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true } });
    const p = user.runner!;
    const r = seasonReset({ rankIdx: p.rankIdx, tokenBalance: p.tokenBalance, seasonBadge: p.seasonBadgeIdx });
    if (r.burned > 0) {
      await applyTokenDelta(tx, { userId, wallet: user.walletAddress, delta: -r.burned, reason: 'season_reset', refId: season.id });
    }
    // Mọi ví đều chốt; hợp đồng cắt theo hạng lúc hết mùa. Lệnh này cũng là dấu "đã chốt" của người này.
    await enqueueChain(tx, { op: 'settleSeason', from: user.walletAddress, rankIdx: p.rankIdx }, resetRef(season.id, userId));
    if (r.badgeIdx > 0) {
      const badge = await tx.seasonBadge.upsert({
        where: { userId_seasonId: { userId, seasonId: season.id } },
        create: { userId, seasonId: season.id, highestRankIdx: r.badgeIdx, createdAt: now },
        update: {},
      });
      await enqueueChain(
        tx,
        { op: 'recordBadge', to: user.walletAddress, season: chainSeasonNumber(season.id), rankIdx: r.badgeIdx },
        `badge:${badge.id}`,
      );
    }
    await tx.runnerProfile.update({
      where: { userId },
      data: { rankIdx: r.rankIdx, skipWeekAvailable: true, seasonBadgeIdx: null, noShowCount: 0 },
    });
  }, { timeout: 15_000 });
}

/** Người chạy (đăng ký trước lúc đóng mùa) chưa được chốt mùa `season`. */
async function unresetRunners(season: Season): Promise<string[]> {
  const ids = (
    await prisma.runnerProfile.findMany({ where: { user: { createdAt: { lte: season.endedAt ?? clock.now() } } }, select: { userId: true } })
  ).map((r) => r.userId);
  const done = await prisma.chainOutbox.findMany({ where: { ref: { in: ids.map((id) => resetRef(season.id, id)) } }, select: { ref: true } });
  const doneRefs = new Set(done.map((d) => d.ref));
  return ids.filter((id) => !doneRefs.has(resetRef(season.id, id)));
}

/** Mùa đóng gần nhất còn người chưa chốt (lần đóng trước dừng giữa chừng), nếu có. */
async function unfinishedSeason(): Promise<Season | null> {
  const last = await prisma.season.findFirst({ where: { isActive: false, endedAt: { not: null } }, orderBy: { endedAt: 'desc' } });
  return last && (await unresetRunners(last)).length > 0 ? last : null;
}

async function finishReset(season: Season) {
  const at = season.endedAt ?? clock.now();
  for (const userId of await unresetRunners(season)) await resetRunner(season, userId, at);
}

/**
 * Đóng mùa: chấm tuần dở dang (#8) → giữ token theo hạng → huy hiệu → tụt 2 bậc.
 * Mỗi người chốt trong transaction riêng. Lần đóng trước dừng giữa chừng → gọi lại sẽ chốt tiếp phần còn dở;
 * đã chốt xong hết thì gọi lại báo lỗi.
 */
export async function endSeason() {
  const now = clock.now();
  const season = await activeSeason();
  let target: Season;
  if (season) {
    // Đóng trước bằng UPDATE có điều kiện: 2 request đóng mùa cùng lúc thì chỉ 1 cái đóng.
    // On-chain: endSeason (dừng phát token) → settleSeason từng ví → recordBadge; mở mùa sau mới startSeason.
    await prisma.$transaction(async (tx) => {
      const closed = await tx.season.updateMany({ where: { id: season.id, isActive: true }, data: { isActive: false, endedAt: now } });
      if (closed.count === 0) throw badRequest('Không có mùa đang chạy');
      await enqueueChain(tx, { op: 'endSeason' }, `season-end:${season.id}`);
    });
    target = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
  } else {
    const unfinished = await unfinishedSeason();
    if (!unfinished) throw badRequest('Không có mùa đang chạy');
    target = unfinished;
  }
  await finishReset(target);
  return toApiSeason(await prisma.season.findUniqueOrThrow({ where: { id: target.id } }));
}

/** Mở mùa theo lịch 3 mùa. Mùa của hôm nay đã từng chạy → mở mùa kế tiếp. Mùa trước chốt dở thì chốt nốt trước. */
export async function startSeason() {
  const now = clock.now();
  if (await activeSeason()) throw badRequest('Đang có mùa chạy, hãy đóng mùa trước');
  const unfinished = await unfinishedSeason();
  if (unfinished) await finishReset(unfinished);
  let def: SeasonDef = seasonOf(now);
  while (await prisma.season.findUnique({ where: { id: def.id } })) def = nextSeason(def);
  const s = await prisma.$transaction(async (tx) => {
    const created = await tx.season.create({ data: { ...def, isActive: true } });
    await enqueueChain(tx, { op: 'startSeason' }, `season-start:${created.id}`);
    return created;
  });
  return toApiSeason(s);
}

export async function listSeasons() {
  return (await prisma.season.findMany({ orderBy: { startDate: 'desc' } })).map(toApiSeason);
}

export async function currentSeason() {
  const s = await activeSeason();
  if (!s) return null;
  return { ...toApiSeason(s), daysLeft: daysLeft(s.endDate, clock.now()) };
}

export async function myBadges(userId: string) {
  const [badges, profile, season] = await Promise.all([
    prisma.seasonBadge.findMany({ where: { userId }, include: { season: true }, orderBy: { createdAt: 'desc' } }),
    prisma.runnerProfile.findUnique({ where: { userId } }),
    activeSeason(),
  ]);
  const tx = await prisma.chainOutbox.findMany({ where: { ref: { in: badges.map((b) => `badge:${b.id}`) } } });
  const past = badges.map((b) => ({
    seasonId: b.seasonId,
    seasonName: b.season.name,
    highestRank: rankName(b.highestRankIdx),
    txHash: tx.find((t) => t.ref === `badge:${b.id}`)?.txHash ?? null,
    current: false,
  }));
  // Mùa đang chạy: huy hiệu tạm (chưa mint) theo hạng cao nhất tới giờ.
  const current = season && profile
    ? [{
        seasonId: season.id, seasonName: season.name,
        highestRank: rankName(Math.max(profile.seasonBadgeIdx ?? profile.rankIdx, profile.rankIdx)),
        txHash: null, current: true,
      }]
    : [];
  return [...current, ...past];
}
