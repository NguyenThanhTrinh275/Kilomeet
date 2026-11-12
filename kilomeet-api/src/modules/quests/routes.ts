import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authOf, requireAuth } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import * as quests from './service.js';

const CompleteBody = z.object({ questId: z.string({ error: 'Thiếu questId' }).min(1, 'Thiếu questId') });

export async function questRoutes(app: FastifyInstance) {
  const runner = { preHandler: requireAuth('runner', 'member') };
  app.get('/quests', runner, async (req) => ok(await quests.listQuests(authOf(req).id)));
  app.post('/quests/complete', runner, async (req) =>
    ok(await quests.getQuest(authOf(req).id, parse(CompleteBody, req.body).questId)),
  );
}
