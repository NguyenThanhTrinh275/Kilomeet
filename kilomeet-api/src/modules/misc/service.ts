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

type OutboxRow = { id: string; op: string; payload: unknown; status: string; txHash: string | null; createdAt: Date; ref: string | null };
type P = { to?: string; from?: string; merchant?: string; templateId?: string; key?: string; amount?: number; discounted?: boolean; approved?: boolean; rankIdx?: number };

const RANK_VI = ['Đồng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương', 'Cao thủ'];
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const strings = (xs: unknown[]) => [...new Set(xs.filter((x): x is string => typeof x === 'string' && x.length > 0))];

/** Tên mẫu voucher, tên người theo ví, số token đã trả / bị đốt — để mô tả giao dịch bằng tiếng Việt. */
async function txContext(rows: OutboxRow[]) {
  const ps = rows.map((r) => r.payload as P);
  const purchaseIds = rows.filter((r) => r.op === 'purchaseVoucher' && r.ref?.startsWith('voucher:')).map((r) => r.ref!.slice('voucher:'.length));
  const resets = rows
    .filter((r) => r.op === 'settleSeason' && r.ref?.startsWith('season_reset:'))
    .map((r) => r.ref!.split(':'))
    .map(([, seasonId, userId]) => ({ refId: seasonId!, userId: userId! }));
  const [templates, users, owned, ledger] = await Promise.all([
    prisma.voucherTemplate.findMany({ where: { id: { in: strings(ps.map((p) => p.templateId)) } }, select: { id: true, title: true } }),
    prisma.user.findMany({
      where: { walletAddress: { in: strings(ps.flatMap((p) => [p.to, p.from, p.merchant])) } },
      select: { walletAddress: true, name: true, store: { select: { storeName: true } } },
    }),
    prisma.ownedVoucher.findMany({ where: { id: { in: purchaseIds } }, select: { id: true, paidTokens: true } }),
    resets.length
      ? prisma.tokenLedger.findMany({ where: { reason: 'season_reset', OR: resets }, select: { userId: true, refId: true, delta: true } })
      : Promise.resolve([]),
  ]);
  return {
    title: (id?: string) => `«${templates.find((t) => t.id === id)?.title ?? 'voucher'}»`,
    who: (w?: string) => {
      const u = users.find((x) => x.walletAddress === w);
      return u?.store?.storeName ?? u?.name ?? (w ? shortAddr(w) : '?');
    },
    paid: (ref: string | null) => owned.find((o) => `voucher:${o.id}` === ref)?.paidTokens ?? null,
    burned: (ref: string | null) => {
      const [, seasonId, userId] = ref?.split(':') ?? [];
      return ledger.find((l) => l.refId === seasonId && l.userId === userId)?.delta ?? 0;
    },
  };
}

/**
 * Mô tả giao dịch cho người xem. `me` = ví người đang xem (bỏ trống ở trang quản trị → ghi kèm tên người).
 * `amount` = số RUN thay đổi của ví liên quan (dương: nhận, âm: đốt), null nếu không đổi token.
 */
function describe(r: OutboxRow, c: Awaited<ReturnType<typeof txContext>>, me?: string): { label: string; amount: number | null } {
  const p = r.payload as P;
  const tag = (w?: string) => (me ? '' : ` · ${c.who(w)}`);
  switch (r.op) {
    case 'mintToken': {
      const kind = p.key?.startsWith('seed:') ? 'Số dư mở đầu' : p.key?.startsWith('quest:') ? 'Thưởng nhiệm vụ' : 'Nhận token';
      return { label: kind + tag(p.to), amount: p.amount ?? null };
    }
    case 'purchaseVoucher': {
      const paid = c.paid(r.ref);
      return { label: `Mua voucher ${c.title(p.templateId)}${p.discounted ? ' (giá chạy ngang quán)' : ''}${tag(p.to)}`, amount: paid === null ? null : -paid };
    }
    case 'giftVoucher':
      if (me === p.from) return { label: `Tặng ${c.title(p.templateId)} cho ${c.who(p.to)}`, amount: null };
      if (me === p.to) return { label: `Nhận ${c.title(p.templateId)} từ ${c.who(p.from)}`, amount: null };
      return { label: `${c.who(p.from)} tặng ${c.title(p.templateId)} cho ${c.who(p.to)}`, amount: null };
    case 'redeemVoucher':
      return { label: me === p.from ? `Dùng ${c.title(p.templateId)} tại quán` : `Quét voucher ${c.title(p.templateId)} của ${c.who(p.from)}`, amount: null };
    case 'settleSeason':
      return { label: `Chốt mùa: giữ token theo hạng${tag(p.from)}`, amount: c.burned(r.ref) };
    case 'recordBadge':
      return { label: `Huy hiệu mùa ${RANK_VI[p.rankIdx ?? 0]} (NFT)${tag(p.to)}`, amount: null };
    case 'approveMerchant':
      return { label: `${p.approved ? 'Duyệt' : 'Ngừng duyệt'} quán ${c.who(p.merchant)}`, amount: null };
    case 'createVoucherType':
      return { label: `Tạo voucher ${c.title(p.templateId)}${tag(p.merchant)}`, amount: null };
    case 'startSeason':
      return { label: 'Mở mùa mới', amount: null };
    case 'endSeason':
      return { label: 'Đóng mùa: dừng phát token', amount: null };
    default:
      return { label: r.op, amount: null };
  }
}

async function toTxs(rows: OutboxRow[], me?: string) {
  const c = await txContext(rows);
  return rows.map((r) => ({
    id: r.id,
    op: r.op,
    ...describe(r, c, me),
    payload: r.payload,
    status: r.status,
    txHash: r.txHash,
    explorerUrl: txUrl(r.txHash),
    ref: r.ref,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Ví custodial + các giao dịch on-chain gần nhất (mở Snowtrace khi demo).
 * Cửa hàng thấy thêm: duyệt quán, tạo voucher, và các lượt quét voucher của quán mình.
 */
export async function myWallet(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true, store: true } });
  const w = u.walletAddress;
  const mine = [{ payload: { path: ['to'], equals: w } }, { payload: { path: ['from'], equals: w } }, { payload: { path: ['merchant'], equals: w } }];
  const storeTemplates = u.store ? await prisma.voucherTemplate.findMany({ where: { storeId: u.id }, select: { id: true } }) : [];
  const redeems = storeTemplates.map((t) => ({ op: 'redeemVoucher', payload: { path: ['templateId'], equals: t.id } }));
  const rows = await prisma.chainOutbox.findMany({ where: { OR: [...mine, ...redeems] }, orderBy: { seq: 'desc' }, take: 30 });
  return {
    address: w,
    explorerUrl: `${config.EXPLORER_URL}/address/${w}`,
    chain: config.CHAIN,
    tokenBalance: u.runner?.tokenBalance ?? 0,
    transactions: await toTxs(rows, w),
  };
}

export async function chainTxs() {
  const rows = await prisma.chainOutbox.findMany({ orderBy: { seq: 'desc' }, take: 50 });
  return toTxs(rows);
}
