import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import * as misc from './service.js';

const ReadBody = z.object({ ids: z.array(z.string()).optional() });
const AreaQuery = z.object({ area: z.string().optional() });

export async function miscRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: requireAuth() }, async (req) => ok(await misc.listNotifications(authOf(req).id)));
  app.post('/notifications/read', { preHandler: requireAuth() }, async (req) => ok(await misc.markRead(authOf(req).id, parse(ReadBody, req.body).ids)));
  app.get('/leaderboard', { preHandler: requireAuth() }, async (req) => ok(await misc.leaderboard(parse(AreaQuery, req.query).area)));
  app.get('/areas', async () => ok(misc.AREAS));
  app.get('/me/wallet', { preHandler: requireAuth() }, async (req) => ok(await misc.myWallet(authOf(req).id)));
  app.get('/admin/chain-txs', { preHandler: requireAuth('admin') }, async () => ok(await misc.chainTxs()));
}
