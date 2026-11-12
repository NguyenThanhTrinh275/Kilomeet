import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { seedDemo } from '../../prisma/seed-data.js';
import { buildApp } from '../../src/app.js';
import { clock } from '../../src/lib/clock.js';
import { prisma } from '../../src/lib/prisma.js';

/** Thứ Năm 12/11/2026 10:00 giờ VN. Mọi test bắt đầu từ thời điểm này. */
export const TEST_NOW = new Date('2026-11-12T03:00:00Z');

export interface Ctx {
  app: FastifyInstance;
  get: (url: string, token?: string) => Promise<{ status: number; json: any }>;
  post: (url: string, payload?: object, token?: string) => Promise<{ status: number; json: any }>;
  login: (email: string) => Promise<string>;
  setNow: (iso: string | Date) => Promise<void>;
}

/** Dựng app một lần cho file test; seed lại DB demo + đặt giờ trước mỗi test. */
export function useTestApp(): Ctx {
  const ctx = {} as Ctx;
  const tokens = new Map<string, string>();
  beforeAll(async () => {
    ctx.app = await buildApp({ logger: false });
  });
  beforeEach(async () => {
    tokens.clear();
    await seedDemo(prisma, TEST_NOW);
    await clock.set({ now: TEST_NOW });
  });
  afterAll(async () => {
    await ctx.app.close();
    await prisma.$disconnect();
  });
  const headers = (token?: string) => (token ? { authorization: `Bearer ${token}` } : {});
  ctx.get = async (url, token) => {
    const r = await ctx.app.inject({ method: 'GET', url, headers: headers(token) });
    return { status: r.statusCode, json: r.json() };
  };
  ctx.post = async (url, payload, token) => {
    const r = await ctx.app.inject({ method: 'POST', url, payload, headers: headers(token) });
    return { status: r.statusCode, json: r.json() };
  };
  ctx.login = async (email) => {
    const cached = tokens.get(email);
    if (cached) return cached;
    const r = await ctx.post('/auth/login', { email, password: 'demo123' });
    if (!r.json.success) throw new Error(`login ${email} failed: ${r.json.message}`);
    tokens.set(email, r.json.data.token);
    return r.json.data.token as string;
  };
  ctx.setNow = async (iso) => clock.set({ now: new Date(iso) });
  return ctx;
}

export async function loginAs(app: FastifyInstance, email: string, password = 'demo123'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  const json = res.json();
  if (!json.success) throw new Error(`login ${email} failed: ${json.message}`);
  return json.data.token as string;
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Đường thẳng hướng bắc dài `km`, bắt đầu từ (lat, lng), tốc độ ~10 km/h. */
export function straightRoute(km: number, start: Date, lat = 10.76, lng = 106.68) {
  const n = Math.max(2, Math.ceil(km * 20));
  const dLat = km / 111.195;
  return Array.from({ length: n + 1 }, (_, i) => ({
    latitude: lat + (dLat * i) / n,
    longitude: lng,
    timestamp: new Date(start.getTime() + ((km * 6 * 60_000) * i) / n).toISOString(),
  }));
}

/** start + end một buổi chạy với route cho trước. */
export async function doRun(ctx: Ctx, token: string, route: { latitude: number; longitude: number; timestamp?: string }[], extra: object = {}) {
  const start = await ctx.post('/runs/start', undefined, token);
  if (!start.json.success) throw new Error(start.json.message);
  return ctx.post('/runs/end', { runId: start.json.data.id, durationMinutes: 20, route, ...extra }, token);
}
