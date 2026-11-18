// Voucher: giá, điều kiện mua/tặng/quét (hợp đồng 5.4, 5.5, 6.4, 6.5).
import { DAY_MS, isDateKey, vnDateTime } from './time.js';

export const CLAIM_WINDOW_DAYS = 7;
export { VOUCHER_FEE_VND as VOUCHER_USE_FEE_VND } from './fee.js';
export const DEFAULT_VOUCHER_DAYS = 90;

/** Làm tròn giống JS ở FE: Math.round(price × (1 − %/100)). */
export function priceFor(priceTokens: number, questDiscountPercent: number, eligible: boolean): number {
  if (!eligible || questDiscountPercent <= 0) return priceTokens;
  return Math.round(priceTokens * (1 - questDiscountPercent / 100));
}

/** Quyền giảm giá còn hiệu lực trong 7 ngày kể từ lúc chạy ngang quán. */
export function claimWindowValid(claimedAt: Date, now: Date): boolean {
  const age = now.getTime() - claimedAt.getTime();
  return age >= 0 && age <= CLAIM_WINDOW_DAYS * DAY_MS;
}

export const claimExpiresAt = (claimedAt: Date) => new Date(claimedAt.getTime() + CLAIM_WINDOW_DAYS * DAY_MS);

export interface BuyCheckInput {
  now: Date;
  expiresAt: Date;
  remaining: number;
  minRankIdx: number;
  rankIdx: number;
  balance: number;
  price: number;
  storeApproved: boolean;
  templateArea: string | null;
  runnerArea: string | null;
}

/** Trả message lỗi tiếng Việt, hoặc null nếu mua được. */
export function buyError(b: BuyCheckInput): string | null {
  if (!b.storeApproved) return 'Cửa hàng không còn hoạt động';
  if (b.expiresAt.getTime() <= b.now.getTime()) return 'Voucher đã hết hạn';
  if (b.rankIdx < b.minRankIdx) return 'Chưa đủ hạng';
  if (b.templateArea && b.runnerArea && b.templateArea !== b.runnerArea) {
    return 'Voucher không áp dụng cho khu vực của bạn';
  }
  if (b.remaining <= 0) return 'Voucher đã hết';
  if (b.balance < b.price) return 'Không đủ token';
  return null;
}

type OwnedStatus = 'owned' | 'gifted' | 'used' | 'expired';

export function giftError(v: { status: OwnedStatus; giftedFrom: string | null; expiresAt: Date }, now: Date): string | null {
  if (v.status === 'used') return 'Chỉ có thể tặng voucher chưa dùng';
  if (v.status === 'expired' || v.expiresAt.getTime() <= now.getTime()) return 'Voucher đã hết hạn';
  if (v.status === 'gifted' || v.giftedFrom !== null) return 'Voucher đã được tặng một lần rồi';
  return null;
}

export function redeemError(
  v: { status: OwnedStatus; storeId: string; expiresAt: Date },
  scanningStoreId: string,
  now: Date,
): string | null {
  if (v.storeId !== scanningStoreId) return 'Voucher không thuộc cửa hàng này';
  if (v.status === 'used') return 'Voucher đã được sử dụng';
  if (v.status === 'expired' || v.expiresAt.getTime() <= now.getTime()) return 'Voucher đã hết hạn';
  return null;
}

/** Voucher trong ví đã quá hạn thì hiển thị `expired`. */
export function effectiveStatus(status: OwnedStatus, expiresAt: Date, now: Date): OwnedStatus {
  if ((status === 'owned' || status === 'gifted') && expiresAt.getTime() <= now.getTime()) return 'expired';
  return status;
}

/**
 * Hạn dùng khi cửa hàng tạo voucher (quyết định #16):
 * ISO → dùng luôn · 'dd/mm/yyyy' → 23:59:59 giờ VN ngày đó · rỗng → now + 90 ngày.
 * Trả null nếu sai định dạng.
 */
export function parseExpiryInput(input: { expiresAt?: string | null; expiryDate?: string | null }, now: Date): Date | null {
  const iso = input.expiresAt?.trim();
  if (iso) {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const s = input.expiryDate?.trim() ?? '';
  if (!s) return new Date(now.getTime() + DEFAULT_VOUCHER_DAYS * DAY_MS);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const key = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  if (!isDateKey(key)) return null;
  return new Date(vnDateTime(key, '23:59').getTime() + 59_999);
}
