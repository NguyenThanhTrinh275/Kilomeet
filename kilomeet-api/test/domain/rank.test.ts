import { describe, expect, it } from 'vitest';
import { levelOf, nextRank, rankIndex, rankName, seasonReset } from '../../src/domain/rank.js';

const [DONG, BAC, VANG, BK, , CT] = [0, 1, 2, 3, 4, 5];

describe('rank mapping', () => {
  it('đổi chỉ số 0–5 sang chuỗi hạng', () => {
    expect([0, 1, 2, 3, 4, 5].map(rankName)).toEqual(['đồng', 'bạc', 'vàng', 'bạch_kim', 'kim_cương', 'cao_thủ']);
  });
  it('nhận chuỗi NFD vẫn ra đúng chỉ số', () => {
    expect(rankIndex('bạch_kim'.normalize('NFD'))).toBe(3);
    expect(rankIndex('kim cương')).toBeNull();
  });
  it('chỉ số ngoài khoảng thì ném lỗi', () => {
    expect(() => rankName(6)).toThrow();
  });
});

describe('levelOf', () => {
  it.each([[0, 0], [4.99, 0], [5, 1], [12, 2], [15, 3], [24.9, 3], [25, 4], [40, 5], [100, 5]])('%s km → %s', (km, lvl) => {
    expect(levelOf(km)).toBe(lvl);
  });
});

describe('nextRank — ví dụ của Lan (6.1)', () => {
  const base = { skipWeekAvailable: false, seasonBadge: null };
  it('tuần 1: 42 km, Đồng → Bạc (tối đa 1 bậc)', () => {
    expect(nextRank({ ...base, cur: DONG, km: 42, streak: [] }).next).toBe(BAC);
  });
  it('tuần 2: 45 km, Bạc → Vàng (chưa đủ 3 tuần)', () => {
    expect(nextRank({ ...base, cur: BAC, km: 45, streak: [CT] }).next).toBe(VANG);
  });
  it('tuần 3: 41 km → lên thẳng Cao thủ', () => {
    expect(nextRank({ ...base, cur: VANG, km: 41, streak: [CT, CT] }).next).toBe(CT);
  });
  it('tuần 3 nếu 20 km → Bạch kim', () => {
    expect(nextRank({ ...base, cur: VANG, km: 20, streak: [CT, CT] }).next).toBe(BK);
  });
  it('tuần 3 nếu 12 km → giữ Vàng', () => {
    expect(nextRank({ ...base, cur: VANG, km: 12, streak: [CT, CT] }).next).toBe(VANG);
  });
  it('tuần 3 nếu 7 km → tụt về Bạc', () => {
    expect(nextRank({ ...base, cur: VANG, km: 7, streak: [CT, CT] }).next).toBe(BAC);
  });
});

describe('nextRank — luật phụ', () => {
  it('#5: lần đầu chạy thiếu thì tự dùng lượt miễn, giữ hạng', () => {
    const r = nextRank({ cur: VANG, km: 3, skipWeekAvailable: true, streak: [VANG, VANG], seasonBadge: VANG });
    expect(r).toMatchObject({ next: VANG, skipUsed: true, skipWeekAvailable: false });
  });
  it('Đồng chạy 0 km thì không mất lượt miễn', () => {
    const r = nextRank({ cur: DONG, km: 0, skipWeekAvailable: true, streak: [], seasonBadge: null });
    expect(r).toMatchObject({ next: DONG, skipUsed: false, skipWeekAvailable: true });
  });
  it('#6/#7: chuỗi rỗng (sau tuần miễn hoặc đầu mùa) thì không lên nhanh', () => {
    expect(nextRank({ cur: VANG, km: 41, skipWeekAvailable: false, streak: [], seasonBadge: null }).next).toBe(BK);
  });
  it('Cao thủ không lên thêm', () => {
    expect(nextRank({ cur: CT, km: 80, skipWeekAvailable: false, streak: [CT, CT], seasonBadge: CT }).next).toBe(CT);
  });
  it('huy hiệu mùa giữ hạng cao nhất', () => {
    expect(nextRank({ cur: VANG, km: 7, skipWeekAvailable: false, streak: [], seasonBadge: CT }).seasonBadge).toBe(CT);
  });
});

describe('seasonReset (6.2)', () => {
  it('Cao thủ 1.000 token → 500 token, Bạch kim', () => {
    expect(seasonReset({ rankIdx: CT, tokenBalance: 1000, seasonBadge: CT })).toEqual({
      tokenBalance: 500, burned: 500, rankIdx: BK, badgeIdx: CT,
    });
  });
  it('Cao thủ 300 token → giữ 300', () => {
    expect(seasonReset({ rankIdx: CT, tokenBalance: 300, seasonBadge: CT }).tokenBalance).toBe(300);
  });
  it('Bạc → Đồng (không xuống dưới Đồng), Đồng giữ 0 token', () => {
    expect(seasonReset({ rankIdx: BAC, tokenBalance: 50, seasonBadge: null }).rankIdx).toBe(DONG);
    expect(seasonReset({ rankIdx: DONG, tokenBalance: 50, seasonBadge: null })).toMatchObject({ tokenBalance: 0, burned: 50 });
  });
});
