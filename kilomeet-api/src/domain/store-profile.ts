// Hồ sơ quán (hợp đồng Mục 8.2) — hàm thuần.

export const COVER_THEMES = ['coffee', 'tea', 'gym'] as const;
export type CoverTheme = (typeof COVER_THEMES)[number];

export interface OpeningHours {
  label: string;
  open: string;
  close: string;
  enabled: boolean;
}

export interface Highlight {
  name: string;
  priceVnd: number;
}

export const PROFILE_LIMITS = {
  tagline: 60,
  description: 500,
  tags: 6,
  highlights: 3,
  openingHours: 7,
  phone: 20,
  storeName: 60,
} as const;

/** Quán chưa khai giờ mở cửa thì trả 3 dòng mặc định (T2–T6 / Thứ 7 / Chủ nhật). */
export const DEFAULT_OPENING_HOURS: OpeningHours[] = [
  { label: 'T2 – T6', open: '06:00', close: '22:00', enabled: true },
  { label: 'Thứ 7', open: '06:30', close: '23:00', enabled: true },
  { label: 'Chủ nhật', open: '06:30', close: '23:00', enabled: true },
];

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** % lượt dùng voucher đến từ người đã chạy ngang quán (làm tròn). Chưa có lượt nào → 0. */
export function runnerSharePercent(totalUsages: number, questUsages: number): number {
  if (totalUsages <= 0) return 0;
  return Math.round((Math.min(questUsages, totalUsages) / totalUsages) * 100);
}
