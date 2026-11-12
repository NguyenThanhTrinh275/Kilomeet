import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { route5km2Stores } from '../../scripts/demo-routes.js';
import { FailZ, OwnedVoucherZ, StoreDashboardZ, VoucherTemplateZ, okZ } from '../../src/contract/schemas.js';
import { prisma } from '../../src/lib/prisma.js';
import { doRun, TEST_NOW, useTestApp, type Ctx } from '../helpers/app.js';

const ctx = useTestApp();

/** Minh chạy 5 km ngang Fuji + Highlands rồi chọn Fuji. */
async function minhClaimsFuji(c: Ctx) {
  const t = await c.login('minh@demo.com');
  const run = await doRun(c, t, route5km2Stores(TEST_NOW));
  await c.post('/runs/claim-store', { runId: run.json.data.id, storeId: 'store-fuji' }, t);
  return t;
}

const vt = async (token: string, id: string) =>
  (await ctx.get('/vouchers', token)).json.data.find((v: { id: string }) => v.id === id);

describe('GET /vouchers', () => {
  it('đúng hình dạng, kèm myQuestEligible/myPrice', async () => {
    const t = await ctx.login('lan@demo.com');
    const list = okZ(z.array(VoucherTemplateZ)).parse((await ctx.get('/vouchers', t)).json).data;
    expect(list).toHaveLength(6);
    expect(await vt(t, 'vt-1')).toMatchObject({ storeId: 'store-fuji', storeName: 'Fuji Coffee', priceTokens: 500, myQuestEligible: false, myPrice: 500 });
  });

  it('?storeId= (màn cửa hàng) chỉ trả voucher của quán đó', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    const list = (await ctx.get('/vouchers?storeId=store-fuji', t)).json.data;
    expect(list.map((v: { id: string }) => v.id)).toEqual(['vt-1']);
  });
});

