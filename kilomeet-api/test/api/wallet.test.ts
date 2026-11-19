// GET /me/wallet và GET /admin/chain-txs: giao dịch on-chain mô tả bằng tiếng Việt để FE hiện kèm link Snowtrace.
import { describe, expect, it } from 'vitest';
import { route5km2Stores } from '../../scripts/demo-routes.js';
import { doRun, TEST_NOW, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

type Tx = { op: string; label: string; amount: number | null; status: string; explorerUrl: string | null };

/** Minh chạy ngang Fuji → mua giảm giá → tặng Lan → Fuji quét QR của Lan. */
async function demoFlow() {
  const minh = await ctx.login('minh@demo.com');
  const run = await doRun(ctx, minh, route5km2Stores(TEST_NOW));
  await ctx.post('/runs/claim-store', { runId: run.json.data.id, storeId: 'store-fuji' }, minh);
  const bought = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data;
  const gifted = (await ctx.post('/vouchers/gift', { voucherId: bought.id, toUserId: 'lan@demo.com' }, minh)).json.data;
  await ctx.post('/store/scan', { qrCode: gifted.qrCode }, await ctx.login('quanfuji@demo.com'));
  return minh;
}

const labels = (txs: Tx[]) => txs.map((t) => t.label);

describe('GET /me/wallet', () => {
  it('runner: số dư mở đầu, mua (−250), tặng — mới nhất trước, chờ gửi thì chưa có link', async () => {
    const minh = await demoFlow();
    const r = await ctx.get('/me/wallet', minh);
    expect(r.json.success).toBe(true);
    const w = r.json.data;
    expect(w.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(w.explorerUrl).toContain(`/address/${w.address}`);
    expect(w.tokenBalance).toBeTypeOf('number');

    const txs: Tx[] = w.transactions;
    expect(labels(txs)[0]).toBe('Tặng «Giảm 20% toàn menu» cho Nguyễn Lan');
    expect(txs.find((t) => t.op === 'purchaseVoucher')).toMatchObject({ label: 'Mua voucher «Giảm 20% toàn menu» (giá chạy ngang quán)', amount: -250 });
    expect(txs.find((t) => t.label === 'Số dư mở đầu')).toMatchObject({ amount: 1000 });
    expect(txs.every((t) => t.status === 'pending' && t.explorerUrl === null)).toBe(true);
  });

  it('người nhận thấy "Nhận … từ …" và "Dùng … tại quán"', async () => {
    await demoFlow();
    const txs: Tx[] = (await ctx.get('/me/wallet', await ctx.login('lan@demo.com'))).json.data.transactions;
    expect(labels(txs)).toEqual(['Dùng «Giảm 20% toàn menu» tại quán', 'Nhận «Giảm 20% toàn menu» từ Trần Minh']);
  });

  it('cửa hàng thấy lượt quét voucher của quán, việc duyệt quán và tạo voucher', async () => {
    await demoFlow();
    const txs: Tx[] = (await ctx.get('/me/wallet', await ctx.login('quanfuji@demo.com'))).json.data.transactions;
    expect(labels(txs)[0]).toBe('Quét voucher «Giảm 20% toàn menu» của Nguyễn Lan');
    expect(txs.map((t) => t.op)).toEqual(expect.arrayContaining(['approveMerchant', 'createVoucherType']));
  });
});

describe('GET /admin/chain-txs', () => {
  it('ghi kèm tên người, có nhãn cho mọi lệnh', async () => {
    await demoFlow();
    const r = await ctx.get('/admin/chain-txs', await ctx.login('admin@demo.com'));
    const txs: Tx[] = r.json.data;
    expect(txs.find((t) => t.op === 'purchaseVoucher')?.label).toBe('Mua voucher «Giảm 20% toàn menu» (giá chạy ngang quán) · Trần Minh');
    expect(txs.some((t) => t.label.startsWith('Thưởng nhiệm vụ · Trần Minh'))).toBe(true);
    expect(txs.every((t) => t.label !== t.op)).toBe(true);
  });

  it('runner gọi → lỗi envelope', async () => {
    const r = await ctx.get('/admin/chain-txs', await ctx.login('minh@demo.com'));
    expect(r.json.success).toBe(false);
    expect(r.json.message).toBeTypeOf('string');
  });
});
