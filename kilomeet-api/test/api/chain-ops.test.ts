// Lệnh chain BE ghi vào outbox phải khớp hợp đồng trong ../blockchain (RunToken.reward, Voucher.purchase, ...).
import { afterEach, describe, expect, it } from 'vitest';
import { route5km2Stores } from '../../scripts/demo-routes.js';
import { ChainRetryLater, setChain, type ChainGateway, type ResolvedOp } from '../../src/chain/index.js';
import { FakeChain } from '../../src/chain/fake.js';
import { processChainOutbox } from '../../src/jobs/chain-outbox.js';
import { prisma } from '../../src/lib/prisma.js';
import { doRun, TEST_NOW, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();
afterEach(() => setChain(null));

const payloads = async (op: string) =>
  (await prisma.chainOutbox.findMany({ where: { op }, orderBy: { seq: 'asc' } })).map((r) => r.payload as Record<string, unknown>);
const wallet = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).walletAddress;

describe('seed', () => {
  it('duyệt quán + tạo loại voucher on-chain; template chưa có chainTokenId cho tới khi job chạy', async () => {
    expect(await prisma.chainOutbox.count({ where: { op: 'approveMerchant' } })).toBe(6);
    const types = await payloads('createVoucherType');
    expect(types).toHaveLength(6);
    expect(types[0]).toMatchObject({ templateId: 'vt-1', merchant: await wallet('store-fuji'), price: 500, discountBps: 5000, maxSupply: 73 });
    expect((await prisma.voucherTemplate.findUniqueOrThrow({ where: { id: 'vt-1' } })).chainTokenId).toBeNull();

    const fake = new FakeChain();
    setChain(fake);
    await processChainOutbox(200);
    expect((await prisma.voucherTemplate.findUniqueOrThrow({ where: { id: 'vt-1' } })).chainTokenId).toBe(1);
    expect(fake.sent.filter((o) => o.op === 'mintToken').every((o) => 'key' in o && o.key.startsWith('seed:'))).toBe(true);
  });
});

describe('mua → tặng → quét', () => {
  it('purchaseVoucher (discounted) → giftVoucher → redeemVoucher, typeId lấy từ createVoucherType', async () => {
    const minh = await ctx.login('minh@demo.com');
    const run = await doRun(ctx, minh, route5km2Stores(TEST_NOW));
    await ctx.post('/runs/claim-store', { runId: run.json.data.id, storeId: 'store-fuji' }, minh);
    const bought = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
    const gifted = (await ctx.post('/vouchers/gift', { voucherId: bought.id, toUserId: 'lan@demo.com' }, minh)).json.data;
    await ctx.post('/store/scan', { qrCode: gifted.qrCode }, await ctx.login('quanfuji@demo.com'));

    expect(await payloads('purchaseVoucher')).toEqual([{ to: await wallet('user-minh'), templateId: 'vt-1', discounted: true }]);
    expect(await payloads('giftVoucher')).toEqual([{ from: await wallet('user-minh'), to: await wallet('user-lan'), templateId: 'vt-1' }]);
    expect(await payloads('redeemVoucher')).toEqual([{ from: await wallet('user-lan'), templateId: 'vt-1' }]);
    expect(await prisma.chainOutbox.count({ where: { op: { in: ['burnToken', 'mintVoucher'] } } })).toBe(0);

    const fake = new FakeChain();
    setChain(fake);
    await processChainOutbox(200);
    const ops = fake.sent.map((o) => o.op);
    const buy = fake.sent.find((o) => o.op === 'purchaseVoucher');
    expect(buy?.typeId).toBe(1);
    expect(ops.indexOf('createVoucherType')).toBeLessThan(ops.indexOf('purchaseVoucher'));
    expect(ops.slice(-3)).toEqual(['purchaseVoucher', 'giftVoucher', 'redeemVoucher']);
  });

  it('voucher không có nhiệm vụ → discounted=false', async () => {
    const minh = await ctx.login('minh@demo.com');
    await ctx.post('/vouchers/buy', { templateId: 'vt-3' }, minh);
    expect((await payloads('purchaseVoucher'))[0]).toMatchObject({ templateId: 'vt-3', discounted: false });
  });
});

describe('cửa hàng + admin', () => {
  it('quán tạo voucher → createVoucherType; admin duyệt quán → approveMerchant', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    const t = (await ctx.post('/store/vouchers', {
      title: 'Giảm 25%', priceTokens: 150, discountPercent: 25, questType: 'Chạy ngang qua quán', questDiscountPercent: 25,
      quantity: 10, expiryDate: '31/12/2026',
    }, fuji)).json.data;
    const op = (await payloads('createVoucherType')).find((p) => p.templateId === t.id);
    expect(op).toMatchObject({ merchant: await wallet('store-fuji'), price: 150, discountBps: 2500, maxSupply: 10 });
    expect(op!.expiry).toBe(Math.floor(new Date('2026-12-31T16:59:59.999Z').getTime() / 1000));

    const admin = await ctx.login('admin@demo.com');
    await ctx.post('/admin/approve-store', { storeId: 'store-pending-1', approved: true }, admin);
    expect((await payloads('approveMerchant')).at(-1)).toEqual({ merchant: await wallet('store-pending-1'), approved: true });
  });

  it('đóng mùa: endSeason trước settleSeason; huy hiệu ghi số mùa 20263; mở mùa → startSeason', async () => {
    const admin = await ctx.login('admin@demo.com');
    await ctx.post('/admin/season', { action: 'end' }, admin);
    const rows = await prisma.chainOutbox.findMany({ where: { op: { in: ['endSeason', 'settleSeason', 'recordBadge'] } }, orderBy: { seq: 'asc' } });
    expect(rows[0]!.op).toBe('endSeason');
    const minhSettle = rows.find((r) => r.ref === 'season_reset:season-2026-3:user-minh');
    expect(minhSettle?.payload).toEqual({ from: await wallet('user-minh'), rankIdx: 5 });
    expect(await payloads('recordBadge')).toContainEqual({ to: await wallet('user-minh'), season: 20263, rankIdx: 5 });

    await ctx.post('/admin/season', { action: 'start' }, admin);
    expect(await prisma.chainOutbox.count({ where: { op: 'startSeason' } })).toBe(1);
  });
});

describe('job chain-outbox', () => {
  it('lỗi thì dừng lô (giữ thứ tự); ChainRetryLater giữ pending, không tính lần thử', async () => {
    const seen: string[] = [];
    const flaky: ChainGateway = {
      name: 'fake',
      async send(op: ResolvedOp) {
        seen.push(op.op);
        if (op.op === 'mintToken') throw new ChainRetryLater('mùa đóng');
        if (op.op === 'createVoucherType') throw new Error('RPC lỗi');
        return { txHash: null };
      },
    };
    setChain(flaky);
    const r = await processChainOutbox(200);
    expect(r.failed).toBe(1);
    const ct = await prisma.chainOutbox.findFirstOrThrow({ where: { op: 'createVoucherType' }, orderBy: { seq: 'asc' } });
    expect(ct).toMatchObject({ status: 'pending', attempts: 1, lastError: 'RPC lỗi' });
    expect(seen.filter((o) => o === 'createVoucherType')).toHaveLength(1); // không chạy tiếp các lệnh sau
    const mint = await prisma.chainOutbox.findFirstOrThrow({ where: { op: 'mintToken' } });
    expect(mint).toMatchObject({ status: 'pending', attempts: 0, lastError: 'mùa đóng' });
  });
});