describe('demo bước 4–5: mua voucher còn 250 token rồi tặng', () => {
  it('chạy ngang Fuji → myPrice 250; mua trả 250 dù FE gửi questCompleted=false; quyền giảm chỉ dùng 1 lần', async () => {
    const t = await minhClaimsFuji(ctx);
    expect(await vt(t, 'vt-1')).toMatchObject({ myQuestEligible: true, myPrice: 250 });
    expect(await vt(t, 'vt-2')).toMatchObject({ myQuestEligible: false, myPrice: 300 }); // chọn Fuji, không phải Highlands

    const bought = await ctx.post('/vouchers/buy', { templateId: 'vt-1', questCompleted: false }, t);
    const ov = okZ(OwnedVoucherZ).parse(bought.json).data;
    expect(ov).toMatchObject({ paidTokens: 250, status: 'owned', giftedFrom: null, ownerId: 'user-minh', usedAt: null });
    expect(ov.questCompletedAt).not.toBeNull();
    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(1318 - 250);
    expect((await vt(t, 'vt-1')).remaining).toBe(72);

    expect(await vt(t, 'vt-1')).toMatchObject({ myQuestEligible: false, myPrice: 500 });
    const second = await ctx.post('/vouchers/buy', { templateId: 'vt-1', questCompleted: true }, t);
    expect(second.json.data.paidTokens).toBe(500);
  });

  it('FE gửi questCompleted=true nhưng chưa chạy ngang quán → giá gốc', async () => {
    const t = await ctx.login('minh@demo.com');
    const r = await ctx.post('/vouchers/buy', { templateId: 'vt-1', questCompleted: true }, t);
    expect(r.json.data.paidTokens).toBe(500);
  });

  it('quyền giảm giá hết hạn sau 7 ngày', async () => {
    const t = await minhClaimsFuji(ctx);
    await ctx.setNow(new Date(TEST_NOW.getTime() + 8 * 86_400_000));
    expect(await vt(t, 'vt-1')).toMatchObject({ myQuestEligible: false, myPrice: 500 });
  });

  it('lỗi mua: chưa đủ hạng / không đủ token / không tồn tại', async () => {
    const lan = await ctx.login('lan@demo.com');
    expect(FailZ.parse((await ctx.post('/vouchers/buy', { templateId: 'vt-2' }, lan)).json).message).toBe('Chưa đủ hạng');
    expect(FailZ.parse((await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, lan)).json).message).toBe('Không đủ token');
    expect(FailZ.parse((await ctx.post('/vouchers/buy', { templateId: 'vt-x' }, lan)).json).message).toBe('Voucher không tồn tại');
  });

  it('2 request mua cùng lúc khi chỉ còn 1 → đúng 1 thành công', async () => {
    await prisma.voucherTemplate.update({ where: { id: 'vt-3' }, data: { remaining: 1 } });
    const [minh, binh] = await Promise.all([ctx.login('minh@demo.com'), ctx.login('binh@demo.com')]);
    const results = await Promise.all([
      ctx.post('/vouchers/buy', { templateId: 'vt-3' }, minh),
      ctx.post('/vouchers/buy', { templateId: 'vt-3' }, binh),
    ]);
    expect(results.filter((r) => r.json.success)).toHaveLength(1);
    expect(results.find((r) => !r.json.success)!.json.message).toBe('Voucher đã hết');
    expect((await prisma.voucherTemplate.findUniqueOrThrow({ where: { id: 'vt-3' } })).remaining).toBe(0);
    const balances = await prisma.runnerProfile.findMany({ where: { userId: { in: ['user-minh', 'user-binh'] } } });
    expect(balances.reduce((s, b) => s + b.tokenBalance, 0)).toBe(1000 + 760 - 400);
  });

  it('tặng bằng email: người nhận giữ voucher "gifted", QR đổi; tặng lần 2 → lỗi', async () => {
    const minh = await minhClaimsFuji(ctx);
    const ov = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
    const gifted = await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'LAN@demo.com' }, minh);
    const g = okZ(OwnedVoucherZ).parse(gifted.json).data;
    expect(g).toMatchObject({ ownerId: 'user-lan', giftedFrom: 'user-minh', status: 'gifted' });
    expect(g.qrCode).not.toBe(ov.qrCode);
    expect((await ctx.get('/vouchers/mine', minh)).json.data).toHaveLength(0);

    const lan = await ctx.login('lan@demo.com');
    const mine = okZ(z.array(OwnedVoucherZ)).parse((await ctx.get('/vouchers/mine', lan)).json).data;
    expect(mine.map((v) => v.id)).toEqual([ov.id]);

    const again = await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'user-binh' }, lan);
    expect(FailZ.parse(again.json).message).toBe('Voucher đã được tặng một lần rồi');
    const notMine = await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'user-binh' }, minh);
    expect(FailZ.parse(notMine.json).message).toBe('Voucher không tìm thấy');
  });

  it('người nhận không tồn tại / tự tặng mình', async () => {
    const minh = await ctx.login('minh@demo.com');
    const ov = (await ctx.post('/vouchers/buy', { templateId: 'vt-3' }, minh)).json.data;
    expect((await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'ai@demo.com' }, minh)).json.message).toBe('Không tìm thấy người nhận');
    expect((await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'minh@demo.com' }, minh)).json.message).toBe('Không thể tự tặng voucher cho mình');
  });

  it('voucher quá hạn → mine trả expired', async () => {
    const minh = await ctx.login('minh@demo.com');
    await ctx.post('/vouchers/buy', { templateId: 'vt-3' }, minh);
    await ctx.setNow(new Date(TEST_NOW.getTime() + 61 * 86_400_000));
    expect((await ctx.get('/vouchers/mine', minh)).json.data[0].status).toBe('expired');
  });
});

