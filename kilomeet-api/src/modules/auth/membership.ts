import { DAY_MS } from '../../domain/time.js';
import { clock } from '../../lib/clock.js';
import { config } from '../../lib/config.js';
import { forbidden } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

/** Gói Hội viên (thanh toán giả lập). Đang là hội viên thì cộng nối tiếp vào hạn cũ. */
export async function subscribe(userId: string) {
  const now = clock.now();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { runner: true } });
  if ((user.role !== 'runner' && user.role !== 'member') || !user.runner) {
    throw forbidden('Chỉ người chạy mới đăng ký hội viên');
  }
  const from = Math.max(now.getTime(), user.runner.memberUntil?.getTime() ?? 0);
  const memberUntil = new Date(from + config.MEMBERSHIP_DAYS * DAY_MS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: 'member' } }),
    prisma.runnerProfile.update({ where: { userId }, data: { isMember: true, memberUntil } }),
  ]);
  return { success: true, memberUntil: memberUntil.toISOString() };
}

/** Hết hạn → về runner, rút khỏi nhóm chưa diễn ra (không tính vắng) — quyết định #13. */
export async function expireMember(userId: string, now: Date) {
  await prisma.$transaction(async (tx) => {
    const p = await tx.runnerProfile.findUnique({ where: { userId } });
    if (!p?.isMember || !p.memberUntil || p.memberUntil.getTime() > now.getTime()) return;
    await tx.user.update({ where: { id: userId }, data: { role: 'runner' } });
    await tx.runnerProfile.update({ where: { userId }, data: { isMember: false } });
    await tx.groupMember.deleteMany({
      where: { userId, group: { status: { in: ['open', 'confirmed'] }, startsAt: { gt: now } } },
    });
    await tx.autoMatchRequest.updateMany({ where: { userId, status: 'pending' }, data: { status: 'cancelled' } });
  });
}

export async function runMembershipExpiry(now = clock.now()) {
  const expired = await prisma.runnerProfile.findMany({
    where: { isMember: true, memberUntil: { lt: now } },
    select: { userId: true },
  });
  for (const e of expired) await expireMember(e.userId, now);
  return { processed: expired.length };
}
