import { describe, expect, it } from 'vitest';
import { questReached, weeklyReward, weeklyTarget } from '../../src/domain/quest.js';

describe('nhiệm vụ tuần (6.3)', () => {
  it('TB 13,6 km → 15 km / 105 token', () => {
    const t = weeklyTarget([13.6, 13.6, 13.6, 13.6]);
    expect(t).toBe(15);
    expect(weeklyReward(t)).toBe(105);
  });

  it('người mới (chưa có tuần nào) → 5 km / 35 token', () => {
    expect(weeklyTarget([])).toBe(5);
    expect(weeklyReward(5)).toBe(35);
  });

  it('TB 40 km → 44 km / 308 token', () => {
    const t = weeklyTarget([40, 40, 40, 40]);
    expect(t).toBe(44);
    expect(weeklyReward(t)).toBe(308);
  });

  it('thiếu tuần thì tính 0 (1 tuần 40 km → TB 10 → 11 km)', () => {
    expect(weeklyTarget([40])).toBe(11);
  });
});

describe('nhiệm vụ ngày (#1: cộng dồn trong ngày VN)', () => {
  it('1,2 + 0,9 km cùng ngày → xong', () => {
    expect(questReached(1.2 + 0.9, 2)).toBe(true);
  });
  it('1,9 km → chưa xong', () => {
    expect(questReached(1.9, 2)).toBe(false);
  });
});
