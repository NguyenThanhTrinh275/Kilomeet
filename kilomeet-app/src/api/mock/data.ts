// Mock data — shared demo accounts & helpers
import type { Runner, Store, Admin, AnyUser } from '../types';

// ponytail: wallet addresses are fake hex; swap to real Fuji addresses for demo
export const MOCK_RUNNERS: Record<string, Runner> = {
  'user-lan': {
    id: 'user-lan',
    email: 'lan@demo.com',
    name: 'Nguyễn Lan',
    role: 'runner',
    walletAddress: '0xLAN0000000000000000000000000000000000',
    createdAt: '2026-11-01T08:00:00Z',
    rank: 'đồng',
    tokenBalance: 0,
    kmThisWeek: 0,
    isMember: false,
    punctuality: 100,
    seasonBadge: null,
    skipWeekAvailable: true,
  },
  'user-minh': {
    id: 'user-minh',
    email: 'minh@demo.com',
    name: 'Trần Minh',
    role: 'member',
    walletAddress: '0xMINH000000000000000000000000000000',
    createdAt: '2026-09-01T08:00:00Z',
    rank: 'cao_thủ',
    tokenBalance: 1000,
    kmThisWeek: 42,
    isMember: true,
    punctuality: 95,
    seasonBadge: 'cao_thủ',
    skipWeekAvailable: false,
  },
};

export const MOCK_STORE: Store = {
  id: 'store-fuji',
  email: 'quanfuji@demo.com',
  name: 'Quán Fuji Coffee',
  role: 'store',
  walletAddress: '0xFUJI000000000000000000000000000000',
  createdAt: '2026-09-15T08:00:00Z',
  storeName: 'Fuji Coffee',
  storeAddress: '268 Lý Thường Kiệt, P.14, Q.10',
  latitude: 10.773,
  longitude: 106.660,
  approved: true,
  totalUsages: 47,
  totalFeesVnd: 141_000,
};

export const MOCK_ADMIN: Admin = {
  id: 'user-admin',
  email: 'admin@demo.com',
  name: 'Admin KILOMeet',
  role: 'admin',
  walletAddress: '0xADMIN00000000000000000000000000000',
  createdAt: '2026-08-01T08:00:00Z',
};

const PASSWORD = 'demo123';

export const ACCOUNTS: Record<string, { password: string; user: AnyUser }> = {
  'lan@demo.com': { password: PASSWORD, user: MOCK_RUNNERS['user-lan'] },
  'minh@demo.com': { password: PASSWORD, user: MOCK_RUNNERS['user-minh'] },
  'quanfuji@demo.com': { password: PASSWORD, user: MOCK_STORE },
  'admin@demo.com': { password: PASSWORD, user: MOCK_ADMIN },
};

let currentUserId: string | null = null;

export function setCurrentUser(id: string | null): void {
  currentUserId = id;
}

export function getCurrentUser(): AnyUser | null {
  if (!currentUserId) return null;
  for (const acct of Object.values(ACCOUNTS)) {
    if (acct.user.id === currentUserId) return acct.user;
  }
  return null;
}

export function getCurrentUserId(): string {
  if (!currentUserId) throw new Error('Not authenticated');
  return currentUserId;
}
