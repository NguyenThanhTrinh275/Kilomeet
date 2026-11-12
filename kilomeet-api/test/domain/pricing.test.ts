import { describe, expect, it } from 'vitest';
import { buyError, claimWindowValid, giftError, parseExpiryInput, priceFor, redeemError } from '../../src/domain/pricing.js';

const now = new Date('2026-11-12T03:00:00Z');
const later = new Date('2026-12-31T16:59:59Z');

describe('giá voucher', () => {
  it('500 token, nhiệm vụ giảm 50% → 250', () => {
    expect(priceFor(500, 50, true)).toBe(250);
    expect(priceFor(500, 50, false)).toBe(500);
  });
  it('làm tròn .5 lên như Math.round: 301 × 50% = 150,5 → 151', () => {
    expect(priceFor(301, 50, true)).toBe(151);
  });
});

describe('quyền giảm giá 7 ngày', () => {
  it('trong 7 ngày → hợp lệ, quá 7 ngày → hết', () => {
    expect(claimWindowValid(new Date('2026-11-05T03:00:00Z'), now)).toBe(true);
    expect(claimWindowValid(new Date('2026-11-05T02:59:00Z'), now)).toBe(false);
  });
});

describe('buyError', () => {
  const ok = {
    now, expiresAt: later, remaining: 1, minRankIdx: 0, rankIdx: 0, balance: 500, price: 500,
    storeApproved: true, templateArea: null, runnerArea: null,
  };
  it('đủ điều kiện → null', () => expect(buyError(ok)).toBeNull());
  it('lỗi theo đúng message hợp đồng', () => {
    expect(buyError({ ...ok, minRankIdx: 2 })).toBe('Chưa đủ hạng');
    expect(buyError({ ...ok, remaining: 0 })).toBe('Voucher đã hết');
    expect(buyError({ ...ok, balance: 499 })).toBe('Không đủ token');
    expect(buyError({ ...ok, expiresAt: now })).toBe('Voucher đã hết hạn');
  });
});

describe('giftError / redeemError', () => {
  it('tặng lần 2 → lỗi', () => {
    expect(giftError({ status: 'gifted', giftedFrom: 'user-a', expiresAt: later }, now)).toBe('Voucher đã được tặng một lần rồi');
    expect(giftError({ status: 'owned', giftedFrom: null, expiresAt: later }, now)).toBeNull();
  });
  it('quét lại voucher đã dùng / của quán khác', () => {
    expect(redeemError({ status: 'used', storeId: 's1', expiresAt: later }, 's1', now)).toBe('Voucher đã được sử dụng');
    expect(redeemError({ status: 'owned', storeId: 's2', expiresAt: later }, 's1', now)).toBe('Voucher không thuộc cửa hàng này');
    expect(redeemError({ status: 'gifted', storeId: 's1', expiresAt: later }, 's1', now)).toBeNull();
  });
});

describe('parseExpiryInput (#16)', () => {
  it("'31/12/2026' → 23:59:59 giờ VN", () => {
    expect(parseExpiryInput({ expiryDate: '31/12/2026' }, now)?.toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });
  it('rỗng → +90 ngày', () => {
    expect(parseExpiryInput({ expiryDate: '' }, now)?.toISOString()).toBe('2027-02-10T03:00:00.000Z');
  });
  it('ISO thì dùng luôn; sai định dạng → null', () => {
    expect(parseExpiryInput({ expiresAt: '2027-01-01T00:00:00Z' }, now)?.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(parseExpiryInput({ expiryDate: '31-12-2026' }, now)).toBeNull();
    expect(parseExpiryInput({ expiryDate: '31/02/2026' }, now)).toBeNull();
  });
});
