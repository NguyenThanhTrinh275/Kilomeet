// Mock — Hồ sơ quán (trang giới thiệu quán cho người chạy, trang chỉnh sửa cho chủ quán).
import type { StoreProfile, StoreProfileUpdate } from '../types';
import { getCurrentUserId, MOCK_STORE } from './data';
import { VOUCHER_TEMPLATES } from './vouchers';

const DEFAULT_HOURS = [
  { label: 'T2 – T6', open: '06:00', close: '22:00', enabled: true },
  { label: 'Thứ 7', open: '06:30', close: '23:00', enabled: true },
  { label: 'Chủ nhật', open: '06:30', close: '23:00', enabled: true },
];

const PROFILES: Record<string, StoreProfile> = {
  [MOCK_STORE.id]: {
    storeId: MOCK_STORE.id,
    storeName: MOCK_STORE.storeName,
    tagline: 'Cà phê rang xay cạnh HCMUT',
    description:
      'Fuji Coffee là quán cà phê nhỏ do hai cựu sinh viên Bách Khoa mở. Hạt cà phê được rang mỗi sáng ngay tại quán.\n\nQuán mở từ 6:00 để đón người chạy sáng sớm quanh HCMUT: có nước lọc miễn phí, chỗ gửi xe và góc ngồi ngoài trời để giãn cơ sau buổi chạy.',
    address: MOCK_STORE.storeAddress,
    latitude: MOCK_STORE.latitude,
    longitude: MOCK_STORE.longitude,
    coverTheme: 'coffee',
    tags: ['Cà phê', 'Wifi', 'Gửi xe', 'Ngồi ngoài trời', 'Nước free cho runner'],
    openingHours: DEFAULT_HOURS,
    highlights: [
      { name: 'Cà phê muối', priceVnd: 35_000 },
      { name: 'Cold brew cam sả', priceVnd: 45_000 },
    ],
    phone: '0909 123 456',
    verified: true,
    totalUsages: MOCK_STORE.totalUsages,
    runnerSharePercent: 62,
  },
};

function fallbackProfile(storeId: string): StoreProfile {
  const t = VOUCHER_TEMPLATES.find((v) => v.storeId === storeId);
  if (!t) throw new Error('Không tìm thấy cửa hàng');
  const tea = /trà|tea|juice|phúc long/i.test(t.storeName);
  const food = /bánh|mì|food/i.test(t.storeName);
  return {
    storeId,
    storeName: t.storeName,
    tagline: tea ? 'Trà & nước ép mát lạnh sau buổi chạy' : food ? 'Bữa sáng nhanh cho dân chạy bộ' : 'Cà phê ngon gần đường chạy',
    description: `${t.storeName} là đối tác của KILOMeet. Chạy ngang quán trong bán kính 50 m để mở ưu đãi voucher dành riêng cho người chạy bộ.`,
    address: 'Quận 10, TP.HCM',
    latitude: t.storeLatitude,
    longitude: t.storeLongitude,
    coverTheme: tea ? 'tea' : 'coffee',
    tags: tea ? ['Trà', 'Nước ép', 'Mang đi'] : food ? ['Ăn sáng', 'Mang đi'] : ['Cà phê', 'Wifi'],
    openingHours: DEFAULT_HOURS,
    highlights: [],
    phone: '',
    verified: true,
    totalUsages: 12,
    runnerSharePercent: 40,
  };
}

export function mockGetStoreProfile(params?: Record<string, string>): StoreProfile {
  const storeId = params?.storeId;
  if (!storeId) throw new Error('Thiếu storeId');
  return PROFILES[storeId] ?? fallbackProfile(storeId);
}

export function mockGetMyStoreProfile(): StoreProfile {
  if (getCurrentUserId() !== MOCK_STORE.id) throw new Error('Không phải tài khoản cửa hàng');
  return PROFILES[MOCK_STORE.id]!;
}

export function mockUpdateMyStoreProfile(body: unknown): StoreProfile {
  if (getCurrentUserId() !== MOCK_STORE.id) throw new Error('Không phải tài khoản cửa hàng');
  const b = body as Partial<StoreProfileUpdate>;
  if (b.tagline && b.tagline.length > 60) throw new Error('Câu giới thiệu ngắn tối đa 60 ký tự');
  if (b.description && b.description.length > 500) throw new Error('Giới thiệu chi tiết tối đa 500 ký tự');
  const cur = PROFILES[MOCK_STORE.id]!;
  PROFILES[MOCK_STORE.id] = { ...cur, ...b, storeId: cur.storeId };
  return PROFILES[MOCK_STORE.id]!;
}
