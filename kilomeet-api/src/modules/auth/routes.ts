import type { FastifyInstance } from 'fastify';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { LoginBody, RegisterBody } from './schemas.js';
import * as auth from './service.js';
import { subscribe } from './membership.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req) => ok(await auth.login(parse(LoginBody, req.body))));

  app.post('/auth/register', async (req) => ok(await auth.register(parse(RegisterBody, req.body))));

  app.get('/auth/me', { preHandler: requireAuth() }, async (req) => ok(await auth.me(authOf(req).id)));

  app.post('/auth/subscribe', { preHandler: requireAuth() }, async (req) => ok(await subscribe(authOf(req).id)));
}
