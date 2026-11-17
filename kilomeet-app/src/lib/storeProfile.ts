// Tải hồ sơ quán. BE chưa có endpoint thì dựng hồ sơ tối thiểu từ mẫu voucher để màn vẫn hiển thị.
import { api } from '../api/client';
import type { StoreProfile, VoucherTemplate } from '../api/types';

export async function loadStoreProfile(storeId: string, templates: VoucherTemplate[]): Promise<StoreProfile> {
  try {
    return await api.get<StoreProfile>('/stores/profile', { storeId });
  } catch {
    const t = templates.find((v) => v.storeId === storeId);
    if (!t) throw new Error('Không tìm thấy cửa hàng');
    return {
      storeId,
      storeName: t.storeName,
      tagline: 'Đối tác KILOMeet gần đường chạy',
      description: `${t.storeName} là đối tác của KILOMeet. Chạy ngang quán trong bán kính 50 m để mở ưu đãi voucher dành riêng cho người chạy bộ.`,
      address: '',
      latitude: t.storeLatitude,
      longitude: t.storeLongitude,
      coverTheme: 'coffee',
      tags: [],
      openingHours: [],
      highlights: [],
      phone: '',
      verified: true,
      totalUsages: 0,
      runnerSharePercent: 0,
    };
  }
}

/** Quán có đang mở theo giờ VN không (dựa vào openingHours). */
export function isOpenNow(p: StoreProfile, now = new Date()): { open: boolean; until?: string } {
  if (p.openingHours.length === 0) return { open: true };
  const vn = new Date(now.getTime() + 7 * 3600_000);
  const dow = vn.getUTCDay(); // 0 = CN
  const hhmm = `${String(vn.getUTCHours()).padStart(2, '0')}:${String(vn.getUTCMinutes()).padStart(2, '0')}`;
  const slot =
    p.openingHours.find((h) => (dow === 0 ? /chủ nhật|cn/i.test(h.label) : dow === 6 ? /thứ 7|t7/i.test(h.label) : /t2|thứ 2/i.test(h.label))) ??
    p.openingHours[0]!;
  if (!slot.enabled) return { open: false };
  return hhmm >= slot.open && hhmm < slot.close ? { open: true, until: slot.close } : { open: false };
}

/** Mức hoàn thiện hồ sơ quán (nhiệm vụ của quán). */
export function profileCompleteness(p: StoreProfile | null) {
  const items: [string, boolean][] = [
    ['Ảnh bìa', !!p?.coverTheme],
    ['Giới thiệu', (p?.description.trim().length ?? 0) >= 40],
    ['Giờ mở cửa', (p?.openingHours.length ?? 0) > 0],
    ['Thẻ tiện ích', (p?.tags.length ?? 0) > 0],
    ['3 món nổi bật', (p?.highlights.length ?? 0) >= 3],
  ];
  return { items, done: items.filter((i) => i[1]).length, total: items.length };
}
