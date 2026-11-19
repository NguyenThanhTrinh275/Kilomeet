import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AdminStoreZ, FailZ, PendingStoreZ, RunnerZ, SeasonInfoZ, okZ } from '../../src/contract/schemas.js';
import { vnWeekStart } from '../../src/domain/time.js';
import { prisma } from '../../src/lib/prisma.js';
import { useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

const SUNDAYS = ['2026-11-15T16:59:00Z', '2026-11-22T16:59:00Z', '2026-11-29T16:59:00Z']; // CN 23:59 giờ VN

async function setLanKm(km: number, now: string) {
  await prisma.runnerProfile.update({ where: { userId: 'user-lan' }, data: { kmThisWeek: km, kmWeekStart: vnWeekStart(new Date(now)) } });
}

describe('xếp hạng tuần (S2)', () => {
  it('Lan 42 → 45 → 41 km: Đồng → Bạc → Vàng → Cao thủ; km tuần về 0; chạy lại job không chấm 2 lần', async () => {
    const admin = await ctx.login('admin@demo.com');
    const lan = await ctx.login('lan@demo.com');
    const expected = ['bạc', 'vàng', 'cao_thủ'];
    for (const [i, km] of [42, 45, 41].entries()) {
      await ctx.setNow(SUNDAYS[i]!);
      await setLanKm(km, SUNDAYS[i]!);
      const r = await ctx.post('/admin/run-weekly-ranking', {}, admin);
      expect(r.json.data.processed).toBeGreaterThan(0);
      const me = RunnerZ.parse((await ctx.get('/auth/me', lan)).json.data);
      expect(me.rank).toBe(expected[i]);
      expect(me.kmThisWeek).toBe(0);
      expect(me.seasonBadge).toBe(expected[i]);
    }
    expect((await ctx.post('/admin/run-weekly-ranking', {}, admin)).json.data.processed).toBe(0);
  });

  it('Minh đã hết lượt miễn, chạy thiếu → tụt 1 bậc xuống Kim cương', async () => {
    const admin = await ctx.login('admin@demo.com');
    await ctx.setNow(SUNDAYS[0]!);
    await prisma.runnerProfile.update({ where: { userId: 'user-minh' }, data: { kmThisWeek: 10 } });
    await ctx.post('/admin/run-weekly-ranking', {}, admin);
    expect((await ctx.get('/auth/me', await ctx.login('minh@demo.com'))).json.data.rank).toBe('kim_cương');
  });

  it('Bình còn lượt miễn → chạy thiếu vẫn giữ Cao thủ, mất lượt miễn', async () => {
    const admin = await ctx.login('admin@demo.com');
    await ctx.setNow(SUNDAYS[0]!);
    await ctx.post('/admin/run-weekly-ranking', {}, admin);
    const binh = RunnerZ.parse((await ctx.get('/auth/me', await ctx.login('binh@demo.com'))).json.data);
    expect(binh).toMatchObject({ rank: 'cao_thủ', skipWeekAvailable: false });
  });

  it('runner không gọi được job admin', async () => {
    const lan = await ctx.login('lan@demo.com');
    expect((await ctx.post('/admin/run-weekly-ranking', {}, lan)).status).toBe(403);
  });
});

describe('đóng / mở mùa (S6, demo bước 8)', () => {
  it('Minh Cao thủ 1.000 token → 500 token, Bạch kim, có huy hiệu; đóng lần 2 → lỗi', async () => {
    const admin = await ctx.login('admin@demo.com');
    const minh = await ctx.login('minh@demo.com');
    const closed = await ctx.post('/admin/season', { action: 'end' }, admin);
    expect(okZ(SeasonInfoZ).parse(closed.json).data).toMatchObject({ id: 'season-2026-3', isActive: false });

    const me = RunnerZ.parse((await ctx.get('/auth/me', minh)).json.data);
    expect(me).toMatchObject({ tokenBalance: 500, rank: 'bạch_kim', skipWeekAvailable: true, seasonBadge: null });
    const lan = RunnerZ.parse((await ctx.get('/auth/me', await ctx.login('lan@demo.com'))).json.data);
    expect(lan).toMatchObject({ tokenBalance: 0, rank: 'đồng' });
    const an = RunnerZ.parse((await ctx.get('/auth/me', await ctx.login('an@demo.com'))).json.data);
    expect(an).toMatchObject({ tokenBalance: 400, rank: 'vàng' }); // Kim cương 420 → 400

    const badges = (await ctx.get('/me/badges', minh)).json.data;
    expect(badges[0]).toMatchObject({ seasonId: 'season-2026-3', seasonName: 'Mùa 3/2026', highestRank: 'cao_thủ', current: false });
    // On-chain: endSeason rồi settleSeason cho MỌI ví runner (hợp đồng tự cắt theo hạng), không có burnToken.
    expect(await prisma.chainOutbox.count({ where: { op: 'settleSeason' } })).toBe(await prisma.runnerProfile.count());
    expect(await prisma.chainOutbox.count({ where: { op: 'burnToken' } })).toBe(0);

    const again = await ctx.post('/admin/season', { action: 'end' }, admin);
    expect(FailZ.parse(again.json).message).toBe('Không có mùa đang chạy');
  });

  it('#8: tuần dở dang được chấm trước khi reset (Minh 0 km tuần này, hết lượt miễn → tụt trước, rồi -2)', async () => {
    const admin = await ctx.login('admin@demo.com');
    await prisma.runnerProfile.update({ where: { userId: 'user-minh' }, data: { kmThisWeek: 0 } });
    await ctx.post('/admin/season', { action: 'end' }, admin);
    const minh = await ctx.get('/auth/me', await ctx.login('minh@demo.com'));
    expect(minh.json.data).toMatchObject({ rank: 'vàng', tokenBalance: 400 }); // CT→KC (giữ 400) → Vàng
  });

  it('mở mùa mới → mùa kế tiếp; đang có mùa thì không mở được; /seasons/current có daysLeft', async () => {
    const admin = await ctx.login('admin@demo.com');
    const lan = await ctx.login('lan@demo.com');
    const cur = (await ctx.get('/seasons/current', lan)).json.data;
    expect(cur).toMatchObject({ id: 'season-2026-3', daysLeft: 50, isActive: true });
    expect((await ctx.post('/admin/season', { action: 'start' }, admin)).json.message).toBe('Đang có mùa chạy, hãy đóng mùa trước');

    await ctx.post('/admin/season', { action: 'end' }, admin);
    expect((await ctx.get('/seasons/current', lan)).json.data).toBeNull();
    const opened = okZ(SeasonInfoZ).parse((await ctx.post('/admin/season', { action: 'start' }, admin)).json).data;
    expect(opened).toMatchObject({ id: 'season-2027-1', name: 'Mùa 1/2027', startDate: '2027-01-01', endDate: '2027-04-30', isActive: true });

    const list = okZ(z.array(SeasonInfoZ)).parse((await ctx.get('/admin/seasons', admin)).json).data;
    expect(list.map((s) => s.id)).toEqual(['season-2027-1', 'season-2026-3']);
    expect((await ctx.get('/admin/season', admin)).json.data).toEqual(list); // bí danh
  });
});

describe('duyệt cửa hàng (quyết định #16)', () => {
  it('GET /admin/stores trả mọi quán kèm status; duyệt bằng /admin/stores/:id; quán vừa duyệt tạo được voucher', async () => {
    const admin = await ctx.login('admin@demo.com');
    const all = okZ(z.array(AdminStoreZ)).parse((await ctx.get('/admin/stores', admin)).json).data;
    expect(all).toHaveLength(8);
    expect(all.filter((s) => s.status === 'pending').map((s) => s.id).sort()).toEqual(['store-pending-1', 'store-pending-2']);

    const pending = okZ(z.array(PendingStoreZ)).parse((await ctx.get('/admin/pending-stores', admin)).json).data;
    expect(pending).toHaveLength(2);

    expect((await ctx.post('/admin/stores/store-pending-1', { action: 'approve' }, admin)).json).toEqual({ success: true, data: { success: true } });
    expect((await ctx.post('/admin/approve-store', { storeId: 'store-pending-2', approved: false }, admin)).json.success).toBe(true);
    expect((await ctx.get('/admin/pending-stores', admin)).json.data).toHaveLength(0);
    const after = (await ctx.get('/admin/stores', admin)).json.data;
    expect(after.find((s: { id: string }) => s.id === 'store-pending-2').status).toBe('rejected');

    const shop = await ctx.login('newcafe@demo.com');
    const v = await ctx.post('/store/vouchers', { title: 'Mới', priceTokens: 100, discountPercent: 10, quantity: 3 }, shop);
    expect(v.json.success).toBe(true);

    expect((await ctx.post('/admin/stores/khong-co', { action: 'approve' }, admin)).json.message).toBe('Không tìm thấy cửa hàng');
  });
});

describe('chain outbox', () => {
  it('job gửi lệnh đang chờ qua FakeChain và lưu txHash', async () => {
    const admin = await ctx.login('admin@demo.com');
    await ctx.post('/admin/season', { action: 'end' }, admin);
    const before = await prisma.chainOutbox.count({ where: { status: 'pending' } });
    expect(before).toBeGreaterThan(0);
    const r = await ctx.post('/admin/process-chain-outbox', {}, admin);
    expect(r.json.data.processed).toBe(before);
    const rows = await prisma.chainOutbox.findMany();
    expect(rows.every((x) => x.status === 'done' && /^0x[0-9a-f]{64}$/.test(x.txHash ?? ''))).toBe(true);
    const badge = (await ctx.get('/me/badges', await ctx.login('minh@demo.com'))).json.data[0];
    expect(badge.txHash).toMatch(/^0x/);
  });
});

describe('đóng mùa bị dừng giữa chừng', () => {
  /** Giả lập: transaction đóng mùa đã chạy (mùa tắt, có endSeason) nhưng tiến trình chết trước khi chốt từng người. */
  async function crashAfterClose() {
    const s = await prisma.season.findFirstOrThrow({ where: { isActive: true } });
    await prisma.season.update({ where: { id: s.id }, data: { isActive: false, endedAt: new Date('2026-11-12T03:00:00Z') } });
    await prisma.chainOutbox.create({ data: { op: 'endSeason', payload: {}, ref: `season-end:${s.id}` } });
    return s.id;
  }
  const minh = async () => (await ctx.get('/auth/me', await ctx.login('minh@demo.com'))).json.data;

  it('bấm Đóng mùa lại → chốt nốt người còn dở; lần sau nữa báo lỗi', async () => {
    const admin = await ctx.login('admin@demo.com');
    const seasonId = await crashAfterClose();
    expect((await minh()).tokenBalance).toBe(1000);

    const resumed = await ctx.post('/admin/season', { action: 'end' }, admin);
    expect(resumed.json.success).toBe(true);
    expect(await minh()).toMatchObject({ tokenBalance: 500, rank: 'bạch_kim' });
    expect(await prisma.chainOutbox.count({ where: { ref: `season_reset:${seasonId}:user-minh` } })).toBe(1);

    const again = await ctx.post('/admin/season', { action: 'end' }, admin);
    expect(again.json).toEqual({ success: false, message: 'Không có mùa đang chạy' });
    expect(await prisma.chainOutbox.count({ where: { ref: `season_reset:${seasonId}:user-minh` } })).toBe(1);
  });

  it('bấm Mở mùa khi mùa trước chốt dở → chốt nốt rồi mới mở', async () => {
    const admin = await ctx.login('admin@demo.com');
    await crashAfterClose();
    const opened = await ctx.post('/admin/season', { action: 'start' }, admin);
    expect(opened.json.success).toBe(true);
    expect(await minh()).toMatchObject({ tokenBalance: 500, rank: 'bạch_kim' });
    const ops = (await prisma.chainOutbox.findMany({ orderBy: { seq: 'asc' } })).map((r) => r.op);
    expect(ops.lastIndexOf('settleSeason')).toBeLessThan(ops.indexOf('startSeason'));
  });

  it('2 request đóng mùa song song → mỗi người chỉ chốt 1 lần', async () => {
    const admin = await ctx.login('admin@demo.com');
    const [a, b] = await Promise.all([ctx.post('/admin/season', { action: 'end' }, admin), ctx.post('/admin/season', { action: 'end' }, admin)]);
    expect([a.json.success, b.json.success].filter(Boolean).length).toBeGreaterThanOrEqual(1);
    expect(await minh()).toMatchObject({ tokenBalance: 500, rank: 'bạch_kim' });
    const settles = await prisma.chainOutbox.groupBy({ by: ['ref'], where: { op: 'settleSeason' }, _count: true });
    expect(settles.every((g) => g._count === 1)).toBe(true);
  });
});
