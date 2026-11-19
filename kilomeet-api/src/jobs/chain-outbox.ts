import type { ChainOutbox } from '@prisma/client';
import { ChainRetryLater, ChainTxUnknown, getChain, type BatchOp, type ChainGateway, type ChainOp, type ResolvedOp, type SendResult } from '../chain/index.js';
import { prisma } from '../lib/prisma.js';

const MAX_ATTEMPTS = 5;
/** Số ví tối đa mỗi giao dịch theo lô (giữ gas mỗi giao dịch vừa phải). */
const BATCH_MAX = 100;
const BATCHABLE = new Set(['settleSeason', 'recordBadge']);
let running = false;

const toOp = (row: ChainOutbox) => ({ op: row.op, ...(row.payload as object) }) as ChainOp;

/** Lệnh có templateId cần id loại voucher on-chain (do createVoucherType cấp trước đó). */
async function resolve(op: ChainOp): Promise<ResolvedOp> {
  if (!('templateId' in op) || op.op === 'createVoucherType') return op;
  const t = await prisma.voucherTemplate.findUnique({ where: { id: op.templateId }, select: { chainTokenId: true } });
  return t?.chainTokenId == null ? op : { ...op, typeId: t.chainTokenId };
}

async function finish(row: ChainOutbox, r: SendResult) {
  if (r.typeId !== undefined && row.op === 'createVoucherType') {
    const { templateId } = row.payload as { templateId: string };
    await prisma.voucherTemplate.update({ where: { id: templateId }, data: { chainTokenId: r.typeId } });
  }
  await prisma.chainOutbox.update({ where: { id: row.id }, data: { status: 'done', txHash: r.txHash, lastError: null } });
}

type Outcome = { processed: number; failed: number; stop: boolean };

/**
 * Gửi một nhóm dòng outbox bằng MỘT giao dịch theo lô. Cả nhóm chung trạng thái và txHash.
 * Lỗi xử lý như lệnh đơn: chưa rõ kết quả → giữ sent; tạm hoãn → pending; lỗi → +1 lần thử, dừng lô.
 */
