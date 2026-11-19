import { randomBytes } from 'node:crypto';
import type { VoucherQuestClaim, VoucherTemplate } from '@prisma/client';
import { haversineKm } from '../../domain/geo.js';
import { buyError, claimWindowValid, CLAIM_WINDOW_DAYS, giftError, priceFor } from '../../domain/pricing.js';
import { DAY_MS } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { AppError, badRequest, conflict, notFound } from '../../lib/errors.js';
import { applyTokenDelta } from '../../lib/ledger.js';
import { enqueueChain } from '../../lib/outbox.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { holdFee } from '../store/fee.js';
import { templateInclude, toApiOwned, toApiTemplate } from './present.js';

export const newQrCode = (ownedId: string) => `KM-${ownedId}-${randomBytes(8).toString('hex')}`;

/**
 * Quyền giảm giá của `userId` cho mẫu `t` (hợp đồng 6.4, quyết định #10):
 * có nhiệm vụ · đã chạy ngang quán trong 7 ngày (lượt chưa dùng) · chưa từng mua giảm giá mẫu này.
 */
async function findEligibleClaim(tx: Tx | typeof prisma, userId: string, t: VoucherTemplate, now: Date) {
  if (!t.questDescription || t.questDiscountPercent <= 0) return null;
  const usedBefore = await tx.voucherQuestClaim.findFirst({ where: { userId, usedForTemplateId: t.id } });
  if (usedBefore) return null;
  const claims = await tx.voucherQuestClaim.findMany({
    where: { userId, storeId: t.storeId, usedForTemplateId: null, claimedAt: { gte: new Date(now.getTime() - CLAIM_WINDOW_DAYS * DAY_MS), lte: now } },
    orderBy: { claimedAt: 'asc' }, // dùng lượt sắp hết hạn trước
  });
  return claims.find((c) => claimWindowValid(c.claimedAt, now)) ?? null;
}

/** GET /vouchers: voucher đang bán (hoặc mọi voucher của 1 quán) + myQuestEligible, myPrice. */
export async function listTemplates(viewer: { id: string; role: string }, q: { storeId?: string; lat?: number; lng?: number }) {
  const now = clock.now();
  const templates = await prisma.voucherTemplate.findMany({
    where: q.storeId
      ? { storeId: q.storeId }
      : { expiresAt: { gt: now }, store: { store: { status: 'approved' } } },
    include: templateInclude,
    orderBy: { createdAt: 'desc' },
  });

  const isRunner = viewer.role === 'runner' || viewer.role === 'member';
  const claims: VoucherQuestClaim[] = isRunner
    ? await prisma.voucherQuestClaim.findMany({ where: { userId: viewer.id } })
    : [];

  const out = templates.map((t) => {
    const usedForThis = claims.some((c) => c.usedForTemplateId === t.id);
    const eligible =
      isRunner && !!t.questDescription && t.questDiscountPercent > 0 && !usedForThis &&
      claims.some((c) => c.storeId === t.storeId && c.usedForTemplateId === null && claimWindowValid(c.claimedAt, now));
    const s = t.store.store;
    return {
      ...toApiTemplate(t),
      myQuestEligible: eligible,
      myPrice: priceFor(t.priceTokens, t.questDiscountPercent, eligible),
      distanceM: q.lat !== undefined && q.lng !== undefined && s
        ? Math.round(haversineKm({ latitude: q.lat, longitude: q.lng }, { latitude: s.lat, longitude: s.lng }) * 1000)
        : null,
    };
  });
  if (q.lat !== undefined && q.lng !== undefined) out.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  return out;
}

export async function myVouchers(userId: string) {
  const now = clock.now();
  // Voucher quá hạn → expired (lưu luôn vào DB).
  await prisma.ownedVoucher.updateMany({
    where: { ownerId: userId, status: { in: ['owned', 'gifted'] }, template: { expiresAt: { lte: now } } },
    data: { status: 'expired' },
  });
  const list = await prisma.ownedVoucher.findMany({
    where: { ownerId: userId },
    include: { template: { include: templateInclude } },
    orderBy: { purchasedAt: 'desc' },
  });
  return list.map((v) => toApiOwned(v, now));
}

/**
 * Mua voucher. Bỏ qua `questCompleted` FE gửi; tự xét quyền giảm giá.
 * Trừ số lượng + số dư bằng UPDATE có điều kiện → 2 request cùng lúc không bán quá.
 */
