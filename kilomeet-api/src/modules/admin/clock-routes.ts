import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth.js';
import { clock } from '../../lib/clock.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';

const ClockBody = z
  .object({
    offsetMs: z.number().int().optional(),
    now: z.iso.datetime({ offset: true, error: 'Thời điểm phải ở dạng ISO 8601' }).optional(),
  })
  .refine((b) => b.offsetMs !== undefined || b.now !== undefined, {
    error: 'Cần truyền offsetMs hoặc now',
  });

const view = () => ({ now: clock.now().toISOString(), offsetMs: clock.offsetMs() });

/** Tua giờ cho demo/test. Chỉ đăng ký khi ALLOW_CLOCK_OVERRIDE=true. */
export async function clockRoutes(app: FastifyInstance) {
  app.get('/admin/clock', { preHandler: requireAuth('admin') }, async () => ok(view()));

  app.post('/admin/clock', { preHandler: requireAuth('admin') }, async (req) => {
    const body = parse(ClockBody, req.body);
    await clock.set(body.now ? { now: new Date(body.now) } : { offsetMs: body.offsetMs! });
    return ok(view());
  });
}
