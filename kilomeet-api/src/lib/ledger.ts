import type { Tx } from './prisma.js';
import { enqueueChain } from './outbox.js';

export type LedgerReason = 'quest' | 'buy' | 'season_reset';

/**
 * Ghi một thay đổi số dư + cập nhật tokenBalance. Delta dương thì ghi outbox mintToken (RunToken.reward).
 * Delta âm KHÔNG ghi outbox: trên chain token chỉ bị đốt qua Voucher.purchase hoặc RunToken.settleSeason,
 * nên service mua voucher / đóng mùa tự ghi lệnh tương ứng.
 * Idempotent: unique (user, reason, refId) — gọi lại thì không làm gì và trả false.
 * Với delta âm, service phải tự kiểm tra/trừ số dư có điều kiện trước (xem vouchers/buy).
 */
export async function applyTokenDelta(
  tx: Tx,
  p: { userId: string; wallet: string; delta: number; reason: LedgerReason; refId: string; skipBalanceUpdate?: boolean },
): Promise<boolean> {
  if (p.delta === 0) return false;
  const r = await tx.tokenLedger.createMany({
    data: [{ userId: p.userId, delta: p.delta, reason: p.reason, refId: p.refId }],
    skipDuplicates: true,
  });
  if (r.count === 0) return false;
  if (!p.skipBalanceUpdate) {
    await tx.runnerProfile.update({ where: { userId: p.userId }, data: { tokenBalance: { increment: p.delta } } });
  }
  if (p.delta > 0) {
    // Khoá thưởng on-chain kèm ví: hợp đồng chặn trùng theo keccak(key) TOÀN CỤC. Id nhiệm vụ cố định theo ngày,
    // nên sau `demo:reset` (ví mới) khoá cũ đã dùng → chain bỏ qua mint. Gắn ví để mỗi ví một khoá, vẫn idempotent.
    const key = `${p.reason}:${p.refId}:${p.userId}:${p.wallet.toLowerCase()}`;
    await enqueueChain(tx, { op: 'mintToken', to: p.wallet, amount: p.delta, key }, key);
  }
  return true;
}
