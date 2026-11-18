import type { FastifyInstance } from 'fastify';
import { authOf, requireAuth, requireAuthWith } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { CreateVoucherBody, ScanBody, StoreProfileBody, StoreProfileQuery } from './schemas.js';
import * as profile from './profile.js';
import * as store from './service.js';

export async function storeRoutes(app: FastifyInstance) {
  const s = { preHandler: requireAuthWith('Không phải tài khoản cửa hàng', 'store') };
  app.get('/store/dashboard', s, async (req) => ok(await store.dashboard(authOf(req).id)));
  app.post('/store/vouchers', s, async (req) => ok(await store.createVoucher(authOf(req).id, parse(CreateVoucherBody, req.body))));
  app.post('/store/scan', s, async (req) => ok(await store.scan(authOf(req).id, parse(ScanBody, req.body).qrCode)));

  // Hồ sơ quán (Mục 8.2)
  app.get('/store/profile', s, async (req) => ok(await profile.getMyProfile(authOf(req).id)));
  app.post('/store/profile', s, async (req) => ok(await profile.updateMyProfile(authOf(req).id, parse(StoreProfileBody, req.body))));
  app.get('/stores/profile', { preHandler: requireAuth() }, async (req) =>
    ok(await profile.getProfile(parse(StoreProfileQuery, req.query).storeId, authOf(req))),
  );
}
