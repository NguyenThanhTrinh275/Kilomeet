// Mock — Admin handlers
import type { PendingStore, SeasonInfo } from '../types';

const pendingStores: PendingStore[] = [
  {
    id: 'store-pending-1',
    email: 'newcafe@demo.com',
    storeName: 'New Café Bách Khoa',
    storeAddress: '280 Lý Thường Kiệt, P.14, Q.10',
    latitude: 10.774,
    longitude: 106.661,
    appliedAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 'store-pending-2',
    email: 'juicebar@demo.com',
    storeName: 'Fresh Juice Corner',
    storeAddress: '15 Tô Hiến Thành, P.15, Q.10',
    latitude: 10.776,
    longitude: 106.663,
    appliedAt: '2026-11-09T15:30:00Z',
  },
];

const seasons: SeasonInfo[] = [
  {
    id: 'season-2026-3',
    name: 'Mùa 3/2026',
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    isActive: true,
  },
];

export function mockGetPendingStores(): PendingStore[] {
  return pendingStores;
}

export function mockApproveStore(body: unknown): { success: boolean } {
  const { storeId, approved } = body as { storeId: string; approved: boolean };
  const idx = pendingStores.findIndex((s) => s.id === storeId);
  if (idx === -1) throw new Error('Cửa hàng không tìm thấy');
  if (approved) {
    pendingStores.splice(idx, 1);
  }
  return { success: true };
}

export function mockGetSeasons(): SeasonInfo[] {
  return seasons;
}

export function mockSeasonControl(body: unknown): SeasonInfo {
  const { action } = body as { action: 'start' | 'end' };
  const active = seasons.find((s) => s.isActive);

  if (action === 'end' && active) {
    active.isActive = false;
    return active;
  }

  if (action === 'start') {
    const newSeason: SeasonInfo = {
      id: `season-${Date.now()}`,
      name: `Mùa ${new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3}/${new Date().getFullYear()}`,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      isActive: true,
    };
    seasons.push(newSeason);
    return newSeason;
  }

  throw new Error('Không có mùa đang chạy');
}
