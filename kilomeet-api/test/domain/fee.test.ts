import { describe, expect, it } from 'vitest';
import { availableVnd, canHold, sellableByFee, shortfallVnd, topupError, VOUCHER_FEE_VND } from '../../src/domain/fee.js';

// Ví dụ trong quyết định #28: phát 100 voucher, phí 3.000đ, nạp 30.000đ.
describe('ví phí trả trước', () => {
  it('phí mỗi lượt là 3.000đ', () => expect(VOUCHER_FEE_VND).toBe(3000));

  it('nạp 30.000đ → bán được 10 voucher, còn 90 voucher cần nạp thêm 270.000đ', () => {
    const w = { balanceVnd: 30_000, heldVnd: 0 };
    expect(sellableByFee(w)).toBe(10);
    expect(shortfallVnd(w, 100)).toBe(270_000);
  });

  it('bán 10 voucher → giữ 30.000đ, hết khả dụng', () => {
    const w = { balanceVnd: 30_000, heldVnd: 30_000 };
    expect(availableVnd(w)).toBe(0);
    expect(canHold(w)).toBe(false);
    expect(sellableByFee(w)).toBe(0);
  });

  it('quét 6 voucher → trừ 18.000đ; 4 voucher hết hạn → trả lại 12.000đ → bán tiếp được 4', () => {
    const afterScan = { balanceVnd: 30_000 - 18_000, heldVnd: 30_000 - 18_000 };
    expect(sellableByFee(afterScan)).toBe(0);
    const afterRelease = { balanceVnd: afterScan.balanceVnd, heldVnd: 0 };
    expect(sellableByFee(afterRelease)).toBe(4);
  });

  it('khả dụng không âm, dư lẻ không đủ 1 lượt thì không bán được', () => {
    expect(availableVnd({ balanceVnd: 1000, heldVnd: 3000 })).toBe(0);
    expect(canHold({ balanceVnd: 5000, heldVnd: 3000 })).toBe(false);
    expect(shortfallVnd({ balanceVnd: 400_000, heldVnd: 0 }, 100)).toBe(0);
  });

  it('kiểm tra số tiền nạp', () => {
    expect(topupError(30_000)).toBeNull();
    expect(topupError(5_000)).toBe('Nạp tối thiểu 10.000đ');
    expect(topupError(10_500)).toBe('Số tiền nạp phải là bội số của 1.000đ');
    expect(topupError(20_000_000)).toBe('Nạp tối đa 10.000.000đ mỗi lần');
    expect(topupError(-1)).toBe('Số tiền nạp không hợp lệ');
    expect(topupError(1.5)).toBe('Số tiền nạp không hợp lệ');
  });
});
