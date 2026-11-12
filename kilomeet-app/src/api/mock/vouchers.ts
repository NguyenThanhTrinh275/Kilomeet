// Mock — Voucher handlers
import type { VoucherTemplate, OwnedVoucher, VoucherStatus } from '../types';
import { getCurrentUserId, MOCK_RUNNERS } from './data';

const HCMUT = { lat: 10.773, lng: 106.660 };

export const VOUCHER_TEMPLATES: VoucherTemplate[] = [
  {
    id: 'vt-1',
    storeId: 'store-fuji',
    storeName: 'Fuji Coffee',
    storeLatitude: HCMUT.lat,
    storeLongitude: HCMUT.lng,
    title: 'Giảm 20% toàn menu',
    description: 'Áp dụng cho tất cả đồ uống tại Fuji Coffee',
    priceTokens: 500,
    discountPercent: 20,
    questDescription: 'Chạy ngang qua quán',
    questDiscountPercent: 50,
    totalSupply: 100,
    remaining: 73,
    minRank: 'đồng',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
  {
    id: 'vt-2',
    storeId: 'store-highlands',
    storeName: 'Highlands Coffee',
    storeLatitude: 10.775,
    storeLongitude: 106.662,
    title: 'Trà đào miễn phí size M',
    description: 'Đổi 1 ly trà đào cam sả size M',
    priceTokens: 300,
    discountPercent: 100,
    questDescription: 'Chạy ngang qua quán',
    questDiscountPercent: 30,
    totalSupply: 50,
    remaining: 32,
    minRank: 'bạc',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
  {
    id: 'vt-3',
    storeId: 'store-phuclong',
    storeName: 'Phúc Long',
    storeLatitude: 10.771,
    storeLongitude: 106.658,
    title: 'Giảm 30% trà sữa',
    description: 'Áp dụng cho các loại trà sữa',
    priceTokens: 400,
    discountPercent: 30,
    questDescription: null,
    questDiscountPercent: 0,
    totalSupply: 80,
    remaining: 55,
    minRank: 'đồng',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
  {
    id: 'vt-4',
    storeId: 'store-cong',
    storeName: 'Cộng Cà Phê',
    storeLatitude: 10.776,
    storeLongitude: 106.664,
    title: 'Mua 1 tặng 1',
    description: 'Mua 1 ly bất kỳ, tặng 1 ly cùng loại',
    priceTokens: 600,
    discountPercent: 50,
    questDescription: 'Chạy ngang qua quán',
    questDiscountPercent: 40,
    totalSupply: 30,
    remaining: 18,
    minRank: 'vàng',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
  {
    id: 'vt-5',
    storeId: 'store-banhmi',
    storeName: 'Bánh Mì Huỳnh Hoa',
    storeLatitude: 10.770,
    storeLongitude: 106.656,
    title: 'Giảm 15k bánh mì đặc biệt',
    description: 'Giảm 15.000đ cho bánh mì thập cẩm đặc biệt',
    priceTokens: 200,
    discountPercent: 15,
    questDescription: 'Chạy ngang qua quán',
    questDiscountPercent: 50,
    totalSupply: 200,
    remaining: 145,
    minRank: 'đồng',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
  {
    id: 'vt-6',
    storeId: 'store-juice',
    storeName: 'Juice Factory',
    storeLatitude: 10.774,
    storeLongitude: 106.661,
    title: 'Smoothie bowl miễn phí',
    description: 'Đổi 1 smoothie bowl trái cây tùy chọn',
    priceTokens: 450,
    discountPercent: 100,
    questDescription: null,
    questDiscountPercent: 0,
    totalSupply: 40,
    remaining: 28,
    minRank: 'bạch_kim',
    expiresAt: '2026-12-31T23:59:59Z',
    imageUrl: null,
  },
];

// Minh owns 2 vouchers
const ownedVouchers: OwnedVoucher[] = [
  {
    id: 'ov-1',
    templateId: 'vt-1',
    template: VOUCHER_TEMPLATES[0],
    ownerId: 'user-minh',
    status: 'owned',
    purchasedAt: '2026-11-05T10:00:00Z',
    questCompletedAt: '2026-11-04T07:30:00Z',
    paidTokens: 250,
    giftedFrom: null,
    usedAt: null,
    qrCode: 'KILO-OV1-MINH',
  },
  {
    id: 'ov-2',
    templateId: 'vt-3',
    template: VOUCHER_TEMPLATES[2],
    ownerId: 'user-minh',
    status: 'owned',
    purchasedAt: '2026-11-08T14:00:00Z',
    questCompletedAt: null,
    paidTokens: 400,
    giftedFrom: null,
    usedAt: null,
    qrCode: 'KILO-OV2-MINH',
  },
];

export function mockGetVouchers(params?: Record<string, string>): VoucherTemplate[] {
  if (params?.storeId) {
    return VOUCHER_TEMPLATES.filter((v) => v.storeId === params.storeId);
  }
  return VOUCHER_TEMPLATES;
}

export function mockGetMyVouchers(): OwnedVoucher[] {
  const userId = getCurrentUserId();
  return ownedVouchers.filter((v) => v.ownerId === userId);
}

export function mockBuyVoucher(body: unknown): OwnedVoucher {
  const { templateId, questCompleted } = body as { templateId: string; questCompleted?: boolean };
  const userId = getCurrentUserId();
  const template = VOUCHER_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error('Voucher không tồn tại');
  if (template.remaining <= 0) throw new Error('Voucher đã hết');

  const price = questCompleted
    ? Math.round(template.priceTokens * (1 - template.questDiscountPercent / 100))
    : template.priceTokens;

  // Check runner balance
  const runner = MOCK_RUNNERS[userId];
  if (runner && runner.tokenBalance < price) throw new Error('Không đủ token');

  template.remaining--;
  if (runner) runner.tokenBalance -= price;

  const voucher: OwnedVoucher = {
    id: `ov-${Date.now()}`,
    templateId,
    template,
    ownerId: userId,
    status: 'owned',
    purchasedAt: new Date().toISOString(),
    questCompletedAt: questCompleted ? new Date().toISOString() : null,
    paidTokens: price,
    giftedFrom: null,
    usedAt: null,
    qrCode: `KILO-${Date.now()}-${userId}`,
  };
  ownedVouchers.push(voucher);
  return voucher;
}

export function mockGiftVoucher(body: unknown): OwnedVoucher {
  const { voucherId, toUserId } = body as { voucherId: string; toUserId: string };
  const userId = getCurrentUserId();
  const voucher = ownedVouchers.find((v) => v.id === voucherId && v.ownerId === userId);
  if (!voucher) throw new Error('Voucher không tìm thấy');
  if (voucher.status !== 'owned') throw new Error('Chỉ có thể tặng voucher chưa dùng');
  if (voucher.giftedFrom) throw new Error('Voucher đã được tặng một lần rồi');

  // Nhận email hoặc user ID như BE.
  const recipient = Object.values(MOCK_RUNNERS).find((r) => r.email === toUserId.trim().toLowerCase() || r.id === toUserId);
  if (!recipient) throw new Error('Không tìm thấy người nhận');
  voucher.ownerId = recipient.id;
  voucher.giftedFrom = userId;
  voucher.status = 'gifted';
  return voucher;
}
