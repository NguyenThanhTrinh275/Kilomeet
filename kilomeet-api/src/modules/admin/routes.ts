import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { processChainOutbox } from '../../jobs/chain-outbox.js';
import { runGroupTimeline } from '../groups/service.js';
import { runMembershipExpiry } from '../auth/membership.js';
import * as seasons from '../seasons/service.js';
import * as admin from './service.js';

const ApproveBody = z.object({
  storeId: z.string({ error: 'Thiếu storeId' }).min(1, 'Thiếu storeId'),
  approved: z.boolean({ error: 'Thiếu approved' }),
});
const StoreActionBody = z.object({ action: z.enum(['approve', 'reject'], { error: 'Hành động không hợp lệ' }) });
const SeasonBody = z.object({ action: z.enum(['start', 'end'], { error: 'Hành động không hợp lệ' }) });

export async function adminRoutes(app: FastifyInstance) {
  const a = { preHandler: requireAuth('admin') };

  // Cửa hàng
  app.get('/admin/stores', a, async () => ok(await admin.listStores()));
  app.get('/admin/pending-stores', a, async () =>
    ok((await admin.listStores('pending')).map(({ status: _s, ...rest }) => rest)),
  );
  // Ngoại lệ duy nhất dùng path param (quyết định #16, FE gọi /admin/stores/<id>).
  app.post<{ Params: { id: string } }>('/admin/stores/:id', a, async (req) =>
    ok(await admin.setStoreStatus(req.params.id, parse(StoreActionBody, req.body).action === 'approve')),
  );
  app.post('/admin/approve-store', a, async (req) => {
    const b = parse(ApproveBody, req.body);
    return ok(await admin.setStoreStatus(b.storeId, b.approved));
  });

  // Mùa — /admin/season là bí danh của /admin/seasons (#16)
  app.get('/admin/seasons', a, async () => ok(await seasons.listSeasons()));
  app.get('/admin/season', a, async () => ok(await seasons.listSeasons()));
  app.post('/admin/season', a, async (req) =>
    ok(parse(SeasonBody, req.body).action === 'end' ? await seasons.endSeason() : await seasons.startSeason()),
  );

  // Kích hoạt job bằng tay (demo, vì cron chạy theo giờ thật, không theo clock tua).
  app.post('/admin/run-weekly-ranking', a, async () => ok(await seasons.runWeeklyRanking()));
  app.post('/admin/run-group-timeline', a, async () => ok(await runGroupTimeline()));
  app.post('/admin/run-membership-expiry', a, async () => ok(await runMembershipExpiry()));
  app.post('/admin/process-chain-outbox', a, async () => ok(await processChainOutbox()));
}
