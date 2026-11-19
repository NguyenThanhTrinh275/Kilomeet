import { describe, expect, it } from 'vitest';
import { DEFAULT_OPENING_HOURS, HHMM, runnerSharePercent } from '../../src/domain/store-profile.js';

describe('runnerSharePercent', () => {
  it('chưa có lượt dùng → 0', () => expect(runnerSharePercent(0, 0)).toBe(0));
  it('5/8 → 63 (làm tròn)', () => expect(runnerSharePercent(8, 5)).toBe(63));
  it('không vượt 100', () => expect(runnerSharePercent(3, 9)).toBe(100));
});

describe('giờ mở cửa', () => {
  it('mặc định 3 dòng T2–T6 / Thứ 7 / Chủ nhật', () => {
    expect(DEFAULT_OPENING_HOURS.map((h) => h.label)).toEqual(['T2 – T6', 'Thứ 7', 'Chủ nhật']);
  });
  it('HH:mm hợp lệ', () => {
    expect(['06:00', '23:59', '00:00'].every((s) => HHMM.test(s))).toBe(true);
    expect(['6:00', '24:00', '12:60', '1200'].some((s) => HHMM.test(s))).toBe(false);
  });
});
