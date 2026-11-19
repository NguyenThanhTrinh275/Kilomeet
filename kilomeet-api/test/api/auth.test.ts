import { describe, expect, it } from 'vitest';
import { AdminZ, AuthResponseZ, FailZ, RunnerZ, StoreZ, okZ } from '../../src/contract/schemas.js';
import { bearer, loginAs, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

const post = (url: string, payload?: object, headers: Record<string, string> = {}) =>
  ctx.app.inject({ method: 'POST', url, payload, headers });
const get = (url: string, headers: Record<string, string> = {}) => ctx.app.inject({ method: 'GET', url, headers });

describe('POST /auth/login', () => {
  it('Minh đăng nhập: đúng hình dạng Runner, Cao thủ, 1.000 token', async () => {
    const res = await post('/auth/login', { email: 'minh@demo.com', password: 'demo123' });
    const { data } = okZ(AuthResponseZ).parse(res.json());
    const user = RunnerZ.parse(data.user);
    expect(user).toMatchObject({
      id: 'user-minh', name: 'Trần Minh', role: 'member', rank: 'cao_thủ',
      tokenBalance: 1000, kmThisWeek: 42, isMember: true, seasonBadge: 'cao_thủ', skipWeekAvailable: false,
    });
    expect(user.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('email không phân biệt hoa thường, có khoảng trắng', async () => {
    const res = await post('/auth/login', { email: '  LAN@demo.com ', password: 'demo123' });
    expect(RunnerZ.parse(res.json().data.user).rank).toBe('đồng');
  });

  it('cửa hàng và admin đúng hình dạng', async () => {
    const store = await post('/auth/login', { email: 'quanfuji@demo.com', password: 'demo123' });
    expect(StoreZ.parse(store.json().data.user)).toMatchObject({
      id: 'store-fuji', storeName: 'Fuji Coffee', latitude: 10.773, longitude: 106.66,
      approved: true, totalUsages: 47, totalFeesVnd: 141000,
    });
    const admin = await post('/auth/login', { email: 'admin@demo.com', password: 'demo123' });
    AdminZ.parse(admin.json().data.user);
  });

  it('sai mật khẩu hoặc email lạ → "Email hoặc mật khẩu không đúng"', async () => {
    for (const payload of [
      { email: 'minh@demo.com', password: 'sai' },
      { email: 'khongco@demo.com', password: 'demo123' },
    ]) {
      const res = await post('/auth/login', payload);
      expect(res.statusCode).toBe(401);
      expect(FailZ.parse(res.json()).message).toBe('Email hoặc mật khẩu không đúng');
    }
  });
});

describe('POST /auth/register', () => {
  it('runner mới: Đồng, 0 token, có ví, đăng nhập lại được', async () => {
    const res = await post('/auth/register', { email: 'moi@demo.com', name: 'Người Mới', password: 'matkhau1' });
    const { data } = okZ(AuthResponseZ).parse(res.json());
    expect(RunnerZ.parse(data.user)).toMatchObject({
      role: 'runner', rank: 'đồng', tokenBalance: 0, kmThisWeek: 0, isMember: false,
      punctuality: 100, seasonBadge: null, skipWeekAvailable: true,
    });
    expect(data.user.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

    const again = await post('/auth/login', { email: 'moi@demo.com', password: 'matkhau1' });
    expect(again.json().success).toBe(true);
  });

  it('mỗi người một địa chỉ ví khác nhau, không trùng tài khoản seed', async () => {
    const a = (await post('/auth/register', { email: 'a@demo.com', name: 'Aaa', password: '123456' })).json();
    const b = (await post('/auth/register', { email: 'b@demo.com', name: 'Bbb', password: '123456' })).json();
    expect(a.success && b.success).toBe(true);
    expect(a.data.user.walletAddress).not.toBe(b.data.user.walletAddress);
  });

  it('email đã dùng → "Email đã được sử dụng"', async () => {
    const res = await post('/auth/register', { email: 'Lan@demo.com', name: 'Lan 2', password: '123456' });
    expect(res.statusCode).toBe(409);
    expect(FailZ.parse(res.json()).message).toBe('Email đã được sử dụng');
  });

  it('validate tiếng Việt', async () => {
    const cases: [object, string][] = [
      [{ email: 'abc', name: 'Tên', password: '123456' }, 'Email không hợp lệ'],
      [{ email: 'x@demo.com', name: 'T', password: '123456' }, 'Tên tối thiểu 2 ký tự'],
      [{ email: 'x@demo.com', name: 'Tên', password: '123' }, 'Mật khẩu tối thiểu 6 ký tự'],
      [{ email: 'x@demo.com', name: 'Tên', password: '123456', role: 'admin' }, 'Vai trò không hợp lệ'],
      [{ email: 'x@demo.com', name: 'Tên', password: '123456', role: 'store' },
        'Vui lòng nhập đủ thông tin cửa hàng (tên, địa chỉ, vị trí)'],
    ];
    for (const [payload, message] of cases) {
      const res = await post('/auth/register', payload);
      expect(res.statusCode).toBe(400);
      expect(FailZ.parse(res.json()).message).toBe(message);
    }
  });

  it('cửa hàng mới: chờ duyệt (approved=false)', async () => {
    const res = await post('/auth/register', {
      email: 'quanmoi@demo.com', name: 'Chủ quán', password: '123456', role: 'store',
      storeName: 'Quán Mới', storeAddress: '1 Lý Thường Kiệt', latitude: 10.77, longitude: 106.65,
    });
    const { data } = okZ(AuthResponseZ).parse(res.json());
    expect(StoreZ.parse(data.user)).toMatchObject({
      role: 'store', storeName: 'Quán Mới', approved: false, totalUsages: 0, totalFeesVnd: 0,
    });
  });
});

describe('GET /auth/me', () => {
  it('không có token → 401 "Vui lòng đăng nhập lại"', async () => {
    const res = await get('/auth/me');
    expect(res.statusCode).toBe(401);
    expect(FailZ.parse(res.json()).message).toBe('Vui lòng đăng nhập lại');
  });

  it('token hỏng → 401', async () => {
    const res = await get('/auth/me', bearer('abc.def.ghi'));
    expect(res.statusCode).toBe(401);
  });

  it('trả đúng người đang đăng nhập', async () => {
    const token = await loginAs(ctx.app, 'minh@demo.com');
    const res = await get('/auth/me', bearer(token));
    expect(RunnerZ.parse(okZ(RunnerZ).parse(res.json()).data).id).toBe('user-minh');
  });
});

describe('admin clock', () => {
  it('runner không được tua giờ → 403', async () => {
    const token = await loginAs(ctx.app, 'lan@demo.com');
    const res = await post('/admin/clock', { offsetMs: 1000 }, bearer(token));
    expect(res.statusCode).toBe(403);
    FailZ.parse(res.json());
  });

  it('admin tua tới một thời điểm → /health trả giờ mới', async () => {
    const token = await loginAs(ctx.app, 'admin@demo.com');
    const target = '2026-11-15T16:59:00.000Z'; // CN 23:59 giờ VN
    const res = await post('/admin/clock', { now: target }, bearer(token));
    expect(res.json().success).toBe(true);
    const health = (await get('/health')).json();
    expect(Math.abs(new Date(health.data.time).getTime() - new Date(target).getTime())).toBeLessThan(2000);
  });
});
