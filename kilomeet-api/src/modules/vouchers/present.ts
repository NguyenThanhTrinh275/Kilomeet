import type { OwnedVoucher, Store, VoucherTemplate } from '@prisma/client';
import { effectiveStatus } from '../../domain/pricing.js';
import { rankName } from '../../domain/rank.js';
import { storeCanSell } from '../store/fee.js';

export type TemplateWithStore = VoucherTemplate & { store: { store: Store | null } };
export const templateInclude = { store: { include: { store: true } } } as const;

export function toApiTemplate(t: TemplateWithStore) {
  const s = t.store.store;
  return {
    id: t.id,
    storeId: t.storeId,
    storeName: s?.storeName ?? '',
    storeLatitude: s?.lat ?? 0,
    storeLongitude: s?.lng ?? 0,
    title: t.title,
    description: t.description,
    priceTokens: t.priceTokens,
    discountPercent: t.discountPercent,
    questDescription: t.questDescription,
    questDiscountPercent: t.questDiscountPercent,
    totalSupply: t.totalSupply,
    remaining: t.remaining,
    minRank: rankName(t.minRankIdx),
    expiresAt: t.expiresAt.toISOString(),
    imageUrl: t.imageUrl,
    // Thêm (FE bỏ qua):
    area: t.area,
    chainTokenId: t.chainTokenId,
    /** Còn số lượng nhưng ví phí của quán không đủ giữ phí → FE hiện "Tạm hết" (quyết định #28). */
    pausedForFee: t.remaining > 0 && !storeCanSell(s),
  };
}

export function toApiOwned(v: OwnedVoucher & { template: TemplateWithStore }, now: Date) {
  return {
    id: v.id,
    templateId: v.templateId,
    template: toApiTemplate(v.template),
    ownerId: v.ownerId,
    status: effectiveStatus(v.status, v.template.expiresAt, now),
    purchasedAt: v.purchasedAt.toISOString(),
    questCompletedAt: v.questCompletedAt?.toISOString() ?? null,
    paidTokens: v.paidTokens,
    giftedFrom: v.giftedFrom,
    usedAt: v.usedAt?.toISOString() ?? null,
    qrCode: v.qrCode,
  };
}
