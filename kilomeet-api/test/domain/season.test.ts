import { describe, expect, it } from 'vitest';
import { daysLeft, nextSeason, seasonOf } from '../../src/domain/season.js';

describe('mùa', () => {
  it('T9–T12 là mùa 3', () => {
    expect(seasonOf(new Date('2026-11-12T05:00:00Z'))).toEqual({
      id: 'season-2026-3', name: 'Mùa 3/2026', startDate: '2026-09-01', endDate: '2026-12-31',
    });
  });
  it('31/12 23:30 giờ VN vẫn mùa 3; 1/1 00:30 giờ VN là mùa 1 năm sau', () => {
    expect(seasonOf(new Date('2026-12-31T16:30:00Z')).id).toBe('season-2026-3');
    expect(seasonOf(new Date('2026-12-31T17:30:00Z')).id).toBe('season-2027-1');
  });
  it('mùa 2 kết thúc 31/8, mùa 1 kết thúc 30/4', () => {
    expect(seasonOf(new Date('2026-06-01T00:00:00Z')).endDate).toBe('2026-08-31');
    expect(seasonOf(new Date('2028-02-01T00:00:00Z')).endDate).toBe('2028-04-30');
  });
  it('mùa kế tiếp', () => {
    expect(nextSeason(seasonOf(new Date('2026-11-01T00:00:00Z'))).id).toBe('season-2027-1');
  });
  it('daysLeft: 12/11 → 31/12 còn 50 ngày', () => {
    expect(daysLeft('2026-12-31', new Date('2026-11-12T03:00:00Z'))).toBe(50);
  });
});
