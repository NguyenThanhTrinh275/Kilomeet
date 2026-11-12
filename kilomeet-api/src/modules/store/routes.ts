import type { FastifyInstance } from 'fastify';
import { authOf, requireAuthWith } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { CreateVoucherBody, ScanBody } from './schemas.js';
import * as store from './service.js';

export async function storeRoutes(app: FastifyInstance) {
  const s = { preHandler: requireAuthWith('Không phải tài khoản cửa hàng', 'store') };
  app.get('/store/dashboard', s, async (req) => ok(await store.dashboard(authOf(req).id)));
  app.post('/store/vouchers', s, async (req) => ok(await store.createVoucher(authOf(req).id, parse(CreateVoucherBody, req.body))));
  app.post('/store/scan', s, async (req) => ok(await store.scan(authOf(req).id, parse(ScanBody, req.body).qrCode)));
}
