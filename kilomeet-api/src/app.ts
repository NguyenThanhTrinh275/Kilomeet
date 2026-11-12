import Fastify, { type FastifyServerOptions } from 'fastify';
import { clock } from './lib/clock.js';
import { config } from './lib/config.js';
import { registerEnvelope } from './lib/envelope.js';
import { adminRoutes } from './modules/admin/routes.js';
import { clockRoutes } from './modules/admin/clock-routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { groupRoutes } from './modules/groups/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { miscRoutes } from './modules/misc/routes.js';
import { questRoutes } from './modules/quests/routes.js';
import { runRoutes } from './modules/runs/routes.js';
import { seasonRoutes } from './modules/seasons/routes.js';
import { storeRoutes } from './modules/store/routes.js';
import { voucherRoutes } from './modules/vouchers/routes.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({ bodyLimit: 5 * 1024 * 1024, ...opts }); // route GPS dài vẫn lọt
  registerEnvelope(app);

  await clock.load();

  for (const r of [healthRoutes, authRoutes, runRoutes, questRoutes, voucherRoutes, storeRoutes, groupRoutes, seasonRoutes, adminRoutes, miscRoutes]) {
    await app.register(r);
  }
  if (config.ALLOW_CLOCK_OVERRIDE) await app.register(clockRoutes);

  return app;
}
