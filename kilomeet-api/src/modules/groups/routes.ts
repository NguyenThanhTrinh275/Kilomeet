import type { FastifyInstance } from 'fastify';
import { authOf, requireAuthWith } from '../../lib/auth.js';
import { ok } from '../../lib/envelope.js';
import { parse } from '../../lib/validate.js';
import { AutoMatchBody, CreateGroupBody, GroupIdBody, GroupIdQuery, ListQuery, LocationBody } from './schemas.js';
import * as groups from './service.js';

export async function groupRoutes(app: FastifyInstance) {
  // Mọi endpoint nhóm: không phải Hội viên → 403 "Tính năng dành cho Hội viên".
  const m = { preHandler: requireAuthWith('Tính năng dành cho Hội viên', 'member') };
  const uid = (req: Parameters<typeof authOf>[0]) => authOf(req).id;

  app.get('/groups', m, async (req) => ok(await groups.listGroups(uid(req), parse(ListQuery, req.query))));
  app.get('/groups/detail', m, async (req) => ok(await groups.groupDetail(parse(GroupIdQuery, req.query).groupId)));
  app.get('/groups/meeting-points', m, async () => ok(await groups.meetingPoints()));
  app.post('/groups/create', m, async (req) => ok(await groups.createGroup(uid(req), parse(CreateGroupBody, req.body))));
  app.post('/groups/join', m, async (req) => ok(await groups.joinGroup(uid(req), parse(GroupIdBody, req.body).groupId)));
  app.post('/groups/confirm', m, async (req) => ok(await groups.confirmGroup(uid(req), parse(GroupIdBody, req.body).groupId)));
  app.post('/groups/leave', m, async (req) => ok(await groups.leaveGroup(uid(req), parse(GroupIdBody, req.body).groupId)));
  app.post('/groups/location', m, async (req) => ok(await groups.postLocation(uid(req), parse(LocationBody, req.body))));
  app.get('/groups/locations', m, async (req) => ok(await groups.listLocations(uid(req), parse(GroupIdQuery, req.query).groupId)));
  app.post('/groups/auto-match', m, async (req) => ok(await groups.requestAutoMatch(uid(req), parse(AutoMatchBody, req.body))));
  app.get('/groups/auto-match', m, async (req) => ok(await groups.autoMatchStatus(uid(req))));
}
