// Mùa: T1–T4, T5–T8, T9–T12 (giờ VN).
import { DAY_MS, vnDateTime, vnYearMonth } from './time.js';

export interface SeasonDef {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export function seasonDef(year: number, n: 1 | 2 | 3): SeasonDef {
  const startMonth = (n - 1) * 4 + 1;
  const endMonth = startMonth + 3;
  return {
    id: `season-${year}-${n}`,
    name: `Mùa ${n}/${year}`,
    startDate: `${year}-${pad(startMonth)}-01`,
    endDate: `${year}-${pad(endMonth)}-${pad(lastDay(year, endMonth))}`,
  };
}

export function seasonOf(d: Date): SeasonDef {
  const { year, month } = vnYearMonth(d);
  return seasonDef(year, (Math.floor((month - 1) / 4) + 1) as 1 | 2 | 3);
}

export function nextSeason(s: SeasonDef): SeasonDef {
  const [, y, n] = /^season-(\d+)-(\d)$/.exec(s.id) ?? [];
  const year = Number(y);
  const num = Number(n);
  return num === 3 ? seasonDef(year + 1, 1) : seasonDef(year, (num + 1) as 2 | 3);
}

/** Số mùa ghi trên SeasonBadge (uint): `season-2026-3` → 20263. Không phụ thuộc bộ đếm mùa của RunToken. */
export function chainSeasonNumber(seasonId: string): number {
  const m = /^season-(\d+)-(\d)$/.exec(seasonId);
  if (!m) throw new Error(`Mã mùa không hợp lệ: ${seasonId}`);
  return Number(m[1]) * 10 + Number(m[2]);
}

/** Số ngày còn lại tới hết 23:59:59 ngày cuối mùa (làm tròn lên, tối thiểu 0). */
export function daysLeft(endDate: string, now: Date): number {
  const end = vnDateTime(endDate, '23:59').getTime() + 59_999;
  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS));
}

export const SEASON_REMINDER_DAYS = 7;
