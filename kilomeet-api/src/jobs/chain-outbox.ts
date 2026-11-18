import type { ChainOutbox } from '@prisma/client';
import { ChainRetryLater, ChainTxUnknown, getChain, type ChainOp, type ResolvedOp, type SendResult } from '../chain/index.js';
import { prisma } from '../lib/prisma.js';

const MAX_ATTEMPTS = 5;
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

/**
 * Gửi lần lượt từng lệnh chain đang chờ theo đúng thứ tự ghi (seq), lưu txHash.
 * - txHash được lưu NGAY khi giao dịch lên mạng (trước khi chờ receipt).
 * - Dòng `sent` lúc bắt đầu lượt = mồ côi (tiến trình trước chết / chờ receipt quá lâu, vd. tsx watch khởi động lại):
 *   có txHash → tra receipt (xong → done, revert/bị bỏ → gửi lại, chưa rõ → chờ lượt sau); chưa có txHash → gửi lại.
 *   Nhờ vậy mua/tặng/quét voucher không bị chạy 2 lần trên chain.
 * - Lỗi: tăng attempts, quá 5 lần → failed. Dừng lô ngay để lệnh sau (vd. mua voucher sau khi tạo loại voucher)
 *   không chạy trước lệnh trước.
 * - ChainRetryLater (vd. mùa on-chain đang đóng): giữ pending, không tính lần thử, đi tiếp lệnh sau.
 */
export async function processChainOutbox(limit = 50) {
  if (running) return { processed: 0, failed: 0, skipped: true };
  running = true;
  let processed = 0;
  let failed = 0;
  try {
    const chain = await getChain();
    const rows = await prisma.chainOutbox.findMany({ where: { status: { in: ['pending', 'sent'] } }, orderBy: { seq: 'asc' }, take: limit });
    for (const row of rows) {
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
