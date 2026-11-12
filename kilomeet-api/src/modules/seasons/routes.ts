import type { FastifyInstance } from 'fastify';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import * as seasons from './service.js';

export async function seasonRoutes(app: FastifyInstance) {
  app.get('/seasons/current', { preHandler: requireAuth() }, async () => ok(await seasons.currentSeason()));
  app.get('/me/badges', { preHandler: requireAuth('runner', 'member') }, async (req) => ok(await seasons.myBadges(authOf(req).id)));
}
