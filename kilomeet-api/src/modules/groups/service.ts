import type { Group, GroupMember, RankRange, RunnerProfile, User } from '@prisma/client';
import type { z } from 'zod';
import { haversineKm } from '../../domain/geo.js';
import {
  arrivedWithin50m, autoMatch, dueMilestones, etaMinutes, GROUP_MAX, GROUP_MIN_CONFIRMED, locationSharingOpen,
  MATCH_RADIUS_KM, pickMeetingPoint, PUBLIC_MEETING_POINTS,
  punctuality, rankCompatible, type MilestoneKey,
} from '../../domain/group.js';
import { rankName } from '../../domain/rank.js';
import { DAY_MS, MINUTE_MS, vnDateTime } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import type { AutoMatchBody, CreateGroupBody, LocationBody } from './schemas.js';

type MemberFull = GroupMember & { user: User & { runner: RunnerProfile | null } };
type GroupFull = Group & { members: MemberFull[] };

const groupInclude = { members: { include: { user: { include: { runner: true } } }, orderBy: { joinedAt: 'asc' } } } as const;

export function toApiGroup(g: GroupFull) {
  return {
    id: g.id,
    creatorId: g.creatorId,
    date: g.date,
    timeSlot: g.timeSlot,
    meetingPoint: { name: g.meetingName, latitude: g.meetingLat, longitude: g.meetingLng },
    distanceKm: g.distanceKm,
    rankRange: g.rankRange,
    status: g.status,
    members: g.members.map((m) => ({
      userId: m.userId,
      userName: m.user.name,
      rank: rankName(m.user.runner?.rankIdx ?? 0),
      confirmed: m.confirmed,
      arrived: m.arrived,
      punctuality: m.user.runner?.punctuality ?? 100,
    })),
    maxMembers: g.maxMembers,
    // Thêm (FE bỏ qua):
    startsAt: g.startsAt.toISOString(),
    minPunctuality: g.minPunctuality,
    autoMatched: g.autoMatched,
    /** Mốc timeline đã xử lý gần nhất ('' | 'T-2h' | 'T-1h' | 'T-30m' | 'T-10m' | 'T' | 'T+10m' | 'end') */
    milestone: g.milestone,
  };
}

async function notify(tx: Tx, userIds: string[], n: { type: string; title: string; body: string; key: string }, now: Date) {
  if (!userIds.length) return;
  await tx.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, dedupeKey: n.key, createdAt: now })),
    skipDuplicates: true,
  });
}

/** Hạn xác nhận: dưới 2 người xác nhận → huỷ. Người chưa xác nhận bị rút khỏi nhóm (không tính vắng). */
async function evaluateConfirm(tx: Tx, g: GroupFull, now: Date): Promise<boolean> {
  const confirmed = g.members.filter((m) => m.confirmed);
  await tx.groupMember.deleteMany({ where: { groupId: g.id, confirmed: false } });
  const ids = confirmed.map((m) => m.userId);
  if (confirmed.length < GROUP_MIN_CONFIRMED) {
    await tx.group.update({ where: { id: g.id }, data: { status: 'cancelled', milestone: 'end' } });
    await notify(tx, g.members.map((m) => m.userId), {
      type: 'group', key: `group-${g.id}-cancelled`, title: 'Nhóm chạy bị huỷ',
      body: `Nhóm ${g.timeSlot} ngày ${g.date} không đủ ${GROUP_MIN_CONFIRMED} người xác nhận.`,
    }, now);
    return false;
  }
  await tx.group.update({ where: { id: g.id }, data: { status: 'confirmed' } });
  await notify(tx, ids, {
    type: 'group', key: `group-${g.id}-confirmed`, title: 'Nhóm chạy đã chốt',
    body: `${confirmed.length} người sẽ chạy lúc ${g.timeSlot} ngày ${g.date} tại ${g.meetingName}.`,
  }, now);
  return true;
}

/** Nhóm lập muộn (sau T−2h) thì hạn xác nhận dời tới T−30'. */
const lateCreated = (g: Group) => g.createdAt.getTime() > g.startsAt.getTime() - 120 * MINUTE_MS;

