// Hàm thuần về hạng (hợp đồng 6.1, 6.2). DB lưu chỉ số 0–5, API dùng chuỗi tiếng Việt NFC.
import { RANKS, type Rank } from '../contract/schemas.js';

export { RANKS, type Rank };

export const RANK_KM_THRESHOLD = [0, 5, 10, 15, 25, 40] as const;
export const RANK_TOKEN_RETENTION = [0, 100, 200, 300, 400, 500] as const;
export const MAX_RANK_IDX = RANKS.length - 1;

export function rankName(idx: number): Rank {
  const r = RANKS[idx];
  if (r === undefined) throw new RangeError(`rank index out of range: ${idx}`);
  return r;
}

/** Chuỗi hạng từ FE → chỉ số. Chuẩn hoá NFC để 'bạch_kim' NFD vẫn khớp. */
export function rankIndex(name: string): number | null {
  const i = (RANKS as readonly string[]).indexOf(name.normalize('NFC'));
  return i === -1 ? null : i;
}

/** Mức tuần: hạng cao nhất có ngưỡng ≤ km. */
export function levelOf(km: number): number {
  let lvl = 0;
  RANK_KM_THRESHOLD.forEach((t, i) => {
    if (km + 1e-9 >= t) lvl = i;
  });
  return lvl;
}

export interface WeekInput {
  /** Hạng hiện tại */
  cur: number;
  /** Km tuần đang chấm */
  km: number;
  skipWeekAvailable: boolean;
  /**
   * Level các tuần liên tiếp ngay trước tuần này, CÙNG MÙA, sau tuần được miễn gần nhất,
   * cũ → mới. Chỉ cần 2 phần tử cuối.
   */
  streak: readonly number[];
  /** Hạng cao nhất mùa này (null = chưa có) */
  seasonBadge: number | null;
}

export interface WeekOutcome {
  level: number;
  next: number;
  skipUsed: boolean;
  skipWeekAvailable: boolean;
  seasonBadge: number;
}

/** Chấm một tuần: lên từ từ / lên nhanh / giữ / tụt (quyết định #5, #6, #7). */
export function nextRank(w: WeekInput): WeekOutcome {
  const L = levelOf(w.km);
  const { cur } = w;
  let next = cur;
  let skipUsed = false;
  let skipWeekAvailable = w.skipWeekAvailable;

  if (L > cur) {
    next = cur + 1;
    if (w.streak.length >= 2) {
      const a = w.streak[w.streak.length - 2]!;
      const b = w.streak[w.streak.length - 1]!;
      next = Math.max(next, Math.min(a, b, L));
    }
  } else if (L < cur) {
    if (skipWeekAvailable) {
      skipWeekAvailable = false;
      skipUsed = true;
    } else {
      next = Math.max(cur - 1, 0);
    }
  }
  // Người đang Đồng không thể L < cur → không bao giờ tốn lượt miễn.

  return {
    level: L,
    next,
    skipUsed,
    skipWeekAvailable,
    seasonBadge: Math.max(w.seasonBadge ?? next, next),
  };
}

export interface SeasonResetOutcome {
  tokenBalance: number;
  burned: number;
  rankIdx: number;
  badgeIdx: number;
}

/** Cuối mùa: giữ token tối đa theo hạng lúc hết mùa, rồi tụt 2 bậc (hợp đồng 6.2). */
export function seasonReset(p: { rankIdx: number; tokenBalance: number; seasonBadge: number | null }): SeasonResetOutcome {
  const cap = RANK_TOKEN_RETENTION[p.rankIdx] ?? 0;
  const tokenBalance = Math.min(p.tokenBalance, cap);
  return {
    tokenBalance,
    burned: p.tokenBalance - tokenBalance,
    rankIdx: Math.max(p.rankIdx - 2, 0),
    badgeIdx: Math.max(p.seasonBadge ?? p.rankIdx, p.rankIdx),
  };
}