async function sendGroup(chain: ChainGateway, rows: ChainOutbox[], op: BatchOp): Promise<Outcome> {
  const ids = rows.map((r) => r.id);
  try {
    await prisma.chainOutbox.updateMany({ where: { id: { in: ids } }, data: { status: 'sent', txHash: null, attempts: { increment: 1 } } });
    const r = await chain.send(op, async (txHash) => {
      await prisma.chainOutbox.updateMany({ where: { id: { in: ids } }, data: { txHash } });
    });
    await prisma.chainOutbox.updateMany({ where: { id: { in: ids } }, data: { status: 'done', txHash: r.txHash, lastError: null } });
    return { processed: rows.length, failed: 0, stop: false };
  } catch (e) {
    const msg = String((e as Error).message ?? e).slice(0, 500);
    if (e instanceof ChainTxUnknown) {
      await prisma.chainOutbox.updateMany({ where: { id: { in: ids } }, data: { status: 'sent', lastError: msg } });
      return { processed: 0, failed: 0, stop: true };
    }
    if (e instanceof ChainRetryLater) {
      await prisma.chainOutbox.updateMany({ where: { id: { in: ids } }, data: { status: 'pending', txHash: null, attempts: { decrement: 1 }, lastError: msg } });
      return { processed: 0, failed: 0, stop: true };
    }
    for (const row of rows) {
      const attempts = row.attempts + 1;
      await prisma.chainOutbox.update({
        where: { id: row.id },
        data: { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', txHash: null, lastError: msg },
      });
    }
    return { processed: 0, failed: rows.length, stop: true };
  }
}

/**
 * Khối liền nhau các dòng settleSeason / recordBadge đang chờ (đóng mùa sinh xen kẽ 2 loại này cho từng ví)
 * → 1 giao dịch settleSeason theo lô + 1 giao dịch recordBadges theo lô mỗi mùa.
 * Chỉ gộp khối LIỀN NHAU nên không vượt thứ tự qua lệnh khác (vd. mua voucher). Hai loại độc lập nhau nên đổi
 * thứ tự trong khối là an toàn; settleSeason trên chain idempotent theo ví.
 */
async function sendSeasonBlock(chain: ChainGateway, block: ChainOutbox[]): Promise<Outcome> {
  const total: Outcome = { processed: 0, failed: 0, stop: false };
  const groups: [ChainOutbox[], BatchOp][] = [];
  const settles = block.filter((r) => r.op === 'settleSeason');
  for (let i = 0; i < settles.length; i += BATCH_MAX) {
    const part = settles.slice(i, i + BATCH_MAX);
    const ps = part.map((r) => r.payload as { from: string; rankIdx: number });
    groups.push([part, { op: 'settleSeasonBatch', users: ps.map((p) => p.from), ranks: ps.map((p) => p.rankIdx) }]);
  }
  const bySeason = new Map<number, ChainOutbox[]>();
  for (const r of block.filter((x) => x.op === 'recordBadge')) {
    const season = (r.payload as { season: number }).season;
    bySeason.set(season, [...(bySeason.get(season) ?? []), r]);
  }
  for (const [season, rows] of bySeason) {
    for (let i = 0; i < rows.length; i += BATCH_MAX) {
      const part = rows.slice(i, i + BATCH_MAX);
      const ps = part.map((r) => r.payload as { to: string; rankIdx: number });
      groups.push([part, { op: 'recordBadgeBatch', users: ps.map((p) => p.to), season, ranks: ps.map((p) => p.rankIdx) }]);
    }
  }
  for (const [rows, op] of groups) {
    const o = await sendGroup(chain, rows, op);
    total.processed += o.processed;
    total.failed += o.failed;
    if (o.stop) return { ...total, stop: true };
  }
  return total;
}

/**
 * Gửi lần lượt từng lệnh chain đang chờ theo đúng thứ tự ghi (seq), lưu txHash.
 * - txHash được lưu NGAY khi giao dịch lên mạng (trước khi chờ receipt).
 * - Dòng `sent` lúc bắt đầu lượt = mồ côi (tiến trình trước chết / chờ receipt quá lâu, vd. tsx watch khởi động lại):
 *   có txHash → tra receipt (xong → done, revert/bị bỏ → gửi lại, chưa rõ → chờ lượt sau); chưa có txHash → gửi lại.
 *   Nhờ vậy mua/tặng/quét voucher không bị chạy 2 lần trên chain.
 * - Lỗi: tăng attempts, quá 5 lần → failed. Dừng lô ngay để lệnh sau (vd. mua voucher sau khi tạo loại voucher)
 *   không chạy trước lệnh trước.
 * - ChainRetryLater (vd. mùa on-chain đang đóng): giữ pending, không tính lần thử, đi tiếp lệnh sau.
 * - Đóng mùa: các dòng settleSeason / recordBadge liền nhau được gộp thành giao dịch theo lô (xem sendSeasonBlock).
 */
export async function processChainOutbox(limit = 50) {
  if (running) return { processed: 0, failed: 0, skipped: true };
  running = true;
  let processed = 0;
  let failed = 0;
  try {
    const chain = await getChain();
    const rows = await prisma.chainOutbox.findMany({ where: { status: { in: ['pending', 'sent'] } }, orderBy: { seq: 'asc' }, take: limit });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.status === 'pending' && BATCHABLE.has(row.op)) {
        let j = i;
        while (j < rows.length && j - i < BATCH_MAX * 2 && rows[j]!.status === 'pending' && BATCHABLE.has(rows[j]!.op)) j++;
        if (j - i > 1) {
          const o = await sendSeasonBlock(chain, rows.slice(i, j));
          processed += o.processed;
          failed += o.failed;
          if (o.stop) break;
          i = j - 1;
          continue;
        }
      }
      const op = await resolve(toOp(row));
      try {
        if (row.status === 'sent' && row.txHash) {
          const rec = await chain.recover(op, row.txHash);
          if (rec.state === 'done') {
            await finish(row, rec.result);
            processed++;
            continue;
          }
          if (rec.state === 'unknown') break; // giao dịch còn trong mempool: chờ lượt sau, giữ thứ tự
        }
        await prisma.chainOutbox.update({ where: { id: row.id }, data: { status: 'sent', txHash: null, attempts: { increment: 1 } } });
        const r = await chain.send(op, async (txHash) => {
          await prisma.chainOutbox.update({ where: { id: row.id }, data: { txHash } });
        });
        await finish(row, r);
        processed++;
      } catch (e) {
        const msg = String((e as Error).message ?? e).slice(0, 500);
        if (e instanceof ChainRetryLater) {
          await prisma.chainOutbox.update({ where: { id: row.id }, data: { status: 'pending', txHash: null, attempts: row.attempts, lastError: msg } });
          continue;
        }
        if (e instanceof ChainTxUnknown) {
          // Đã lên mạng: giữ `sent` + txHash để lượt sau tra receipt, KHÔNG gửi lại.
          await prisma.chainOutbox.update({ where: { id: row.id }, data: { status: 'sent', lastError: msg } });
          break;
        }
        failed++;
        const attempts = row.attempts + 1;
        await prisma.chainOutbox.update({
          where: { id: row.id },
          data: { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', txHash: null, lastError: msg },
        });
        break;
      }
    }
  } finally {
    running = false;
  }
  return { processed, failed, skipped: false };
}
