import type { Prisma } from '@prisma/client';
import type { ChainOp } from '../chain/gateway.js';
import type { Tx } from './prisma.js';

/** Ghi lệnh chain trong CÙNG transaction nghiệp vụ; job chain-outbox gửi sau. */
export async function enqueueChain(tx: Tx, op: ChainOp, ref?: string): Promise<void> {
  const { op: name, ...payload } = op;
  await tx.chainOutbox.create({
    data: { op: name, payload: payload as Prisma.InputJsonObject, ref: ref ?? null },
  });
}

/** Lệnh tạo loại voucher on-chain cho một mẫu voucher. maxSupply = số còn lại lúc tạo (chain đếm `sold` từ 0). */
export function voucherTypeOp(
  t: { id: string; priceTokens: number; questDiscountPercent: number; remaining: number; expiresAt: Date },
  merchantWallet: string,
): ChainOp {
  return {
    op: 'createVoucherType',
    templateId: t.id,
    merchant: merchantWallet,
    price: t.priceTokens,
    discountBps: Math.round(t.questDiscountPercent * 100),
    maxSupply: t.remaining,
    expiry: Math.floor(t.expiresAt.getTime() / 1000),
  };
}