async function applyMilestone(tx: Tx, groupId: string, key: MilestoneKey, now: Date): Promise<boolean> {
  const g = await tx.group.findUniqueOrThrow({ where: { id: groupId }, include: groupInclude });
  const confirmedIds = g.members.filter((m) => m.confirmed).map((m) => m.userId);
  const base = { type: 'group', key: `group-${g.id}-${key}` };
  let alive = true;

  switch (key) {
    case 'T-2h':
      if (!lateCreated(g)) alive = await evaluateConfirm(tx, g, now);
      break;
    case 'T-1h':
      for (const m of g.members.filter((x) => x.confirmed)) {
        const p = m.user.runner;
        const eta = p?.homeLat != null && p.homeLng != null
          ? ` Cần khoảng ${etaMinutes({ latitude: p.homeLat, longitude: p.homeLng }, { latitude: g.meetingLat, longitude: g.meetingLng })} phút để tới nơi.`
          : '';
        await notify(tx, [m.userId], { ...base, title: 'Còn 1 tiếng tới giờ chạy nhóm', body: `${g.meetingName} lúc ${g.timeSlot}.${eta}` }, now);
      }
      break;
    case 'T-30m':
      if (lateCreated(g)) alive = await evaluateConfirm(tx, g, now);
      if (alive) await notify(tx, confirmedIds, { ...base, title: 'Bật chia sẻ vị trí', body: 'Bản đồ nhóm đã mở, mọi người đang trên đường tới điểm hội tụ.' }, now);
      break;
    case 'T-10m': {
      const sharing = await tx.groupLocation.findMany({ where: { groupId: g.id }, select: { userId: true } });
      const idle = confirmedIds.filter((id) => !sharing.some((s) => s.userId === id));
      await notify(tx, idle, { ...base, title: 'Sắp tới giờ xuất phát', body: `Còn 10 phút, nhóm đang chờ bạn ở ${g.meetingName}.` }, now);
      break;
    }
    case 'T': {
      const locs = await tx.groupLocation.findMany({ where: { groupId: g.id } });
      for (const l of locs) {
        if (haversineKm({ latitude: l.lat, longitude: l.lng }, { latitude: g.meetingLat, longitude: g.meetingLng }) * 1000 < 50) {
          await tx.groupMember.updateMany({ where: { groupId: g.id, userId: l.userId, arrived: false }, data: { arrived: true, arrivedAt: l.updatedAt } });
        }
      }
      break;
    }
    case 'T+10m': {
      await tx.group.update({ where: { id: g.id }, data: { status: 'in_progress' } });
      for (const m of g.members.filter((x) => x.confirmed)) {
        const p = await tx.runnerProfile.findUniqueOrThrow({ where: { userId: m.userId } });
        const joined = p.groupsJoined + 1;
        const onTime = p.groupsOnTime + (m.arrived ? 1 : 0);
        const noShow = p.noShowCount + (m.arrived ? 0 : 1);
        await tx.runnerProfile.update({
          where: { userId: m.userId },
          data: {
            groupsJoined: joined, groupsOnTime: onTime, punctuality: punctuality(joined, onTime), noShowCount: noShow,
          },
        });
        if (!m.arrived) await tx.groupMember.update({ where: { groupId_userId: { groupId: g.id, userId: m.userId } }, data: { absent: true } });
      }
      break;
    }
    case 'end':
      await tx.group.update({ where: { id: g.id }, data: { status: 'completed' } });
      await tx.groupLocation.deleteMany({ where: { groupId: g.id } }); // ngừng chia sẻ vị trí ngay
      break;
  }
  if (alive) await tx.group.update({ where: { id: g.id }, data: { milestone: key } });
  return alive;
}

