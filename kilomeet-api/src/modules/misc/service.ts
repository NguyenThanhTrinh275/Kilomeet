import { daysLeft, SEASON_REMINDER_DAYS } from '../../domain/season.js';
import { rankName } from '../../domain/rank.js';
import { vnWeekStart } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { config } from '../../lib/config.js';
import { prisma } from '../../lib/prisma.js';
import { round2 } from '../auth/present.js';
import { activeSeason } from '../seasons/service.js';

/** Thông báo (nhắc giờ nhóm chạy, sắp hết mùa). Nhắc hết mùa được sinh lười khi còn ≤ 7 ngày. */
export async function listNotifications(userId: string) {
  const now = clock.now();
  const season = await activeSeason();
  if (season) {
    const left = daysLeft(season.endDate, now);
    if (left <= SEASON_REMINDER_DAYS) {
      await prisma.notification.createMany({
        data: [{
          userId, type: 'season', dedupeKey: `season-${season.id}-ending`, createdAt: now,
          title: `${season.name} sắp kết thúc`,
          body: `Còn ${left} ngày. Token vượt mức giữ lại của hạng sẽ bị xoá khi hết mùa — hãy đổi voucher!`,
        }],
        skipDuplicates: true,
      });
    }
  }
  const list = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  return list.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, createdAt: n.createdAt.toISOString(), read: n.read }));
}

export async function markRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({ where: { userId, ...(ids?.length ? { id: { in: ids } } : {}) }, data: { read: true } });
  return { success: true };
}

/** Bảng xếp hạng km tuần này. */
export async function leaderboard(area?: string) {
  const week = vnWeekStart(clock.now());
  const rows = await prisma.runnerProfile.findMany({
    where: { kmWeekStart: week, kmThisWeek: { gt: 0 }, ...(area ? { area } : {}) },
    include: { user: { select: { name: true } } },
    orderBy: { kmThisWeek: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({ userId: r.userId, name: r.user.name, rank: rankName(r.rankIdx), kmThisWeek: round2(r.kmThisWeek) }));
}

/** Quận/huyện TP.HCM (quyết định #9). */
export const AREAS = [
  'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12',
  'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Thủ Đức',
  'Bình Chánh', 'Hóc Môn', 'Củ Chi', 'Nhà Bè', 'Cần Giờ',
].map((name) => ({ code: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-'), name }));

export { activeSeason };

const txUrl = (hash: string | null) => (hash ? `${config.EXPLORER_URL}/tx/${hash}` : null);

function toTx(r: { id: string; op: string; payload: unknown; status: string; txHash: string | null; createdAt: Date; ref: string | null }) {
  return { id: r.id, op: r.op, payload: r.payload, status: r.status, txHash: r.txHash, explorerUrl: txUrl(r.txHash), ref: r.ref, createdAt: r.createdAt.toISOString() };
}

/** Ví custodial + các giao dịch on-chain gần nhất của người dùng (mở Snowtrace khi demo). */
export async function myWallet(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true } });
  const rows = await prisma.chainOutbox.findMany({
    where: { OR: [{ payload: { path: ['to'], equals: u.walletAddress } }, { payload: { path: ['from'], equals: u.walletAddress } }] },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return {
    address: u.walletAddress,
    explorerUrl: `${config.EXPLORER_URL}/address/${u.walletAddress}`,
    chain: config.CHAIN,
    tokenBalance: u.runner?.tokenBalance ?? 0,
    transactions: rows.map(toTx),
  };
}

export async function chainTxs() {
  const rows = await prisma.chainOutbox.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map(toTx);
}
