import type { FastifyInstance } from 'fastify';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { ClaimStoreBody, EndRunBody, RunIdQuery } from './schemas.js';
import * as runs from './service.js';

export async function runRoutes(app: FastifyInstance) {
  const runner = { preHandler: requireAuth('runner', 'member') };
  app.post('/runs/start', runner, async (req) => ok(await runs.startRun(authOf(req).id)));
  app.post('/runs/end', runner, async (req) => ok(await runs.endRun(authOf(req).id, parse(EndRunBody, req.body))));
  // ?userId= bị bỏ qua: chỉ xem lịch sử của chính mình.
  app.get('/runs', runner, async (req) => ok(await runs.listRuns(authOf(req).id)));
  app.get('/runs/passed-stores', runner, async (req) =>
    ok(await runs.passedStores(authOf(req).id, parse(RunIdQuery, req.query).runId)),
  );
  app.post('/runs/claim-store', runner, async (req) => ok(await runs.claimStore(authOf(req).id, parse(ClaimStoreBody, req.body))));
}