/** Xử lý các mốc đã tới hạn của 1 nhóm (idempotent nhờ cột milestone + khoá dòng). */
export async function advanceGroup(groupId: string, now = clock.now()): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM groups WHERE id = ${groupId} FOR UPDATE`;
    const g = await tx.group.findUnique({ where: { id: groupId } });
    if (!g || g.status === 'cancelled' || g.status === 'completed') return;
    for (const key of dueMilestones(g, now)) {
      if (!(await applyMilestone(tx, groupId, key, now))) break;
    }
  }, { timeout: 15_000 });
}

/** Job mỗi phút (và POST /admin/run-group-timeline). */
export async function runGroupTimeline(now = clock.now()) {
  const groups = await prisma.group.findMany({
    where: { status: { in: ['open', 'confirmed', 'in_progress'] }, startsAt: { lte: new Date(now.getTime() + 120 * MINUTE_MS) } },
    select: { id: true },
  });
  for (const g of groups) await advanceGroup(g.id, now);
  return { processed: groups.length };
}

async function loadGroup(groupId: string) {
  const g = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude });
  if (!g) throw notFound('Nhóm không tồn tại');
  return g;
}

async function me(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true } });
  return { user: u, p: u.runner! };
}


/** Hạng của người mới hợp với MỌI thành viên (hai chiều). */
function fitsGroup(g: GroupFull, rank: number, range: RankRange): boolean {
  return g.members.every((m) => rankCompatible({ rank, range }, { rank: m.user.runner?.rankIdx ?? 0, range: m.rankRange }));
}

export async function listGroups(userId: string, q: { userId?: string }) {
  const now = clock.now();
  await runGroupTimeline(now);
  const { p } = await me(userId);

  if (q.userId) {
    const mine = await prisma.group.findMany({
      where: { members: { some: { userId: q.userId } } },
      include: groupInclude,
      orderBy: { startsAt: 'desc' },
      take: 50,
    });
    return mine.map(toApiGroup);
  }

  const groups = await prisma.group.findMany({
    where: { OR: [
      { status: { in: ['open', 'confirmed'] }, startsAt: { gt: now } },
      { status: 'in_progress', members: { some: { userId } } },
    ] },
    include: groupInclude,
    orderBy: { startsAt: 'asc' },
  });
  return groups
    .filter((g) => {
      if (g.members.some((m) => m.userId === userId)) return true; // nhóm của mình luôn hiện
      if (g.members.length >= g.maxMembers) return false;
      if (p.punctuality < g.minPunctuality) return false;
      if (!fitsGroup(g, p.rankIdx, g.rankRange)) return false;
      if (p.homeLat != null && p.homeLng != null) {
        const d = haversineKm({ latitude: p.homeLat, longitude: p.homeLng }, { latitude: g.meetingLat, longitude: g.meetingLng });
        if (d > MATCH_RADIUS_KM) return false;
      }
      return true;
    })
    .map(toApiGroup);
}

export async function groupDetail(groupId: string) {
  await advanceGroup(groupId);
  return toApiGroup(await loadGroup(groupId));
}

export async function createGroup(userId: string, b: z.output<typeof CreateGroupBody>) {
  const now = clock.now();
  const { p } = await me(userId);
  const startsAt = vnDateTime(b.date, b.timeSlot);
  if (startsAt.getTime() <= now.getTime()) throw badRequest('Giờ xuất phát phải ở tương lai');
  const g = await prisma.group.create({
    data: {
      creatorId: userId, date: b.date, timeSlot: b.timeSlot, startsAt,
      meetingName: b.meetingPoint.name, meetingLat: b.meetingPoint.latitude, meetingLng: b.meetingPoint.longitude,
      distanceKm: b.distanceKm, rankRange: b.rankRange, minPunctuality: b.minPunctuality ?? 0,
      status: 'open', maxMembers: GROUP_MAX, createdAt: now,
      members: { create: { userId, rankRange: b.rankRange, confirmed: true, joinedAt: now } },
    },
    include: groupInclude,
  });
  return toApiGroup(g);
}

export async function joinGroup(userId: string, groupId: string) {
  const now = clock.now();
  await advanceGroup(groupId, now);
  const { p } = await me(userId);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM groups WHERE id = ${groupId} FOR UPDATE`; // chống vượt 6 người
    const g = await tx.group.findUnique({ where: { id: groupId }, include: groupInclude });
    if (!g) throw notFound('Nhóm không tồn tại');
    if (g.members.some((m) => m.userId === userId)) throw conflict('Bạn đã trong nhóm');
    if (!['open', 'confirmed'].includes(g.status) || g.startsAt.getTime() <= now.getTime()) throw badRequest('Nhóm đã đóng đăng ký');
    if (g.members.length >= g.maxMembers) throw conflict('Nhóm đã đầy');
    if (!fitsGroup(g, p.rankIdx, g.rankRange)) throw forbidden('Hạng của bạn không phù hợp');
    if (p.punctuality < g.minPunctuality) throw forbidden(`Nhóm chỉ nhận người đúng hẹn từ ${g.minPunctuality}%`);
    // Vào sau hạn xác nhận (nhóm đã chốt) thì coi như xác nhận luôn.
    await tx.groupMember.create({ data: { groupId, userId, rankRange: g.rankRange, confirmed: g.status === 'confirmed', joinedAt: now } });
  });
  return toApiGroup(await loadGroup(groupId));
}