export async function buy(userId: string, templateId: string) {
  const now = clock.now();
  const owned = await prisma.$transaction(async (tx) => {
    const t = await tx.voucherTemplate.findUnique({ where: { id: templateId }, include: templateInclude });
    if (!t) throw notFound('Voucher không tồn tại');
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true } });
    const profile = user.runner!;

    const claim = await findEligibleClaim(tx, userId, t, now);
    const price = priceFor(t.priceTokens, t.questDiscountPercent, !!claim);
    const err = buyError({
      now, expiresAt: t.expiresAt, remaining: t.remaining, minRankIdx: t.minRankIdx, rankIdx: profile.rankIdx,
      balance: profile.tokenBalance, price, storeApproved: t.store.store?.status === 'approved',
      templateArea: t.area, runnerArea: profile.area,
    });
    if (err) throw badRequest(err);

    const dec = await tx.voucherTemplate.updateMany({ where: { id: t.id, remaining: { gt: 0 } }, data: { remaining: { decrement: 1 } } });
    if (dec.count === 0) throw conflict('Voucher đã hết');
    if (price > 0) {
      const pay = await tx.runnerProfile.updateMany({
        where: { userId, tokenBalance: { gte: price } },
        data: { tokenBalance: { decrement: price } },
      });
      if (pay.count === 0) throw badRequest('Không đủ token'); // rollback cả lần trừ số lượng
    }
    if (claim) {
      const use = await tx.voucherQuestClaim.updateMany({
        where: { id: claim.id, usedForTemplateId: null },
        data: { usedForTemplateId: t.id },
      });
      if (use.count === 0) throw conflict('Vui lòng thử lại');
    }

    const id = `ov-${randomBytes(6).toString('hex')}`;
    // Ví phí trả trước (quyết định #28): giữ phí lượt dùng trong ví quán; ví không đủ → "Tạm hết", rollback cả lượt mua.
    const feeHeldVnd = await holdFee(tx, t.storeId, id, now);
    const created = await tx.ownedVoucher.create({
      data: {
        id, templateId: t.id, ownerId: userId, buyerId: userId, status: 'owned', purchasedAt: now,
        questCompletedAt: claim?.claimedAt ?? null, paidTokens: price, discounted: !!claim, qrCode: newQrCode(id),
        feeHeldVnd,
      },
      include: { template: { include: templateInclude } },
    });
    if (price > 0) {
      await applyTokenDelta(tx, { userId, wallet: user.walletAddress, delta: -price, reason: 'buy', refId: id, skipBalanceUpdate: true });
    }
    // Chain tự đốt giá (làm tròn xuống) khi discounted; chỉ xin giảm khi mẫu có giảm giá nhiệm vụ.
    const discounted = !!claim && t.questDiscountPercent > 0;
    await enqueueChain(tx, { op: 'purchaseVoucher', to: user.walletAddress, templateId: t.id, discounted }, `voucher:${id}`);
    return created;
  });
  return toApiOwned(owned, now);
}

/** Tặng 1 lần. `to` là user ID hoặc email. Sinh lại qrCode để người tặng không dùng mã cũ. */
export async function gift(userId: string, voucherId: string, to: string) {
  const now = clock.now();
  const updated = await prisma.$transaction(async (tx) => {
    const v = await tx.ownedVoucher.findFirst({ where: { id: voucherId, ownerId: userId }, include: { template: true } });
    if (!v) throw notFound('Voucher không tìm thấy');
    const err = giftError({ status: v.status, giftedFrom: v.giftedFrom, expiresAt: v.template.expiresAt }, now);
    if (err) throw badRequest(err);

    const key = to.trim();
    const recipient = await tx.user.findFirst({ where: { OR: [{ id: key }, { email: key.toLowerCase() }] } });
    if (!recipient || (recipient.role !== 'runner' && recipient.role !== 'member')) {
      throw notFound('Không tìm thấy người nhận');
    }
    if (recipient.id === userId) throw badRequest('Không thể tự tặng voucher cho mình');

    const moved = await tx.ownedVoucher.updateMany({
      where: { id: v.id, ownerId: userId, status: 'owned', giftedFrom: null },
      data: { ownerId: recipient.id, giftedFrom: userId, status: 'gifted', qrCode: newQrCode(v.id) },
    });
    if (moved.count === 0) throw badRequest('Voucher đã được tặng một lần rồi');

    const giver = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await enqueueChain(
      tx,
      { op: 'giftVoucher', from: giver.walletAddress, to: recipient.walletAddress, templateId: v.templateId },
      `gift:${v.id}`,
    );
    return tx.ownedVoucher.findUniqueOrThrow({ where: { id: v.id }, include: { template: { include: templateInclude } } });
  });
  return toApiOwned(updated, now);
}

export function assertPositiveInt(n: number, msg: string): void {
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, msg);
}
