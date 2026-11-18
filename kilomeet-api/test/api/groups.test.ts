import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FailZ, GroupRunZ, RunnerZ, okZ } from '../../src/contract/schemas.js';
import { prisma } from '../../src/lib/prisma.js';
import { useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

// TEST_NOW = Thứ Năm 12/11 10:00 VN. Nhóm: Thứ Sáu 13/11 05:30 VN = 2026-11-12T22:30Z.
const T = Date.parse('2026-11-12T22:30:00Z');
const at = (min: number) => new Date(T + min * 60_000);
const MEET = { name: 'Cổng ĐH Bách Khoa', latitude: 10.7722, longitude: 106.6596 };
const body = { date: '2026-11-13', timeSlot: '05:30', meetingPoint: MEET, distanceKm: 5, rankRange: 'within1' };

async function createWith3() {
  const [minh, an, binh] = await Promise.all(['minh@demo.com', 'an@demo.com', 'binh@demo.com'].map((e) => ctx.login(e)));
  const g = (await ctx.post('/groups/create', body, minh)).json.data;
  for (const t of [an, binh]) {
    await ctx.post('/groups/join', { groupId: g.id }, t);
    await ctx.post('/groups/confirm', { groupId: g.id }, t);
  }
  return { g, minh: minh!, an: an!, binh: binh! };
}

describe('chỉ Hội viên', () => {
  it('runner → "Tính năng dành cho Hội viên"; đăng ký gói → dùng được', async () => {
    const lan = await ctx.login('lan@demo.com');
    const r = await ctx.get('/groups', lan);
    expect(r.status).toBe(403);
    expect(FailZ.parse(r.json).message).toBe('Tính năng dành cho Hội viên');

    const sub = await ctx.post('/auth/subscribe', undefined, lan);
    expect(sub.json.data.success).toBe(true);
    const me = RunnerZ.parse((await ctx.get('/auth/me', lan)).json.data);
    expect(me).toMatchObject({ role: 'member', isMember: true });
    expect((await ctx.get('/groups', lan)).json.success).toBe(true);
  });

  it('cửa hàng không đăng ký hội viên được', async () => {
    const fuji = await ctx.login('quanfuji@demo.com');
    expect((await ctx.post('/auth/subscribe', undefined, fuji)).json.message).toBe('Chỉ người chạy mới đăng ký hội viên');
  });

  it('gói hết hạn → tự về runner (#13)', async () => {
    const lan = await ctx.login('lan@demo.com');
    await ctx.post('/auth/subscribe', undefined, lan);
    await ctx.setNow(new Date(Date.now() + 40 * 86_400_000)); // MEMBERSHIP_DAYS=30 trong .env.test
    expect((await ctx.get('/groups', lan)).json.message).toBe('Tính năng dành cho Hội viên');
    expect((await ctx.get('/auth/me', lan)).json.data).toMatchObject({ role: 'runner', isMember: false });
  });
});

describe('tạo / tham gia / xác nhận / rời nhóm (S7)', () => {
  it('tạo nhóm: người tạo đã xác nhận; 2 người tham gia + xác nhận', async () => {
    const { g, an } = await createWith3();
    const detail = okZ(GroupRunZ).parse((await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json).data;
    expect(detail).toMatchObject({ creatorId: 'user-minh', status: 'open', maxMembers: 6, date: '2026-11-13', timeSlot: '05:30' });
    expect(detail.members.map((m) => [m.userId, m.confirmed])).toEqual([['user-minh', true], ['user-an', true], ['user-binh', true]]);
    expect(detail.members[0]).toMatchObject({ userName: 'Trần Minh', rank: 'cao_thủ', arrived: false, punctuality: 95 });

    const list = okZ(z.array(GroupRunZ)).parse((await ctx.get('/groups', an)).json).data;
    expect(list.map((x) => x.id)).toContain(g.id);
    const mine = (await ctx.get('/groups?userId=user-an', an)).json.data;
    expect(mine.map((x: { id: string }) => x.id)).toEqual([g.id]);
  });

  it('lỗi: khung giờ sai, giờ đã qua, đã trong nhóm, hạng không phù hợp, nhóm không tồn tại', async () => {
    const [minh, an] = await Promise.all([ctx.login('minh@demo.com'), ctx.login('an@demo.com')]);
    expect((await ctx.post('/groups/create', { ...body, timeSlot: '08:00' }, minh)).json.message).toBe('Khung giờ không hợp lệ');
    expect((await ctx.post('/groups/create', { ...body, date: '2026-11-12', timeSlot: '05:30' }, minh)).json.message).toBe('Giờ xuất phát phải ở tương lai');

    const same = (await ctx.post('/groups/create', { ...body, rankRange: 'same' }, minh)).json.data;
    expect((await ctx.post('/groups/join', { groupId: same.id }, an)).json.message).toBe('Hạng của bạn không phù hợp');
    expect((await ctx.post('/groups/join', { groupId: same.id }, minh)).json.message).toBe('Bạn đã trong nhóm');
    expect((await ctx.get('/groups/detail?groupId=khong-co', an)).json.message).toBe('Nhóm không tồn tại');
  });

  it('nhóm đã đầy (6 người)', async () => {
    const minh = await ctx.login('minh@demo.com');
    const g = (await ctx.post('/groups/create', { ...body, rankRange: 'any' }, minh)).json.data;
    const ids = ['user-an', 'user-binh'];
    for (let i = 0; i < 3; i++) {
      ids.push((await ctx.post('/auth/register', { email: `m${i}@demo.com`, name: `Member ${i}`, password: '123456' })).json.data.user.id);
    }
    for (const userId of ids) {
      await prisma.groupMember.create({ data: { groupId: g.id, userId, rankRange: 'any', confirmed: true, joinedAt: new Date() } });
    }
    const lan = await ctx.login('lan@demo.com');
    await ctx.post('/auth/subscribe', undefined, lan);
    expect((await ctx.post('/groups/join', { groupId: g.id }, lan)).json.message).toBe('Nhóm đã đầy');
  });

  it('rời nhóm trước T−2h → không tính vắng', async () => {
    const { g, an } = await createWith3();
    const r = await ctx.post('/groups/leave', { groupId: g.id }, an);
    expect(r.json.data).toEqual({ success: true, countedAbsent: false });
    const detail = (await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json.data;
    expect(detail.members.map((m: { userId: string }) => m.userId)).toEqual(['user-minh', 'user-binh']);
  });
});

describe('mốc thời gian + vị trí (S8)', () => {
  it('T−2h: đủ 2 xác nhận → confirmed; T−30\': chia sẻ vị trí, trong 50 m → đã tới; T+10\': vắng ghi nhận; kết thúc xoá vị trí', async () => {
    const { g, minh, an, binh } = await createWith3();
    const admin = await ctx.login('admin@demo.com');

    // Chưa tới T−30' thì chưa chia sẻ vị trí được.
    expect((await ctx.post('/groups/location', { groupId: g.id, latitude: 10.77, longitude: 106.66 }, an)).json.message)
      .toBe('Chưa tới giờ chia sẻ vị trí (mở trước giờ xuất phát 30 phút)');

    await ctx.setNow(at(-120));
    await ctx.post('/admin/run-group-timeline', {}, admin);
    expect((await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json.data.status).toBe('confirmed');

    await ctx.setNow(at(-20));
    const far = await ctx.post('/groups/location', { groupId: g.id, latitude: 10.7800, longitude: 106.6596 }, an);
    expect(far.json.data).toEqual({ success: true, arrived: false });
    await ctx.post('/groups/location', { groupId: g.id, latitude: 10.7724, longitude: 106.6597 }, minh);
    const locs = (await ctx.get(`/groups/locations?groupId=${g.id}`, binh)).json.data;
    expect(locs).toHaveLength(2);
    expect(locs.find((l: { userId: string }) => l.userId === 'user-an').etaMinutes).toBeGreaterThan(0);

    await ctx.setNow(at(5));
    const near = await ctx.post('/groups/location', { groupId: g.id, latitude: 10.7721, longitude: 106.6595 }, an);
    expect(near.json.data.arrived).toBe(true);

    await ctx.setNow(at(11));
    const d = (await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json.data;
    expect(d.status).toBe('in_progress');
    expect(d.members.map((m: { userId: string; arrived: boolean }) => [m.userId, m.arrived])).toEqual([['user-minh', true], ['user-an', true], ['user-binh', false]]);
    const binhP = await prisma.runnerProfile.findUniqueOrThrow({ where: { userId: 'user-binh' } });
    expect(binhP).toMatchObject({ groupsJoined: 21, groupsOnTime: 20, punctuality: 95, noShowCount: 1 });

    const notes = (await ctx.get('/notifications', an)).json.data.map((n: { title: string }) => n.title);
    expect(notes).toEqual(expect.arrayContaining(['Nhóm chạy đã chốt', 'Còn 1 tiếng tới giờ chạy nhóm', 'Bật chia sẻ vị trí']));

    await ctx.setNow(at(70));
    expect((await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json.data.status).toBe('completed');
    expect(await prisma.groupLocation.count({ where: { groupId: g.id } })).toBe(0);
  });

  it('T−2h: dưới 2 người xác nhận → huỷ', async () => {
    const [minh, an] = await Promise.all([ctx.login('minh@demo.com'), ctx.login('an@demo.com')]);
    const g = (await ctx.post('/groups/create', body, minh)).json.data;
    await ctx.post('/groups/join', { groupId: g.id }, an); // chưa xác nhận
    await ctx.setNow(at(-119));
    const d = (await ctx.get(`/groups/detail?groupId=${g.id}`, an)).json.data;
    expect(d.status).toBe('cancelled');
  });

  it('vắng nhiều lần → chỉ giảm độ đúng hẹn, vẫn tìm / lập nhóm được (quyết định #29)', async () => {
    await prisma.runnerProfile.update({ where: { userId: 'user-binh' }, data: { noShowCount: 1 } });
    const before = await prisma.runnerProfile.findUniqueOrThrow({ where: { userId: 'user-binh' } });
    const { g, binh } = await createWith3();
    await ctx.setNow(at(11));
    await ctx.get(`/groups/detail?groupId=${g.id}`, binh);
    const p = await prisma.runnerProfile.findUniqueOrThrow({ where: { userId: 'user-binh' } });
    expect(p.noShowCount).toBe(2);
    expect(p.groupBanUntil).toBeNull();
    expect(p.punctuality).toBeLessThan(before.punctuality);
    expect((await ctx.post('/groups/create', { ...body, date: '2026-11-14' }, binh)).json.success).toBe(true);
  });
});

describe('ghép tự động', () => {
  it('3 hội viên gần nhau cùng khung giờ → ghép thành nhóm, điểm hội tụ có sẵn', async () => {
    const req = { date: '2026-11-13', timeSlots: ['05:30', '06:00'], distanceKm: 5, rankRange: 'within1', latitude: 10.773, longitude: 106.66 };
    const [minh, an, binh] = await Promise.all(['minh@demo.com', 'an@demo.com', 'binh@demo.com'].map((e) => ctx.login(e)));
    expect((await ctx.post('/groups/auto-match', req, minh)).json.data.status).toBe('pending');
    expect((await ctx.post('/groups/auto-match', { ...req, timeSlots: ['05:30'], latitude: 10.775 }, an)).json.data.status).toBe('pending');
    const r = await ctx.post('/groups/auto-match', { ...req, timeSlots: ['06:00', '05:30'], longitude: 106.663 }, binh);
    expect(r.json.data.status).toBe('matched');
    const g = okZ(GroupRunZ).parse((await ctx.get(`/groups/detail?groupId=${r.json.data.groupId}`, binh)).json).data;
    expect(g.timeSlot).toBe('05:30');
    expect(g.members).toHaveLength(3);
    expect(g.members.every((m) => !m.confirmed)).toBe(true);
    expect(g.meetingPoint.name.length).toBeGreaterThan(0);
    expect((await ctx.get('/groups/auto-match', minh)).json.data).toMatchObject({ status: 'matched', groupId: g.id });
  });
});
