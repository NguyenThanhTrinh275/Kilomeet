// Lệnh chain BE ghi vào outbox phải khớp hợp đồng trong ../blockchain (RunToken.reward, Voucher.purchase, ...).
import { afterEach, describe, expect, it } from 'vitest';
import { route5km2Stores } from '../../scripts/demo-routes.js';
import { ChainRetryLater, ChainTxUnknown, setChain, type ChainGateway, type RecoverResult, type ResolvedOp } from '../../src/chain/index.js';
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
      async recover() {
        return { state: 'failed' };
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

  /** Gateway giả: đếm số lần gửi thật theo op, tra receipt theo bảng `receipts`. */
  function scripted(receipts: Record<string, RecoverResult['state']>, opts: { unknownOn?: string } = {}) {
    const sent: string[] = [];
    let n = 0;
    const gw: ChainGateway = {
      name: 'fake',
      async send(op: ResolvedOp, onBroadcast) {
        sent.push(op.op);
        const hash = `0x${String(++n).padStart(64, '0')}`;
        await onBroadcast?.(hash);
        if (op.op === opts.unknownOn) throw new ChainTxUnknown('chờ receipt quá lâu');
        return op.op === 'createVoucherType' ? { txHash: hash, typeId: n } : { txHash: hash };
      },
      async recover(op: ResolvedOp, txHash: string): Promise<RecoverResult> {
        const state = receipts[txHash] ?? 'unknown';
        if (state === 'done') return { state, result: op.op === 'createVoucherType' ? { txHash, typeId: 99 } : { txHash } };
        return { state } as RecoverResult;
      },
    };
    return { gw, sent };
  }

  it('đã lên mạng nhưng chưa rõ kết quả → giữ sent + txHash, dừng lô, KHÔNG gửi lại; lượt sau tra receipt xong → done', async () => {
    await processChainOutbox(200); // seed xong hết bằng FakeChain mặc định
    const minh = await ctx.login('minh@demo.com');
    await ctx.post('/vouchers/buy', { templateId: 'vt-3' }, minh);
    await ctx.post('/vouchers/buy', { templateId: 'vt-5' }, minh);

    const first = scripted({}, { unknownOn: 'purchaseVoucher' });
    setChain(first.gw);
    await processChainOutbox(200);
    const [a, b] = await prisma.chainOutbox.findMany({ where: { op: 'purchaseVoucher' }, orderBy: { seq: 'asc' } });
    expect(a).toMatchObject({ status: 'sent', lastError: 'chờ receipt quá lâu' });
    expect(a!.txHash).toMatch(/^0x/);
    expect(b).toMatchObject({ status: 'pending' }); // giữ thứ tự
    expect(first.sent).toEqual(['purchaseVoucher']);

    const second = scripted({ [a!.txHash!]: 'done' });
    setChain(second.gw);
    await processChainOutbox(200);
    expect(second.sent).toEqual(['purchaseVoucher']); // chỉ gửi lệnh thứ 2, lệnh 1 lấy từ receipt
    expect(await prisma.chainOutbox.count({ where: { op: 'purchaseVoucher', status: 'done' } })).toBe(2);
    expect((await prisma.chainOutbox.findUniqueOrThrow({ where: { id: a!.id } })).txHash).toBe(a!.txHash);
  });

  it('dòng sent mồ côi: chưa có txHash → gửi lại; receipt revert/bị bỏ → gửi lại; còn trong mempool → chờ', async () => {
    await processChainOutbox(200);
    const minh = await ctx.login('minh@demo.com');
    for (const t of ['vt-3', 'vt-5', 'vt-5']) await ctx.post('/vouchers/buy', { templateId: t }, minh);
    const rows = await prisma.chainOutbox.findMany({ where: { op: 'purchaseVoucher' }, orderBy: { seq: 'asc' } });
    const dropped = '0x' + 'd'.repeat(64);
    const inMempool = '0x' + 'e'.repeat(64);
    await prisma.chainOutbox.update({ where: { id: rows[0]!.id }, data: { status: 'sent', txHash: null } });
    await prisma.chainOutbox.update({ where: { id: rows[1]!.id }, data: { status: 'sent', txHash: dropped } });
    await prisma.chainOutbox.update({ where: { id: rows[2]!.id }, data: { status: 'sent', txHash: inMempool } });

    const s = scripted({ [dropped]: 'failed' });
    setChain(s.gw);
    await processChainOutbox(200);
    expect(s.sent).toEqual(['purchaseVoucher', 'purchaseVoucher']); // dòng 1 + dòng 2 gửi lại, dòng 3 chờ
    const after = await prisma.chainOutbox.findMany({ where: { op: 'purchaseVoucher' }, orderBy: { seq: 'asc' } });
    expect(after.map((r) => r.status)).toEqual(['done', 'done', 'sent']);
    expect(after[2]!.txHash).toBe(inMempool);
  });

  it('createVoucherType khôi phục từ receipt vẫn lưu chainTokenId', async () => {
    const row = await prisma.chainOutbox.findFirstOrThrow({ where: { op: 'createVoucherType' }, orderBy: { seq: 'asc' } });
    const hash = '0x' + 'a'.repeat(64);
    await prisma.chainOutbox.update({ where: { id: row.id }, data: { status: 'sent', txHash: hash } });
    setChain(scripted({ [hash]: 'done' }).gw);
    await processChainOutbox(200);
    const { templateId } = row.payload as { templateId: string };
    expect((await prisma.voucherTemplate.findUniqueOrThrow({ where: { id: templateId } })).chainTokenId).toBe(99);
  });
});
