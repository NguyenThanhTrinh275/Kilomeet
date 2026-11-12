import { describe, expect, it } from 'vitest';
import { endOfVnDay, endOfVnWeek, vnDateTime, vnDayKey, vnWeekStart } from '../../src/domain/time.js';

describe('giờ Việt Nam', () => {
  it('05:30 sáng thứ Hai giờ VN (= 22:30 CN UTC) thuộc thứ Hai', () => {
    const d = new Date('2026-11-15T22:30:00Z');
    expect(vnDayKey(d)).toBe('2026-11-16');
    expect(vnWeekStart(d)).toBe('2026-11-16');
  });

  it('CN 23:59 giờ VN vẫn thuộc tuần bắt đầu thứ Hai trước đó', () => {
    const d = new Date('2026-11-15T16:59:00Z');
    expect(vnDayKey(d)).toBe('2026-11-15');
    expect(vnWeekStart(d)).toBe('2026-11-09');
    expect(endOfVnWeek(d).toISOString()).toBe('2026-11-15T16:59:59.999Z');
  });

  it('cuối ngày VN = 16:59:59.999Z', () => {
    expect(endOfVnDay(new Date('2026-11-11T01:00:00Z')).toISOString()).toBe('2026-11-11T16:59:59.999Z');
  });

  it('ngày + khung giờ VN → UTC', () => {
    expect(vnDateTime('2026-11-20', '05:30').toISOString()).toBe('2026-11-19T22:30:00.000Z');
  });
});
