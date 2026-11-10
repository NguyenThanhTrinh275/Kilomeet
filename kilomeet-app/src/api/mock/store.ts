// Mock — Store dashboard handlers
import type { StoreDashboard, VoucherTemplate } from '../types';
import { getCurrentUserId, MOCK_STORE } from './data';
import { VOUCHER_TEMPLATES } from './vouchers';

export function mockGetStoreDashboard(): StoreDashboard {
  const userId = getCurrentUserId();
  if (userId !== MOCK_STORE.id) throw new Error('Không phải tài khoản cửa hàng');

  return {
    storeId: MOCK_STORE.id,
    storeName: MOCK_STORE.storeName,
    totalVouchersCreated: 100,
    totalVouchersUsed: 47,
    totalFeesVnd: 235_000,
    recentUsages: [
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-09T14:30:00Z', userName: 'Trần Minh' },
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-08T09:15:00Z', userName: 'Phạm Hoa' },
      { voucherTitle: 'Giảm 20% toàn menu', usedAt: '2026-11-07T16:45:00Z', userName: 'Lê Tuấn' },
    ],
  };
}

export function mockCreateVoucher(body: unknown): VoucherTemplate {
  const { title, description, priceTokens, discountPercent, questDescription, questDiscountPercent, totalSupply, minRank, expiresAt } =
    body as Omit<VoucherTemplate, 'id' | 'storeId' | 'storeName' | 'storeLatitude' | 'storeLongitude' | 'remaining' | 'imageUrl'>;

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
    feeVnd: 5_000,
  };
}
