// Mock — Auth handlers
import type { AuthResponse, AnyUser, Runner } from '../types';
import { ACCOUNTS, setCurrentUser, getCurrentUser } from './data';

export function mockLogin(body: unknown): AuthResponse {
  const { email, password } = body as { email: string; password: string };
  const acct = ACCOUNTS[email];
  if (!acct || acct.password !== password) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }
  setCurrentUser(acct.user.id);
  return { user: acct.user, token: `mock-jwt-${acct.user.id}` };
}

export function mockRegister(body: unknown): AuthResponse {
  const { email, name, password } = body as { email: string; name: string; password: string };
  if (ACCOUNTS[email]) throw new Error('Email đã được sử dụng');
  const user: AnyUser = {
    id: `user-${Date.now()}`,
    email,
    name,
    role: 'runner',
    walletAddress: `0x${Date.now().toString(16).padStart(40, '0')}`,
    createdAt: new Date().toISOString(),
    rank: 'đồng',
    tokenBalance: 0,
    kmThisWeek: 0,
    isMember: false,
    punctuality: 100,
    seasonBadge: null,
    skipWeekAvailable: true,
  };
  ACCOUNTS[email] = { password, user };
  setCurrentUser(user.id);
  return { user, token: `mock-jwt-${user.id}` };
}

export function mockGetUser(): AnyUser {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export function mockSubscribe(): { success: boolean } {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  if (!('isMember' in user)) throw new Error('Chỉ người chạy mới đăng ký hội viên');
  // user is Runner here (guarded by isMember check) — mutate in-place for mock persistence
  const runner = user as Runner;
  runner.isMember = true;
  runner.role = 'member';
  return { success: true };
}