export async function confirmGroup(userId: string, groupId: string) {
  const now = clock.now();
  await advanceGroup(groupId, now);
  const g = await loadGroup(groupId);
  const m = g.members.find((x) => x.userId === userId);
  if (!m) throw badRequest('Bạn chưa tham gia nhóm này');
  if (g.status === 'cancelled' || g.status === 'completed') throw badRequest('Nhóm đã kết thúc hoặc bị huỷ');
  if (g.startsAt.getTime() <= now.getTime()) throw badRequest('Đã quá giờ xác nhận');
  if (!m.confirmed) await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { confirmed: true } });
  return toApiGroup(await loadGroup(groupId));
}

/** Huỷ tham gia. Trước hạn xác nhận (T−2h) thì không tính vắng; sau đó vẫn rời được nhưng bị ghi vắng. */
export async function leaveGroup(userId: string, groupId: string) {
  const now = clock.now();
  await advanceGroup(groupId, now);
  const g = await loadGroup(groupId);
  const m = g.members.find((x) => x.userId === userId);
  if (!m) throw badRequest('Bạn chưa tham gia nhóm này');
  if (g.status === 'in_progress' || g.status === 'completed') throw badRequest('Nhóm đã bắt đầu, không thể huỷ');
  const afterDeadline = now.getTime() > g.startsAt.getTime() - 120 * MINUTE_MS && g.status === 'confirmed' && m.confirmed;
  await prisma.$transaction(async (tx) => {
    await tx.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
    await tx.groupLocation.deleteMany({ where: { groupId, userId } });
    if (afterDeadline) {
      const p = await tx.runnerProfile.findUniqueOrThrow({ where: { userId } });
      const noShow = p.noShowCount + 1;
      const joined = p.groupsJoined + 1;
      await tx.runnerProfile.update({
        where: { userId },
        data: {
          noShowCount: noShow, groupsJoined: joined, punctuality: punctuality(joined, p.groupsOnTime),
        },
      });
    }
    const left = await tx.groupMember.count({ where: { groupId } });
    if (left === 0) await tx.group.update({ where: { id: groupId }, data: { status: 'cancelled', milestone: 'end' } });
  });
  return { success: true, countedAbsent: afterDeadline };
}

/** Gửi vị trí (từ T−30'). Trong 50 m quanh điểm hội tụ → đánh dấu đã tới. */
export async function postLocation(userId: string, b: z.output<typeof LocationBody>) {
  const now = clock.now();
  await advanceGroup(b.groupId, now);
  const g = await loadGroup(b.groupId);
  const m = g.members.find((x) => x.userId === userId);
  if (!m) throw badRequest('Bạn chưa tham gia nhóm này');
  if (g.status === 'cancelled' || g.status === 'completed') throw badRequest('Nhóm đã kết thúc hoặc bị huỷ');
  if (!locationSharingOpen(g.startsAt, g.distanceKm, now)) throw badRequest('Chưa tới giờ chia sẻ vị trí (mở trước giờ xuất phát 30 phút)');
  const pos = { latitude: b.latitude, longitude: b.longitude };
  await prisma.groupLocation.upsert({
    where: { groupId_userId: { groupId: g.id, userId } },
    create: { groupId: g.id, userId, lat: b.latitude, lng: b.longitude, updatedAt: now },
    update: { lat: b.latitude, lng: b.longitude, updatedAt: now },
  });
  const arrived = !m.arrived && arrivedWithin50m(pos, { latitude: g.meetingLat, longitude: g.meetingLng }, g.startsAt, now);
  if (arrived) {
    await prisma.groupMember.update({ where: { groupId_userId: { groupId: g.id, userId } }, data: { arrived: true, arrivedAt: now } });
  }
  return { success: true, arrived: m.arrived || arrived };
}

