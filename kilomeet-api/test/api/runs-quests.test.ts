import { describe, expect, it } from 'vitest';
import { route3km, route5km2Stores } from '../../scripts/demo-routes.js';
import { FailZ, QuestZ, RunZ, RunnerZ, okZ } from '../../src/contract/schemas.js';
import { prisma } from '../../src/lib/prisma.js';
import { z } from 'zod';
import { doRun, straightRoute, TEST_NOW, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

describe('POST /runs/start', () => {
  it('trả Run với endedAt = "" (không phải null)', async () => {
    const t = await ctx.login('lan@demo.com');
    const r = await ctx.post('/runs/start', undefined, t);
    const run = okZ(RunZ).parse(r.json).data;
    expect(run).toMatchObject({ endedAt: '', distanceKm: 0, route: [], passedStoreIds: [], userId: 'user-lan' });
  });

  it('cửa hàng không được chạy', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    FailZ.parse((await ctx.post('/runs/start', undefined, t)).json);
  });
});

describe('demo bước 2 — Lan chạy 3 km', () => {
  it('BE tự tính km, nhiệm vụ ngày đạt, +10 token, km tuần ghi nhận', async () => {
    const t = await ctx.login('lan@demo.com');
    const r = await doRun(ctx, t, route3km(TEST_NOW), { distanceKm: 99, passedStoreIds: ['store-fuji'] });
    const run = okZ(RunZ).parse(r.json).data;
    expect(run.distanceKm).toBeGreaterThan(3);
    expect(run.distanceKm).toBeLessThan(3.3); // bỏ qua distanceKm = 99 FE gửi
    expect(run.passedStoreIds).toEqual([]); // bỏ qua passedStoreIds FE gửi
    expect(run.endedAt).not.toBe('');
    expect(run.avgPaceMinPerKm).toBeCloseTo(20 / run.distanceKm, 0);

    const me = RunnerZ.parse((await ctx.get('/auth/me', t)).json.data);
    expect(me.tokenBalance).toBe(10);
    expect(me.kmThisWeek).toBeCloseTo(run.distanceKm, 1);

    const quests = okZ(z.array(QuestZ)).parse((await ctx.get('/quests', t)).json).data;
    const daily = quests.find((q) => q.type === 'daily')!;
    const weekly = quests.find((q) => q.type === 'weekly')!;
    expect(daily).toMatchObject({ status: 'completed', targetKm: 2, rewardTokens: 10 });
    expect(daily.id).toBe('quest-daily-user-lan-2026-11-12');
    expect(daily.expiresAt).toBe('2026-11-12T16:59:59.999Z');
    expect(weekly).toMatchObject({ status: 'active', targetKm: 5, rewardTokens: 35 }); // người mới: 5 km / 35 token
    expect(weekly.expiresAt).toBe('2026-11-15T16:59:59.999Z');
  });

  it('/runs/end gọi 2 lần không phát token 2 lần; /quests/complete không phát thêm', async () => {
    const t = await ctx.login('lan@demo.com');
    const start = await ctx.post('/runs/start', undefined, t);
    const body = { runId: start.json.data.id, durationMinutes: 20, route: route3km(TEST_NOW) };
    const [a, b] = await Promise.all([ctx.post('/runs/end', body, t), ctx.post('/runs/end', body, t)]);
    expect(a.json.success && b.json.success).toBe(true);
    const c = await ctx.post('/runs/end', body, t);
    expect(c.json.data.id).toBe(start.json.data.id);

    const daily = (await ctx.get('/quests', t)).json.data.find((q: { type: string }) => q.type === 'daily');
    const done = await ctx.post('/quests/complete', { questId: daily.id }, t);
    expect(okZ(QuestZ).parse(done.json).data.status).toBe('completed');
    await ctx.post('/quests/complete', { questId: daily.id }, t);

    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(10);
    expect(await prisma.tokenLedger.count({ where: { userId: 'user-lan' } })).toBe(1);
    expect(await prisma.chainOutbox.count({ where: { op: 'mintToken', ref: { startsWith: 'quest:' } } })).toBe(1);
  });

  it('quest của người khác hoặc không tồn tại → lỗi tiếng Việt', async () => {
    const t = await ctx.login('lan@demo.com');
    const r = await ctx.post('/quests/complete', { questId: 'quest-daily-user-minh-2026-11-12' }, t);
    expect(FailZ.parse(r.json).message).toBe('Không tìm thấy nhiệm vụ');
  });

  it('kết thúc buổi chạy của người khác → "Không tìm thấy buổi chạy"', async () => {
    const lan = await ctx.login('lan@demo.com');
    const minh = await ctx.login('minh@demo.com');
    const start = await ctx.post('/runs/start', undefined, lan);
    const r = await ctx.post('/runs/end', { runId: start.json.data.id, route: [] }, minh);
    expect(FailZ.parse(r.json).message).toBe('Không tìm thấy buổi chạy');
  });
});

