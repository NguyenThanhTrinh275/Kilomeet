import { describe, expect, it } from 'vitest';
import { FailZ, okZ } from '../../src/contract/schemas.js';
import { z } from 'zod';
import { useTestApp } from '../helpers/app.js';

const ctx = useTestApp();

describe('envelope', () => {
  it('GET /health trả envelope thành công', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = okZ(z.object({ ok: z.literal(true), chain: z.literal('fake'), time: z.string() })).parse(res.json());
    expect(body.data.ok).toBe(true);
  });

  it('route lạ → 404 vẫn đúng envelope tiếng Việt', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/khong-co' });
    expect(res.statusCode).toBe(404);
    expect(FailZ.parse(res.json()).message).toBe('Không tìm thấy đường dẫn');
  });

  it('JSON hỏng → 400 đúng envelope', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"email": ',
    });
    expect(res.statusCode).toBe(400);
    expect(FailZ.parse(res.json()).message).toBe('Dữ liệu gửi lên không phải JSON hợp lệ');
  });

  it('POST có Content-Type JSON nhưng body rỗng không bị lỗi parser', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(FailZ.parse(res.json()).message).toBe('Vui lòng nhập email và mật khẩu');
  });

  it('phương thức không hỗ trợ cũng trả envelope', async () => {
    const res = await ctx.app.inject({ method: 'PUT', url: '/auth/login' });
    FailZ.parse(res.json());
  });
});
