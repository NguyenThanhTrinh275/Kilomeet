import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import * as vouchers from './service.js';

const ListQuery = z.object({
  storeId: z.string().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
const BuyBody = z.object({ templateId: z.string({ error: 'Thiếu templateId' }).min(1, 'Thiếu templateId') });
const GiftBody = z.object({
  voucherId: z.string({ error: 'Thiếu voucherId' }).min(1, 'Thiếu voucherId'),
  toUserId: z.string({ error: 'Vui lòng nhập email người nhận' }).trim().min(1, 'Vui lòng nhập email người nhận'),
});

export async function voucherRoutes(app: FastifyInstance) {
  const runner = { preHandler: requireAuth('runner', 'member') };
  app.get('/vouchers', { preHandler: requireAuth() }, async (req) => ok(await vouchers.listTemplates(authOf(req), parse(ListQuery, req.query))));
  app.get('/vouchers/mine', runner, async (req) => ok(await vouchers.myVouchers(authOf(req).id)));
  app.post('/vouchers/buy', runner, async (req) => ok(await vouchers.buy(authOf(req).id, parse(BuyBody, req.body).templateId)));
  app.post('/vouchers/gift', runner, async (req) => {
    const b = parse(GiftBody, req.body);
    return ok(await vouchers.gift(authOf(req).id, b.voucherId, b.toUserId));
  });
}
