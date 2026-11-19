// Mock — Store dashboard handlers
import type { StoreDashboard, VoucherTemplate } from '../types';
import { getCurrentUserId, MOCK_STORE } from './data';
import { VOUCHER_TEMPLATES } from './vouchers';
import { mockChargeFee, mockFeeSummary } from './fee';

export function mockGetStoreDashboard(): StoreDashboard {
  const userId = getCurrentUserId();
  if (userId !== MOCK_STORE.id) throw new Error('Không phải tài khoản cửa hàng');

  return {
    storeId: MOCK_STORE.id,
    storeName: MOCK_STORE.storeName,
    totalVouchersCreated: 100,
    totalVouchersUsed: 47,
    totalFeesVnd: 141_000,
    recentUsages: [
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-09T14:30:00Z', userName: 'Trần Minh', feeVnd: 3000 },
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-08T09:15:00Z', userName: 'Phạm Hoa', feeVnd: 3000 },
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-07T16:45:00Z', userName: 'Lê Tuấn', feeVnd: 3000 },
    ],
    fee: mockFeeSummary(),
  };
}

export function mockCreateVoucher(body: unknown): VoucherTemplate {
  // FE mới gửi questType / quantity / expiryDate (dd/mm/yyyy) — nhận cả tên cũ như BE (quyết định #16).
  const b = body as Partial<VoucherTemplate> & { questType?: string; quantity?: number; expiryDate?: string };
  const { title = '', description = '', priceTokens = 0, discountPercent = 0, minRank = 'đồng' } = b;
  const questDescription = b.questType ?? b.questDescription ?? null;
  const questDiscountPercent = questDescription ? (b.questDiscountPercent ?? 0) : 0;
  const totalSupply = b.quantity ?? b.totalSupply ?? 0;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(b.expiryDate ?? '');
  const expiresAt = b.expiresAt
    ?? (m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}T16:59:59.999Z` : new Date(Date.now() + 90 * 86_400_000).toISOString());

  const voucher: VoucherTemplate = {
    id: `vt-${Date.now()}`,
    storeId: MOCK_STORE.id,
    storeName: MOCK_STORE.storeName,
    storeLatitude: MOCK_STORE.latitude,
    storeLongitude: MOCK_STORE.longitude,
    title,
    description,
    priceTokens,
    discountPercent,
    questDescription,
    questDiscountPercent,
    totalSupply,
    remaining: totalSupply,
    minRank,
    expiresAt,
    imageUrl: null,
  };
  VOUCHER_TEMPLATES.push(voucher);
  return voucher;
}

export function mockScanQR(body: unknown): { success: boolean; voucherTitle: string; feeVnd: number } {
  const { qrCode } = body as { qrCode: string };
  // In mock, just acknowledge the scan
  return {
    success: true,
    voucherTitle: 'Giảm 20% toàn menu',
    feeVnd: mockChargeFee('Giảm 20% toàn menu'),
  };
}
