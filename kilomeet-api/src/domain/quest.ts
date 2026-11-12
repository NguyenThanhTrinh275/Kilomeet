// Nhiệm vụ ngày/tuần (hợp đồng 6.3, quyết định #1–#4).

export const DAILY_QUEST_KM = 2;
export const DAILY_QUEST_REWARD = 10;
export const WEEKLY_TOKEN_PER_KM = 7;
export const WEEKLY_MIN_TARGET_KM = 5;

/**
 * Mục tiêu tuần = max(5, ceil(TB 4 tuần gần nhất × 1,1)). Thiếu tuần thì tính 0.
 * Làm tròn trước khi ceil để 13,6 × 1,1 = 14,960000000000001 vẫn ra 15.
 */
export function weeklyTarget(last4WeeksKm: readonly number[]): number {
  const weeks = [...last4WeeksKm.slice(0, 4)];
  while (weeks.length < 4) weeks.push(0);
  const avg = weeks.reduce((s, k) => s + k, 0) / 4;
  const raw = Math.round(avg * 1.1 * 1e6) / 1e6;
  return Math.max(WEEKLY_MIN_TARGET_KM, Math.ceil(raw));
}

export function weeklyReward(targetKm: number): number {
  return WEEKLY_TOKEN_PER_KM * targetKm;
}

/** Nhiệm vụ đạt khi tiến độ ≥ mục tiêu (so với sai số làm tròn). */
export function questReached(progressKm: number, targetKm: number): boolean {
  return progressKm + 1e-9 >= targetKm;
}

export const dailyQuestId = (userId: string, dayKey: string) => `quest-daily-${userId}-${dayKey}`;
export const weeklyQuestId = (userId: string, weekStart: string) => `quest-weekly-${userId}-${weekStart}`;
