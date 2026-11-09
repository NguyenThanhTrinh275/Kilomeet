// Mock router — maps endpoint strings to mock handlers
import { mockLogin, mockRegister, mockGetUser } from './auth';
import { mockStartRun, mockEndRun, mockGetRunHistory } from './runs';
import { mockGetQuests, mockCompleteQuest } from './quests';
import { mockGetVouchers, mockBuyVoucher, mockGiftVoucher, mockGetMyVouchers } from './vouchers';
import { mockGetGroups, mockCreateGroup, mockJoinGroup, mockGetGroupDetail } from './groups';
import { mockGetStoreDashboard, mockCreateVoucher, mockScanQR } from './store';
import { mockGetPendingStores, mockApproveStore, mockGetSeasons, mockSeasonControl } from './admin';

type Handler = (body?: unknown, params?: Record<string, string>) => unknown;

const GET_ROUTES: Record<string, Handler> = {
  '/auth/me': () => mockGetUser(),
  '/runs': (_b, p) => mockGetRunHistory(p),
  '/quests': (_b, p) => mockGetQuests(p),
  '/vouchers': (_b, p) => mockGetVouchers(p),
  '/vouchers/mine': () => mockGetMyVouchers(),
  '/groups': (_b, p) => mockGetGroups(p),
  '/groups/detail': (_b, p) => mockGetGroupDetail(p),
  '/store/dashboard': () => mockGetStoreDashboard(),
  '/admin/pending-stores': () => mockGetPendingStores(),
  '/admin/seasons': () => mockGetSeasons(),
};

const POST_ROUTES: Record<string, Handler> = {
  '/auth/login': (b) => mockLogin(b),
  '/auth/register': (b) => mockRegister(b),
  '/runs/start': (b) => mockStartRun(b),
  '/runs/end': (b) => mockEndRun(b),
  '/quests/complete': (b) => mockCompleteQuest(b),
  '/vouchers/buy': (b) => mockBuyVoucher(b),
  '/vouchers/gift': (b) => mockGiftVoucher(b),
  '/groups/create': (b) => mockCreateGroup(b),
  '/groups/join': (b) => mockJoinGroup(b),
  '/store/vouchers': (b) => mockCreateVoucher(b),
  '/store/scan': (b) => mockScanQR(b),
  '/admin/approve-store': (b) => mockApproveStore(b),
  '/admin/season': (b) => mockSeasonControl(b),
};

const PUT_ROUTES: Record<string, Handler> = {};
const DELETE_ROUTES: Record<string, Handler> = {};

function route<T>(routes: Record<string, Handler>, endpoint: string, body?: unknown, params?: Record<string, string>): T {
  const handler = routes[endpoint];
  if (!handler) throw new Error(`Mock route not found: ${endpoint}`);
  return handler(body, params) as T;
}

export function mockGet<T>(endpoint: string, params?: Record<string, string>): T {
  return route<T>(GET_ROUTES, endpoint, undefined, params);
}

export function mockPost<T>(endpoint: string, body?: unknown): T {
  return route<T>(POST_ROUTES, endpoint, body);
}

export function mockPut<T>(endpoint: string, body?: unknown): T {
  return route<T>(PUT_ROUTES, endpoint, body);
}

export function mockDelete<T>(endpoint: string): T {
  return route<T>(DELETE_ROUTES, endpoint);
}
