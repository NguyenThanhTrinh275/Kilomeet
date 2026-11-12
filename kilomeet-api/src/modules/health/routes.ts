import type { FastifyInstance } from 'fastify';
import { clock } from '../../lib/clock.js';
import { config } from '../../lib/config.js';
import { ok } from '../../lib/envelope.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ok({ ok: true, chain: config.CHAIN, time: clock.now().toISOString() }));
}