export async function listLocations(userId: string, groupId: string) {
  const now = clock.now();
  await advanceGroup(groupId, now);
  const g = await loadGroup(groupId);
  if (!g.members.some((m) => m.userId === userId)) throw forbidden('Bạn chưa tham gia nhóm này');
  const locs = await prisma.groupLocation.findMany({ where: { groupId } });
  const meeting = { latitude: g.meetingLat, longitude: g.meetingLng };
  return locs.map((l) => {
    const m = g.members.find((x) => x.userId === l.userId);
    return {
      userId: l.userId,
      userName: m?.user.name ?? '',
      latitude: l.lat,
      longitude: l.lng,
      etaMinutes: m?.arrived ? 0 : etaMinutes({ latitude: l.lat, longitude: l.lng }, meeting),
      arrived: m?.arrived ?? false,
      updatedAt: l.updatedAt.toISOString(),
    };
  });
}

/** Ghép tự động: lưu yêu cầu, thử gom ngay 3–6 người. Chưa đủ thì chờ người khác đăng ký. */
export async function requestAutoMatch(userId: string, b: z.output<typeof AutoMatchBody>) {
  const now = clock.now();
  const { p } = await me(userId);
  const future = b.timeSlots.filter((s) => vnDateTime(b.date, s).getTime() > now.getTime() + 120 * MINUTE_MS);
  if (!future.length) throw badRequest('Khung giờ phải cách hiện tại ít nhất 2 tiếng');

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242)`; // 1 lượt ghép tại một thời điểm
    await tx.autoMatchRequest.updateMany({ where: { userId, status: 'pending' }, data: { status: 'cancelled' } });
    const req = await tx.autoMatchRequest.create({
      data: { userId, date: b.date, timeSlots: future, distanceKm: b.distanceKm, rankRange: b.rankRange, lat: b.latitude, lng: b.longitude, createdAt: now },
    });
    const pending = await tx.autoMatchRequest.findMany({ where: { status: 'pending', date: b.date }, include: { user: { include: { runner: true } } } });
    const toCand = (r: (typeof pending)[number]) => ({
      id: r.id, userId: r.userId, rank: r.user.runner?.rankIdx ?? 0, range: r.rankRange, slots: r.timeSlots,
      distanceKm: r.distanceKm, latitude: r.lat, longitude: r.lng, createdAt: r.createdAt,
    });
    const seed = pending.find((r) => r.id === req.id)!;
    const match = autoMatch(toCand(seed), pending.filter((r) => r.user.role === 'member').map(toCand));
    if (!match) return { requestId: req.id, status: 'pending' as const, groupId: null };

    const stores = await tx.store.findMany({ where: { status: 'approved' } });
    const points = [
      ...PUBLIC_MEETING_POINTS,
      ...stores.map((s) => ({ name: `${s.storeName} (đối tác)`, latitude: s.lat, longitude: s.lng })),
    ];
    const meeting = pickMeetingPoint(match.members, points);
    const g = await tx.group.create({
      data: {
        creatorId: userId, date: b.date, timeSlot: match.slot, startsAt: vnDateTime(b.date, match.slot),
        meetingName: meeting.name, meetingLat: meeting.latitude, meetingLng: meeting.longitude,
        distanceKm: b.distanceKm, rankRange: b.rankRange, status: 'open', maxMembers: GROUP_MAX,
        autoMatched: true, createdAt: now,
        members: { create: match.members.map((m, i) => ({ userId: m.userId, rankRange: m.range, confirmed: false, joinedAt: new Date(now.getTime() + i) })) },
      },
    });
    await tx.autoMatchRequest.updateMany({ where: { id: { in: match.members.map((m) => m.id) } }, data: { status: 'matched', groupId: g.id } });
    await notify(tx, match.members.map((m) => m.userId), {
      type: 'group', key: `group-${g.id}-matched`, title: 'Đã ghép được nhóm chạy',
      body: `${match.members.length} người, ${match.slot} ngày ${b.date} tại ${meeting.name}. Hãy xác nhận trước 2 tiếng.`,
    }, now);
    return { requestId: req.id, status: 'matched' as const, groupId: g.id };
  });
}

export async function autoMatchStatus(userId: string) {
  const r = await prisma.autoMatchRequest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return r ? { requestId: r.id, status: r.status, groupId: r.groupId, date: r.date, timeSlots: r.timeSlots } : null;
}

export async function meetingPoints() {
  const stores = await prisma.store.findMany({ where: { status: 'approved' } });
  return [
    ...PUBLIC_MEETING_POINTS.map((p) => ({ ...p, type: 'public' as const })),
    ...stores.map((s) => ({ name: `${s.storeName} (đối tác)`, latitude: s.lat, longitude: s.lng, type: 'store' as const })),
  ];
}
