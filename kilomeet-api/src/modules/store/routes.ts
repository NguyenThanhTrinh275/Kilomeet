import type { FastifyInstance } from 'fastify';
import { authOf, requireAuth, requireAuthWith } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { CreateVoucherBody, ScanBody, TopupBody, StoreProfileBody, StoreProfileQuery } from './schemas.js';
import * as fee from './fee.js';
import * as profile from './profile.js';
import * as store from './service.js';

export async function storeRoutes(app: FastifyInstance) {
  const s = { preHandler: requireAuthWith('Không phải tài khoản cửa hàng', 'store') };
  app.get('/store/dashboard', s, async (req) => ok(await store.dashboard(authOf(req).id)));
  app.post('/store/vouchers', s, async (req) => ok(await store.createVoucher(authOf(req).id, parse(CreateVoucherBody, req.body))));
  app.post('/store/scan', s, async (req) => ok(await store.scan(authOf(req).id, parse(ScanBody, req.body).qrCode)));

  // Ví phí trả trước (Mục 5.5b, quyết định #28)
  app.get('/store/fee', s, async (req) => ok(await fee.feeWallet(authOf(req).id)));
  app.post('/store/fee/topup', s, async (req) => {
    const b = parse(TopupBody, req.body);
    return ok(await fee.topup(authOf(req).id, b.amountVnd, b.requestId));
  });

  // Hồ sơ quán (Mục 8.2)
  app.get('/store/profile', s, async (req) => ok(await profile.getMyProfile(authOf(req).id)));
  app.post('/store/profile', s, async (req) => ok(await profile.updateMyProfile(authOf(req).id, parse(StoreProfileBody, req.body))));
  app.get('/stores/profile', { preHandler: requireAuth() }, async (req) =>
    ok(await profile.getProfile(parse(StoreProfileQuery, req.query).storeId, authOf(req))),
  );
}
