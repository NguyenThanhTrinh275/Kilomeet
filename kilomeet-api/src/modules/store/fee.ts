// Ví phí trả trước của cửa hàng (quyết định #28, hợp đồng Mục 5.5b).
// Mọi thay đổi số dư / tạm giữ đi kèm 1 dòng store_fee_entries có `ref` duy nhất → gọi lặp không ghi 2 lần.
import { randomBytes } from 'node:crypto';
import {
  availableVnd, sellableByFee, shortfallVnd, topupError, TOPUP_PRESETS_VND, VOUCHER_FEE_VND, type FeeWallet,
} from '../../domain/fee.js';
import { clock } from '../../lib/clock.js';
import { badRequest, forbidden } from '../../lib/errors.js';
import { prisma, type Tx } from '../../lib/prisma.js';

/** Message khi người chạy mua voucher của quán hết khả dụng trong ví phí. */
export const FEE_PAUSED_MESSAGE = 'Voucher tạm hết, quán đang bổ sung. Vui lòng quay lại sau';

const toWallet = (s: { feeBalanceVnd: number; feeHeldVnd: number }): FeeWallet => ({ balanceVnd: s.feeBalanceVnd, heldVnd: s.feeHeldVnd });

/** Quán còn đủ khả dụng để bán thêm 1 voucher không (dùng khi hiển thị "Tạm hết"). */
export const storeCanSell = (s: { feeBalanceVnd: number; feeHeldVnd: number } | null | undefined) =>
  !!s && availableVnd(toWallet(s)) >= VOUCHER_FEE_VND;

/**
 * Người chạy mua voucher: tạm giữ phí trong ví quán. Gọi TRONG transaction mua.
 * UPDATE có điều kiện khả dụng nên hai lượt mua đồng thời không giữ quá số dư.
 * Ném lỗi (rollback cả lượt mua) nếu ví không đủ.
 */
export async function holdFee(tx: Tx, storeId: string, ownedVoucherId: string, now: Date) {
  const fee = VOUCHER_FEE_VND;
  const n = await tx.$executeRaw`
    UPDATE stores SET fee_held_vnd = fee_held_vnd + ${fee}
    WHERE user_id = ${storeId} AND fee_balance_vnd - fee_held_vnd >= ${fee}`;
  if (n === 0) throw badRequest(FEE_PAUSED_MESSAGE);
  await tx.storeFeeEntry.create({
    data: { storeId, kind: 'hold', amountVnd: fee, balanceDelta: 0, heldDelta: fee, ref: `hold:${ownedVoucherId}`, createdAt: now },
  });
  return fee;
}

/**
 * Quán quét QR: trừ thật khoản đang giữ (số dư − giữ, tạm giữ − giữ). Gọi TRONG transaction quét,
 * sau khi đã đốt voucher. Voucher cũ không có khoản giữ (trước khi có ví phí) → trừ thẳng phí hiện hành.
 * Trả số phí đã trừ.
 */
export async function chargeFee(tx: Tx, storeId: string, ownedVoucherId: string, heldVnd: number, now: Date) {
  const amount = heldVnd > 0 ? heldVnd : VOUCHER_FEE_VND;
  await tx.store.update({
    where: { userId: storeId },
    data: {
      feeBalanceVnd: { decrement: amount },
      feeHeldVnd: { decrement: heldVnd },
      totalUsages: { increment: 1 },
      totalFeesVnd: { increment: amount },
    },
  });
  await tx.ownedVoucher.update({ where: { id: ownedVoucherId }, data: { feeHeldVnd: 0 } });
  await tx.storeFeeEntry.create({
    data: { storeId, kind: 'charge', amountVnd: amount, balanceDelta: -amount, heldDelta: -heldVnd, ref: `charge:${ownedVoucherId}`, createdAt: now },
  });
  return amount;
}

/**
 * Trả lại phí đang giữ của voucher đã hết hạn mà chưa dùng. Idempotent: mỗi voucher chỉ trả 1 lần
 * (updateMany có điều kiện fee_held_vnd > 0 + ref duy nhất). `storeId` để chạy riêng cho 1 quán.
 */
export async function releaseExpiredHolds(now = clock.now(), storeId?: string) {
  const rows = await prisma.ownedVoucher.findMany({
    where: {
      feeHeldVnd: { gt: 0 },
      status: { in: ['owned', 'gifted', 'expired'] },
      template: { expiresAt: { lte: now }, ...(storeId ? { storeId } : {}) },
    },
    select: { id: true, feeHeldVnd: true, template: { select: { storeId: true } } },
  });
  let released = 0;
  for (const v of rows) {
    await prisma.$transaction(async (tx) => {
      const cleared = await tx.ownedVoucher.updateMany({ where: { id: v.id, feeHeldVnd: { gt: 0 } }, data: { feeHeldVnd: 0 } });
      if (cleared.count === 0) return;
      await tx.store.update({ where: { userId: v.template.storeId }, data: { feeHeldVnd: { decrement: v.feeHeldVnd } } });
      await tx.storeFeeEntry.create({
        data: {
          storeId: v.template.storeId, kind: 'release', amountVnd: v.feeHeldVnd, balanceDelta: 0,
          heldDelta: -v.feeHeldVnd, ref: `release:${v.id}`, createdAt: now,
        },
      });
      released++;
    });
  }
  return { processed: released };
}

