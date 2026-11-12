import { describe, expect, it } from 'vitest';
import { autoMatch, dueMilestones, punctuality, rankCompatible, validSlot, type MatchCandidate } from '../../src/domain/group.js';

describe('rankCompatible (hai chiều)', () => {
  it('A chọn within1, B chọn same, chênh 1 → không ghép', () => {
    expect(rankCompatible({ rank: 3, range: 'within1' }, { rank: 4, range: 'same' })).toBe(false);
  });
  it('cả hai within1, chênh 1 → ghép', () => {
    expect(rankCompatible({ rank: 3, range: 'within1' }, { rank: 4, range: 'within1' })).toBe(true);
  });
  it('any + any, chênh 5 → ghép', () => {
    expect(rankCompatible({ rank: 0, range: 'any' }, { rank: 5, range: 'any' })).toBe(true);
  });
});

describe('khung giờ', () => {
  it('05:30 hợp lệ, 08:00 và 05:15 không', () => {
    expect(validSlot('05:30')).toBe(true);
    expect(validSlot('08:00')).toBe(false);
    expect(validSlot('05:15')).toBe(false);
  });
});

describe('mốc thời gian nhóm', () => {
  const g = { startsAt: new Date('2026-11-20T10:00:00Z'), distanceKm: 5, milestone: '' };
  it('trước T−2h chưa có mốc nào', () => {
    expect(dueMilestones(g, new Date('2026-11-20T07:59:00Z'))).toEqual([]);
  });
  it('T−30\' → T−2h, T−1h, T−30m tới hạn', () => {
    expect(dueMilestones(g, new Date('2026-11-20T09:30:00Z'))).toEqual(['T-2h', 'T-1h', 'T-30m']);
  });
  it('đã xử lý T−1h thì chỉ còn mốc sau đó', () => {
    expect(dueMilestones({ ...g, milestone: 'T-1h' }, new Date('2026-11-20T10:10:00Z'))).toEqual(['T-30m', 'T-10m', 'T', 'T+10m']);
  });
  it('kết thúc sau 10 + 5×10 = 60 phút', () => {
    expect(dueMilestones({ ...g, milestone: 'T+10m' }, new Date('2026-11-20T11:00:00Z'))).toEqual(['end']);
  });
});

describe('độ đúng hẹn', () => {
  it('chưa tham gia nhóm nào → 100; 4/5 → 80', () => {
    expect(punctuality(0, 0)).toBe(100);
    expect(punctuality(5, 4)).toBe(80);
  });
});

describe('autoMatch', () => {
  const t0 = new Date('2026-11-12T00:00:00Z');
  const c = (id: string, rank: number, lat: number, extra: Partial<MatchCandidate> = {}): MatchCandidate => ({
    id, userId: id, rank, range: 'within1', slots: ['05:30'], distanceKm: 5,
    latitude: lat, longitude: 106.66, createdAt: t0, ...extra,
  });
  it('3 người gần nhau, hạng hợp → ghép', () => {
    const r = autoMatch(c('a', 4, 10.77), [c('b', 5, 10.775), c('c', 4, 10.78)]);
    expect(r?.members.map((m) => m.userId)).toEqual(['a', 'b', 'c']);
    expect(r?.slot).toBe('05:30');
  });
  it('mới 2 người → chưa ghép', () => {
    expect(autoMatch(c('a', 4, 10.77), [c('b', 5, 10.775)])).toBeNull();
  });
  it('người ở xa > 3 km hoặc khác quãng đường thì bỏ', () => {
    expect(autoMatch(c('a', 4, 10.77), [c('b', 4, 10.775), c('c', 4, 10.9), c('d', 4, 10.77, { distanceKm: 10 })])).toBeNull();
  });
});