describe('nhiệm vụ ngày cộng dồn theo ngày giờ VN (#1)', () => {
  it('1,2 + 0,9 km cùng ngày → xong', async () => {
    const t = await ctx.login('lan@demo.com');
    await doRun(ctx, t, straightRoute(1.2, TEST_NOW));
    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(0);
    await ctx.setNow(new Date(TEST_NOW.getTime() + 3600_000));
    await doRun(ctx, t, straightRoute(0.9, TEST_NOW, 10.8));
    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(10);
  });

  it('hai buổi nằm hai bên 0:00 giờ VN → chưa xong', async () => {
    const t = await ctx.login('lan@demo.com');
    await ctx.setNow('2026-11-12T16:30:00Z'); // 23:30 VN
    await doRun(ctx, t, straightRoute(1.2, new Date('2026-11-12T16:10:00Z')));
    await ctx.setNow('2026-11-12T17:30:00Z'); // 00:30 VN hôm sau
    await doRun(ctx, t, straightRoute(0.9, new Date('2026-11-12T17:10:00Z'), 10.8));
    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(0);
    const daily = (await ctx.get('/quests', t)).json.data.find((q: { type: string }) => q.type === 'daily');
    expect(daily.id).toBe('quest-daily-user-lan-2026-11-13');
    expect(daily.progressKm).toBeCloseTo(0.9, 1);
  });
});

describe('GET /quests + /runs', () => {
  it('Minh: mục tiêu tuần TB 40 km → 44 km / 308 token, tiến độ 42 km', async () => {
    const t = await ctx.login('minh@demo.com');
    const quests = okZ(z.array(QuestZ)).parse((await ctx.get('/quests', t)).json).data;
    expect(quests.map((q) => q.type)).toEqual(['daily', 'weekly']);
    expect(quests[1]).toMatchObject({ targetKm: 44, rewardTokens: 308, progressKm: 42, status: 'active' });
  });

  it('GET /runs mới nhất đứng đầu, đúng hình dạng', async () => {
    const t = await ctx.login('minh@demo.com');
    await doRun(ctx, t, straightRoute(1, TEST_NOW));
    const runs = okZ(z.array(RunZ)).parse((await ctx.get('/runs', t)).json).data;
    expect(runs).toHaveLength(25);
    const times = runs.map((r) => Date.parse(r.startedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe('demo bước 4 — chạy 5 km ngang 2 quán (S3)', () => {
  it('passedStoreIds đúng 2 quán, chưa tự nhận; chọn 1 quán; không chọn quán thứ 2 được', async () => {
    const t = await ctx.login('minh@demo.com');
    const r = await doRun(ctx, t, route5km2Stores(TEST_NOW));
    const run = okZ(RunZ).parse(r.json).data;
    expect(run.passedStoreIds).toEqual(['store-fuji', 'store-highlands']);
    expect(r.json.data.claimedStoreId).toBeNull();

    const passed = await ctx.get(`/runs/passed-stores?runId=${run.id}`, t);
    expect(passed.json.data.map((s: { storeName: string }) => s.storeName)).toEqual(['Fuji Coffee', 'Highlands Coffee']);

    const claim = await ctx.post('/runs/claim-store', { runId: run.id, storeId: 'store-fuji' }, t);
    expect(claim.json.data.storeId).toBe('store-fuji');
    expect(claim.json.data.expiresAt).toMatch(/^2026-11-19T03:00/); // +7 ngày
    const again = await ctx.post('/runs/claim-store', { runId: run.id, storeId: 'store-fuji' }, t);
    expect(again.json.success).toBe(true); // gọi lặp cùng quán → idempotent
    const other = await ctx.post('/runs/claim-store', { runId: run.id, storeId: 'store-highlands' }, t);
    expect(FailZ.parse(other.json).message).toBe('Buổi chạy này đã nhận giảm giá cho một quán khác');
  });

  it('nhiệm vụ tuần của Minh đạt (42 + 5 ≥ 44) → +308 + 10', async () => {
    const t = await ctx.login('minh@demo.com');
    await doRun(ctx, t, route5km2Stores(TEST_NOW));
    expect((await ctx.get('/auth/me', t)).json.data.tokenBalance).toBe(1000 + 308 + 10);
  });

  it('qua đúng 1 quán → tự ghi nhận', async () => {
    const t = await ctx.login('lan@demo.com');
    const r = await doRun(ctx, t, straightRoute(0.5, TEST_NOW, 10.772, 106.66)); // đi qua Fuji
    expect(r.json.data.passedStoreIds).toEqual(['store-fuji']);
    expect(r.json.data.claimedStoreId).toBe('store-fuji');
  });
});
