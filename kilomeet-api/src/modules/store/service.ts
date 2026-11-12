import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import { parseExpiryInput, redeemError, VOUCHER_USE_FEE_VND } from '../../domain/pricing.js';
import { rankIndex } from '../../domain/rank.js';
import { clock } from '../../lib/clock.js';
import { badRequest, forbidden } from '../../lib/errors.js';
import { enqueueChain, voucherTypeOp } from '../../lib/outbox.js';
import { prisma } from '../../lib/prisma.js';
import { templateInclude, toApiTemplate } from '../vouchers/present.js';
import type { CreateVoucherBody } from './schemas.js';

async function approvedStore(userId: string) {
  const store = await prisma.store.findUnique({ where: { userId } });
  if (!store) throw forbidden('Không phải tài khoản cửa hàng');
  if (store.status !== 'approved') throw forbidden('Cửa hàng chưa được duyệt');
  return store;
}

export async function dashboard(userId: string) {
  const store = await prisma.store.findUnique({ where: { userId } });
  if (!store) throw forbidden('Không phải tài khoản cửa hàng');
  const [supply, usages] = await Promise.all([
    prisma.voucherTemplate.aggregate({ where: { storeId: userId }, _sum: { totalSupply: true } }),
    prisma.voucherUsage.findMany({
      where: { storeId: userId },
      orderBy: { usedAt: 'desc' },
      take: 10,
      include: { ownedVoucher: { include: { template: true, owner: true } } },
    }),
  ]);
  return {
    storeId: userId,
    storeName: store.storeName,
    totalVouchersCreated: supply._sum.totalSupply ?? 0, // quyết định #12: tổng số lượng phát hành
    totalVouchersUsed: store.totalUsages,
    totalFeesVnd: store.totalFeesVnd,
    recentUsages: usages.map((u) => ({
      voucherTitle: u.ownedVoucher.template.title,
      usedAt: u.usedAt.toISOString(),
      userName: u.ownedVoucher.owner.name,
    })),
    // Thêm (FE bỏ qua):
    approved: store.status === 'approved',
  };
}

/** Tạo voucher. Nhận cả tên field mới (questType/quantity/expiryDate) lẫn cũ — quyết định #16. */
export async function createVoucher(userId: string, b: z.output<typeof CreateVoucherBody>) {
  const now = clock.now();
  await approvedStore(userId);

  const quest = (b.questType ?? b.questDescription ?? '').trim() || null;
  const totalSupply = b.quantity ?? b.totalSupply;
  if (totalSupply === undefined || !Number.isInteger(totalSupply) || totalSupply <= 0) {
    throw badRequest('Số lượng phải là số nguyên dương');
  }
  const minRankIdx = rankIndex(b.minRank ?? 'đồng');
  if (minRankIdx === null) throw badRequest('Hạng tối thiểu không hợp lệ');
  const expiresAt = parseExpiryInput({ expiresAt: b.expiresAt, expiryDate: b.expiryDate }, now);
  if (!expiresAt) throw badRequest('Hạn sử dụng không hợp lệ (dd/mm/yyyy)');
  if (expiresAt.getTime() <= now.getTime()) throw badRequest('Hạn sử dụng phải ở tương lai');

  const t = await prisma.$transaction(async (tx) => {
    const created = await tx.voucherTemplate.create({
    data: {
      id: `vt-${randomBytes(6).toString('hex')}`,
      storeId: userId,
      title: b.title,
      description: b.description ?? '',
      priceTokens: b.priceTokens,
      discountPercent: b.discountPercent,
      questDescription: quest,
      questDiscountPercent: quest ? (b.questDiscountPercent ?? 0) : 0,
      totalSupply,
      remaining: totalSupply,
      minRankIdx,
      area: b.area?.trim() || null,
      expiresAt,
      imageUrl: null,
      createdAt: now,
    },
    include: templateInclude,
    });
    const merchant = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletAddress: true } });
    await enqueueChain(tx, voucherTypeOp(created, merchant.walletAddress), `voucher-type:${created.id}`);
    return created;
  });
  return toApiTemplate(t);
}

/** Quét QR = đốt voucher luôn (bước "Xác nhận" ở FE chỉ là hiệu ứng). Ghi phí 5.000đ. */
export async function scan(userId: string, qrCode: string) {
  const now = clock.now();
  await approvedStore(userId);
  return prisma.$transaction(async (tx) => {
    const v = await tx.ownedVoucher.findUnique({ where: { qrCode: qrCode.trim() }, include: { template: true, owner: true } });
    if (!v) throw badRequest('QR không hợp lệ');
    const err = redeemError({ status: v.status, storeId: v.template.storeId, expiresAt: v.template.expiresAt }, userId, now);
    if (err) throw badRequest(err);

    const burned = await tx.ownedVoucher.updateMany({
      where: { id: v.id, status: { in: ['owned', 'gifted'] } },
      data: { status: 'used', usedAt: now },
    });
    if (burned.count === 0) throw badRequest('Voucher đã được sử dụng');

    await tx.voucherUsage.create({ data: { ownedVoucherId: v.id, storeId: userId, userId: v.ownerId, usedAt: now, feeVnd: VOUCHER_USE_FEE_VND } });
    await tx.store.update({
      where: { userId },
      data: { totalUsages: { increment: 1 }, totalFeesVnd: { increment: VOUCHER_USE_FEE_VND } },
    });
    await enqueueChain(tx, { op: 'redeemVoucher', from: v.owner.walletAddress, templateId: v.templateId }, `usage:${v.id}`);
    return { success: true, voucherTitle: v.template.title, feeVnd: VOUCHER_USE_FEE_VND, userName: v.owner.name };
  });
}