/** Nạp tiền vào ví phí (thanh toán giả lập). `requestId` chống bấm 2 lần: cùng mã thì chỉ nạp 1 lần. */
export async function topup(storeId: string, amountVnd: number, requestId?: string) {
  const err = topupError(amountVnd);
  if (err) throw badRequest(err);
  const store = await prisma.store.findUnique({ where: { userId: storeId } });
  if (!store) throw forbidden('Không phải tài khoản cửa hàng');
  if (store.status !== 'approved') throw forbidden('Cửa hàng chưa được duyệt');
  const ref = `topup:${storeId}:${requestId?.trim() || randomBytes(8).toString('hex')}`;
  const now = clock.now();
  await prisma.$transaction(async (tx) => {
    if (await tx.storeFeeEntry.findUnique({ where: { ref } })) return; // gọi lặp
    await tx.store.update({ where: { userId: storeId }, data: { feeBalanceVnd: { increment: amountVnd } } });
    await tx.storeFeeEntry.create({
      data: { storeId, kind: 'topup', amountVnd, balanceDelta: amountVnd, heldDelta: 0, ref, createdAt: now },
    });
  });
  return feeWallet(storeId);
}

const ENTRY_TITLE = {
  topup: 'Nạp tiền vào ví phí',
  hold: 'Tạm giữ phí',
  charge: 'Trừ phí lượt quét',
  release: 'Trả lại phí',
} as const;

/** Tóm tắt ví phí + 30 dòng sổ gần nhất. Trả lại phí voucher hết hạn của quán trước khi đọc. */
export async function feeWallet(storeId: string) {
  const now = clock.now();
  await releaseExpiredHolds(now, storeId);
  const store = await prisma.store.findUnique({ where: { userId: storeId } });
  if (!store) throw forbidden('Không phải tài khoản cửa hàng');
  const [unsold, heldCount, entries] = await Promise.all([
    prisma.voucherTemplate.aggregate({ where: { storeId, expiresAt: { gt: now } }, _sum: { remaining: true } }),
    prisma.ownedVoucher.count({ where: { template: { storeId }, feeHeldVnd: { gt: 0 } } }),
    prisma.storeFeeEntry.findMany({ where: { storeId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30 }),
  ]);
  // Tên voucher cho dòng hold/charge/release (ref = <kind>:<ownedVoucherId>).
  const ovIds = entries.filter((e) => e.kind !== 'topup').map((e) => e.ref.slice(e.ref.indexOf(':') + 1));
  const ovs = ovIds.length
    ? await prisma.ownedVoucher.findMany({ where: { id: { in: ovIds } }, select: { id: true, template: { select: { title: true } }, owner: { select: { name: true } } } })
    : [];
  const ovById = new Map(ovs.map((v) => [v.id, v]));

  const w = toWallet(store);
  const unsoldCount = unsold._sum.remaining ?? 0;
  return {
    balanceVnd: store.feeBalanceVnd,
    heldVnd: store.feeHeldVnd,
    availableVnd: availableVnd(w),
    feePerVoucherVnd: VOUCHER_FEE_VND,
    sellableCount: sellableByFee(w),
    unsoldCount,
    shortfallVnd: shortfallVnd(w, unsoldCount),
    heldCount,
    totalPaidVnd: store.totalFeesVnd,
    presetsVnd: [...TOPUP_PRESETS_VND],
    entries: entries.map((e) => {
      const v = e.kind === 'topup' ? undefined : ovById.get(e.ref.slice(e.ref.indexOf(':') + 1));
      const subtitle =
        e.kind === 'topup' ? 'Thanh toán giả lập'
        : e.kind === 'hold' ? `«${v?.template.title ?? 'Voucher'}» vừa bán${v ? ` · ${v.owner.name}` : ''}`
        : e.kind === 'charge' ? `Quét «${v?.template.title ?? 'Voucher'}»${v ? ` của ${v.owner.name}` : ''}`
        : `«${v?.template.title ?? 'Voucher'}» hết hạn chưa dùng`;
      return {
        id: e.id,
        kind: e.kind,
        title: ENTRY_TITLE[e.kind],
        subtitle,
        amountVnd: e.amountVnd,
        balanceDeltaVnd: e.balanceDelta,
        heldDeltaVnd: e.heldDelta,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  };
}
