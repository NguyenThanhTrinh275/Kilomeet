import { describe, expect, it } from 'vitest';
import { FailZ, StoreFeeWalletZ, okZ } from '../../src/contract/schemas.js';
import { prisma } from '../../src/lib/prisma.js';
import { TEST_NOW, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();
const DAY = 86_400_000;

const wallet = async (token: string) => okZ(StoreFeeWalletZ).parse((await ctx.get('/store/fee', token)).json).data;
const setFee = (storeId: string, balance: number) =>
  prisma.store.update({ where: { userId: storeId }, data: { feeBalanceVnd: balance, feeHeldVnd: 0 } });

describe('ví phí trả trước (quyết định #28)', () => {
  it('seed: Fuji nạp 150.000đ → bán được 50 voucher, còn 73 voucher → thiếu 69.000đ', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    const w = await wallet(fuji);
    expect(w).toMatchObject({
      balanceVnd: 150_000, heldVnd: 0, availableVnd: 150_000, feePerVoucherVnd: 3000,
      sellableCount: 50, unsoldCount: 73, shortfallVnd: 69_000, heldCount: 0,
    });
    expect(w.entries[0]).toMatchObject({ kind: 'topup', amountVnd: 150_000, title: 'Nạp tiền vào ví phí' });
    const dash = (await ctx.get('/store/dashboard', fuji)).json.data;
    expect(dash.fee).toMatchObject({ availableVnd: 150_000, sellableCount: 50, shortfallVnd: 69_000 });
  });

  it('mua → tạm giữ 3.000đ; quét → trừ thật; số dư khớp sổ', async () => {
    const minh = await ctx.login('minh@demo.com');
    const fuji = await ctx.login('quanfuji@demo.com');
    const ov = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
    expect(await wallet(fuji)).toMatchObject({ balanceVnd: 150_000, heldVnd: 3000, availableVnd: 147_000, sellableCount: 49, heldCount: 1 });

    const scan = await ctx.post('/store/scan', { qrCode: ov.qrCode }, fuji);
    expect(scan.json.data).toMatchObject({ success: true, feeVnd: 3000 });
    const w = await wallet(fuji);
    expect(w).toMatchObject({ balanceVnd: 147_000, heldVnd: 0, availableVnd: 147_000, heldCount: 0, totalPaidVnd: 47 * 3000 + 3000 });
    expect(w.entries.slice(0, 2).map((e) => e.kind)).toEqual(['charge', 'hold']);
    expect(w.entries[0]).toMatchObject({ subtitle: 'Quét «Giảm 20% toàn menu» của Trần Minh', balanceDeltaVnd: -3000, heldDeltaVnd: -3000 });

    const sum = await prisma.storeFeeEntry.aggregate({ where: { storeId: 'store-fuji' }, _sum: { balanceDelta: true, heldDelta: true } });
    expect(sum._sum).toEqual({ balanceDelta: 147_000, heldDelta: 0 });
  });

  it('ví 30.000đ → bán đúng 10 voucher; voucher thứ 11 "Tạm hết", không trừ token, không trừ số lượng', async () => {
    await setFee('store-banhmi', 30_000);
    await prisma.runnerProfile.update({ where: { userId: 'user-minh' }, data: { tokenBalance: 10_000 } });
    const minh = await ctx.login('minh@demo.com');
    for (let i = 0; i < 10; i++) {
      expect((await ctx.post('/vouchers/buy', { templateId: 'vt-5' }, minh)).json.success).toBe(true);
    }
    const before = (await ctx.get('/auth/me', minh)).json.data.tokenBalance;
    const list = (await ctx.get('/vouchers', minh)).json.data;
    expect(list.find((v: { id: string }) => v.id === 'vt-5')).toMatchObject({ remaining: 135, pausedForFee: true });

    const r = await ctx.post('/vouchers/buy', { templateId: 'vt-5' }, minh);
    expect(FailZ.parse(r.json).message).toBe('Voucher tạm hết, quán đang bổ sung. Vui lòng quay lại sau');
    expect((await ctx.get('/auth/me', minh)).json.data.tokenBalance).toBe(before);
    const t = await prisma.voucherTemplate.findUniqueOrThrow({ where: { id: 'vt-5' } });
    expect(t.remaining).toBe(135);

    const banhmi = await ctx.login('banhmi@demo.com');
    expect(await wallet(banhmi)).toMatchObject({ heldVnd: 30_000, availableVnd: 0, sellableCount: 0, unsoldCount: 135, shortfallVnd: 405_000 });
  });

  it('mua đồng thời không giữ quá số dư (ví đủ 2 lượt, 5 request cùng lúc → đúng 2 thành công)', async () => {
    await setFee('store-banhmi', 6000);
    await prisma.runnerProfile.update({ where: { userId: 'user-minh' }, data: { tokenBalance: 10_000 } });
    const minh = await ctx.login('minh@demo.com');
    const rs = await Promise.all(Array.from({ length: 5 }, () => ctx.post('/vouchers/buy', { templateId: 'vt-5' }, minh)));
    expect(rs.filter((r) => r.json.success)).toHaveLength(2);
    const s = await prisma.store.findUniqueOrThrow({ where: { userId: 'store-banhmi' } });
    expect(s).toMatchObject({ feeBalanceVnd: 6000, feeHeldVnd: 6000 });
  });

  it('voucher hết hạn chưa dùng → trả lại phí đang giữ, chạy lại không trả 2 lần', async () => {
    const minh = await ctx.login('minh@demo.com');
    const fuji = await ctx.login('quanfuji@demo.com');
    await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh);
    await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh);
    await ctx.setNow(new Date(TEST_NOW.getTime() + 61 * DAY));

    const admin = await ctx.login('admin@demo.com');
    expect((await ctx.post('/admin/run-fee-release', {}, admin)).json.data).toEqual({ processed: 2 });
    expect((await ctx.post('/admin/run-fee-release', {}, admin)).json.data).toEqual({ processed: 0 });
    const w = await wallet(fuji);
    expect(w).toMatchObject({ balanceVnd: 150_000, heldVnd: 0, heldCount: 0 });
    expect(w.entries[0]).toMatchObject({ kind: 'release', amountVnd: 3000, subtitle: '«Giảm 20% toàn menu» hết hạn chưa dùng' });
  });

  it('tặng voucher vẫn giữ phí; người nhận dùng thì trừ khoản đã giữ', async () => {
    const minh = await ctx.login('minh@demo.com');
    const fuji = await ctx.login('quanfuji@demo.com');
    const ov = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
    const gifted = (await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'lan@demo.com' }, minh)).json.data;
    expect((await wallet(fuji)).heldVnd).toBe(3000);
    await ctx.post('/store/scan', { qrCode: gifted.qrCode }, fuji);
    expect(await wallet(fuji)).toMatchObject({ balanceVnd: 147_000, heldVnd: 0 });
  });

  it('nạp tiền: cộng số dư, gọi lặp cùng requestId chỉ nạp 1 lần, lỗi tiếng Việt', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    const r = await ctx.post('/store/fee/topup', { amountVnd: 60_000, requestId: 'abc' }, fuji);
    expect(okZ(StoreFeeWalletZ).parse(r.json).data).toMatchObject({ balanceVnd: 210_000, sellableCount: 70 });
    await ctx.post('/store/fee/topup', { amountVnd: 60_000, requestId: 'abc' }, fuji);
    expect((await wallet(fuji)).balanceVnd).toBe(210_000);

    expect((await ctx.post('/store/fee/topup', { amountVnd: 5000 }, fuji)).json.message).toBe('Nạp tối thiểu 10.000đ');
    expect((await ctx.post('/store/fee/topup', { amountVnd: 'abc' }, fuji)).json).toMatchObject({ success: false });
    const lan = await ctx.login('lan@demo.com');
    expect((await ctx.post('/store/fee/topup', { amountVnd: 60_000 }, lan)).json).toMatchObject({ success: false, message: 'Không phải tài khoản cửa hàng' });
  });

  it('quán chưa nạp (Juice Factory) → voucher hiện "Tạm hết"', async () => {
    const lan = await ctx.login('lan@demo.com');
    const v6 = (await ctx.get('/vouchers', lan)).json.data.find((v: { id: string }) => v.id === 'vt-6');
    expect(v6.pausedForFee).toBe(true);
  });
});

describe('nạp tiền gọi song song', () => {
  it('2 request cùng requestId chạy song song → đều thành công, chỉ nạp 1 lần', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    const rs = await Promise.all([1, 2, 3].map(() => ctx.post('/store/fee/topup', { amountVnd: 30_000, requestId: 'same' }, fuji)));
    expect(rs.every((r) => r.json.success)).toBe(true);
    expect((await prisma.store.findUniqueOrThrow({ where: { userId: 'store-fuji' } })).feeBalanceVnd).toBe(180_000);
  });
});
