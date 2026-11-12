// Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh = UTC+7 cố định (VN không có giờ mùa hè).
// Ngày/tuần dạng khoá 'YYYY-MM-DD'. Tuần bắt đầu thứ Hai 00:00 giờ VN.

export const VN_OFFSET_MS = 7 * 3600_000;
export const DAY_MS = 86_400_000;
export const MINUTE_MS = 60_000;

/** Ngày giờ VN của `d` (dùng các getter UTC*). */
const vn = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS);

/** 'YYYY-MM-DD' theo giờ VN. */
export function vnDayKey(d: Date): string {
  return vn(d).toISOString().slice(0, 10);
}

/** Thời điểm tuyệt đối của 00:00 giờ VN ngày `key`. */
export function vnDayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - VN_OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Thứ Hai (giờ VN) của tuần chứa `d`. */
export function vnWeekStart(d: Date): string {
  const v = vn(d);
  const dow = (v.getUTCDay() + 6) % 7; // 0 = thứ Hai
  return addDays(v.toISOString().slice(0, 10), -dow);
}

/** 23:59:59.999 giờ VN của ngày chứa `d`. */
export function endOfVnDay(d: Date): Date {
  return new Date(vnDayStart(addDays(vnDayKey(d), 1)).getTime() - 1);
}

/** Chủ nhật 23:59:59.999 giờ VN của tuần chứa `d`. */
export function endOfVnWeek(d: Date): Date {
  return new Date(vnDayStart(addDays(vnWeekStart(d), 7)).getTime() - 1);
}

/** 'YYYY-MM-DD' + 'HH:mm' giờ VN → thời điểm tuyệt đối. */
export function vnDateTime(dateKey: string, hhmm: string): Date {
  return new Date(Date.parse(`${dateKey}T${hhmm}:00.000Z`) - VN_OFFSET_MS);
}

/** Tháng (1–12) và năm theo giờ VN. */
export function vnYearMonth(d: Date): { year: number; month: number } {
  const v = vn(d);
  return { year: v.getUTCFullYear(), month: v.getUTCMonth() + 1 };
}

export function isDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && vnDayKey(vnDayStart(s)) === s;
}
