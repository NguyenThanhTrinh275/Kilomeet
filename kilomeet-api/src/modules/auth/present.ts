import type { RunnerProfile, Store, User } from '@prisma/client';
import { rankName } from '../../domain/rank.js';
import { vnWeekStart } from '../../domain/time.js';

export type UserWithProfile = User & { runner: RunnerProfile | null; store: Store | null };

export const userInclude = { runner: true, store: true } as const;

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** kmThisWeek chỉ có nghĩa khi đúng tuần hiện tại (giờ VN); tuần khác → 0. */
export function effectiveKmThisWeek(p: Pick<RunnerProfile, 'kmThisWeek' | 'kmWeekStart'>, now: Date): number {
  return p.kmWeekStart === vnWeekStart(now) ? p.kmThisWeek : 0;
}

/** Đổi bản ghi DB → `AnyUser` đúng hình dạng types.ts của FE. */
export function toApiUser(u: UserWithProfile, now: Date) {
  const base = {
    id: u.id,
    email: u.email,
    name: u.name,
    walletAddress: u.walletAddress,
    createdAt: u.createdAt.toISOString(),
  };

  if ((u.role === 'runner' || u.role === 'member') && u.runner) {
    const p = u.runner;
    return {
      ...base,
      role: u.role,
      rank: rankName(p.rankIdx),
      tokenBalance: p.tokenBalance,
      kmThisWeek: round2(effectiveKmThisWeek(p, now)),
      isMember: p.isMember,
      punctuality: p.punctuality,
      seasonBadge: p.seasonBadgeIdx === null ? null : rankName(p.seasonBadgeIdx),
      skipWeekAvailable: p.skipWeekAvailable,
      // Thêm (FE bỏ qua):
      memberUntil: p.memberUntil?.toISOString() ?? null,
      groupBanUntil: p.groupBanUntil?.toISOString() ?? null,
      area: p.area,
    };
  }

  if (u.role === 'store' && u.store) {
    const s = u.store;
    return {
      ...base,
      role: 'store' as const,
      storeName: s.storeName,
      storeAddress: s.storeAddress,
      latitude: s.lat,
      longitude: s.lng,
      approved: s.status === 'approved',
      totalUsages: s.totalUsages,
      totalFeesVnd: s.totalFeesVnd,
      // Thêm (FE bỏ qua):
      status: s.status,
    };
  }

  return { ...base, role: 'admin' as const };
}