describe('demo bước 6 — cửa hàng quét QR (S5)', () => {
  async function giftedToLan() {
    const minh = await minhClaimsFuji(ctx);
    const ov = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
    return { old: ov.qrCode as string, gifted: (await ctx.post('/vouchers/gift', { voucherId: ov.id, toUserId: 'lan@demo.com' }, minh)).json.data };
  }

  it('quét → đốt voucher + phí 5.000đ; quét lại → "Voucher đã được sử dụng"', async () => {
    const { gifted, old } = await giftedToLan();
    const fuji = await ctx.login('quanfuji@demo.com');
    expect(FailZ.parse((await ctx.post('/store/scan', { qrCode: old }, fuji)).json).message).toBe('QR không hợp lệ');

    const r = await ctx.post('/store/scan', { qrCode: gifted.qrCode }, fuji);
    expect(r.json.data).toMatchObject({ success: true, voucherTitle: 'Giảm 20% toàn menu', feeVnd: 5000 });
    expect(FailZ.parse((await ctx.post('/store/scan', { qrCode: gifted.qrCode }, fuji)).json).message).toBe('Voucher đã được sử dụng');

    const dash = okZ(StoreDashboardZ).parse((await ctx.get('/store/dashboard', fuji)).json).data;
    expect(dash).toMatchObject({ storeId: 'store-fuji', totalVouchersUsed: 48, totalFeesVnd: 240000, totalVouchersCreated: 100 });
    expect(dash.recentUsages[0]).toMatchObject({ voucherTitle: 'Giảm 20% toàn menu', userName: 'Nguyễn Lan' });

    const lan = await ctx.login('lan@demo.com');
    expect((await ctx.get('/vouchers/mine', lan)).json.data[0]).toMatchObject({ status: 'used' });
    expect(await prisma.chainOutbox.count({ where: { op: 'redeemVoucher' } })).toBe(1);
  });

  it('voucher của quán khác → lỗi; QR lạ → lỗi', async () => {
    const { gifted } = await giftedToLan();
    const hl = await ctx.login('highlands@demo.com');
    expect(FailZ.parse((await ctx.post('/store/scan', { qrCode: gifted.qrCode }, hl)).json).message).toBe('Voucher không thuộc cửa hàng này');
    expect(FailZ.parse((await ctx.post('/store/scan', { qrCode: 'abc' }, hl)).json).message).toBe('QR không hợp lệ');
  });
});

describe('POST /store/vouchers', () => {
  it('nhận tên field mới của FE (questType/quantity/expiryDate dd/mm/yyyy)', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    const r = await ctx.post('/store/vouchers', {
      title: 'Bạc xỉu 0đ', description: '', priceTokens: 150, discountPercent: 100,
      questType: 'Chạy ngang qua quán', questDiscountPercent: 40, quantity: 20, minRank: 'bạc', expiryDate: '31/12/2026',
    }, t);
    const v = okZ(VoucherTemplateZ).parse(r.json).data;
    expect(v).toMatchObject({
      storeId: 'store-fuji', storeName: 'Fuji Coffee', storeLatitude: 10.773, totalSupply: 20, remaining: 20,
      questDescription: 'Chạy ngang qua quán', questDiscountPercent: 40, minRank: 'bạc', expiresAt: '2026-12-31T16:59:59.999Z', imageUrl: null,
    });
    expect((await ctx.get('/store/dashboard', t)).json.data.totalVouchersCreated).toBe(120);
  });

  it('tên field cũ vẫn chạy; hạn rỗng → +90 ngày; không có nhiệm vụ thì % giảm nhiệm vụ = 0', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    const r = await ctx.post('/store/vouchers', {
      title: 'Cũ', priceTokens: 100, discountPercent: 10, questDescription: null, questDiscountPercent: 50, totalSupply: 5, minRank: 'đồng', expiryDate: '',
    }, t);
    expect(r.json.data).toMatchObject({ totalSupply: 5, questDescription: null, questDiscountPercent: 0 });
    expect(r.json.data.expiresAt).toMatch(/^2027-02-10T03:00/);
  });

  it('lỗi: sai định dạng hạn, số lượng âm, quán chưa duyệt, không phải cửa hàng', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    const body = { title: 'X', priceTokens: 100, discountPercent: 10, quantity: 5 };
    expect((await ctx.post('/store/vouchers', { ...body, expiryDate: '2026-12-31' }, fuji)).json.message).toBe('Hạn sử dụng không hợp lệ (dd/mm/yyyy)');
    expect((await ctx.post('/store/vouchers', { ...body, quantity: -1 }, fuji)).json.message).toBe('Số lượng phải là số nguyên dương');
    expect((await ctx.post('/store/vouchers', { ...body, discountPercent: 120 }, fuji)).json.message).toBe('Mức giảm phải từ 0 đến 100%');
    const pending = await ctx.login('newcafe@demo.com');
    expect((await ctx.post('/store/vouchers', body, pending)).json.message).toBe('Cửa hàng chưa được duyệt');
    const lan = await ctx.login('lan@demo.com');
    expect((await ctx.post('/store/vouchers', body, lan)).json.message).toBe('Không phải tài khoản cửa hàng');
  });
});
