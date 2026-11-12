// Mock — các endpoint BE thêm sau (mùa, huy hiệu, chọn quán, nhóm realtime, admin mới).
// Chỉ để chế độ mock (EXPO_PUBLIC_API_URL rỗng) không vỡ; hành vi thật nằm ở kilomeet-api.
import type { GroupRun, PendingStore } from '../types';
import { getCurrentUser, getCurrentUserId } from './data';
import { mockGetGroupDetail } from './groups';
import { mockApproveStore, mockGetPendingStores } from './admin';

export function mockCurrentSeason() {
  const end = new Date('2026-12-31T16:59:59Z').getTime();
  return {
    id: 'season-2026-3', name: 'Mùa 3/2026', startDate: '2026-09-01', endDate: '2026-12-31', isActive: true,
    daysLeft: Math.max(0, Math.ceil((end - Date.now()) / 86_400_000)),
  };
}

export function mockMyBadges() {
  const u = getCurrentUser();
  const rank = u && 'rank' in u ? (u.seasonBadge ?? u.rank) : 'đồng';
  return [
    { seasonId: 'season-2026-3', seasonName: 'Mùa 3/2026', highestRank: rank, txHash: null, current: true },
    { seasonId: 'season-2026-2', seasonName: 'Mùa 2/2026', highestRank: 'kim_cương', txHash: null, current: false },
  ];
}

export function mockPassedStores() {
  return [{ storeId: 'store-fuji', storeName: 'Fuji Coffee', claimed: false }];
}

export function mockClaimStore(body: unknown) {
  const { storeId } = body as { storeId: string };
  const now = new Date();
  return { storeId, claimedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 86_400_000).toISOString() };
}

export function mockConfirmGroup(body: unknown): GroupRun {
  const { groupId } = body as { groupId: string };
  const g = mockGetGroupDetail({ groupId });
  const m = g.members.find((x) => x.userId === getCurrentUserId());
  if (!m) throw new Error('Bạn chưa tham gia nhóm này');
  m.confirmed = true;
  return g;
}

export function mockLeaveGroup(body: unknown) {
  const { groupId } = body as { groupId: string };
  const g = mockGetGroupDetail({ groupId });
  g.members = g.members.filter((m) => m.userId !== getCurrentUserId());
  return { success: true, countedAbsent: false };
}

export const mockLocations = () => [];
export const mockShareLocation = () => ({ success: true, arrived: false });
export const mockAutoMatch = () => ({ requestId: `am-${Date.now()}`, status: 'pending' as const, groupId: null });
export const mockMeetingPoints = () => [
  { name: 'Cổng ĐH Bách Khoa (Lý Thường Kiệt)', latitude: 10.7722, longitude: 106.6596, type: 'public' as const },
  { name: 'Công viên Lê Thị Riêng', latitude: 10.7865, longitude: 106.6648, type: 'public' as const },
  { name: 'Fuji Coffee (đối tác)', latitude: 10.773, longitude: 106.66, type: 'store' as const },
];

type AdminStore = PendingStore & { status: 'pending' | 'approved' | 'rejected' };
const decided: AdminStore[] = [
  { id: 'store-fuji', email: 'quanfuji@demo.com', storeName: 'Fuji Coffee', storeAddress: '268 Lý Thường Kiệt, P.14, Q.10',
    latitude: 10.773, longitude: 106.66, appliedAt: '2026-09-15T08:00:00Z', status: 'approved' },
];

export function mockAdminStores(): AdminStore[] {
  return [...mockGetPendingStores().map((s) => ({ ...s, status: 'pending' as const })), ...decided];
}

/** POST /admin/stores/<id> { action } */
export function mockAdminStoreAction(id: string, body: unknown) {
  const { action } = body as { action: 'approve' | 'reject' };
  const store = mockGetPendingStores().find((s) => s.id === id);
  if (!store) throw new Error('Không tìm thấy cửa hàng');
  mockApproveStore({ storeId: id, approved: true }); // bỏ khỏi danh sách chờ
  decided.unshift({ ...store, status: action === 'approve' ? 'approved' : 'rejected' });
  return { success: true };
}

export const mockNotifications = () => [];
