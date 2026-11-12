import { describe, expect, it } from 'vitest';
import { haversineKm, routeDistanceKm, storesPassed } from '../../src/domain/geo.js';

describe('geo', () => {
  it('haversine: 0,01 độ vĩ ≈ 1,112 km', () => {
    expect(haversineKm({ latitude: 10, longitude: 106 }, { latitude: 10.01, longitude: 106 })).toBeCloseTo(1.112, 2);
  });

  it('route 1 điểm hoặc rỗng → 0 km', () => {
    expect(routeDistanceKm([])).toBe(0);
    expect(routeDistanceKm([{ latitude: 10.77, longitude: 106.66 }])).toBe(0);
  });

  it('bỏ đoạn nhanh hơn 25 km/h (đi xe)', () => {
    const route = [
      { latitude: 10.77, longitude: 106.66, timestamp: '2026-11-11T00:00:00Z' },
      { latitude: 10.78, longitude: 106.66, timestamp: '2026-11-11T00:06:00Z' }, // 1,1 km / 6' = 11 km/h
      { latitude: 10.8, longitude: 106.66, timestamp: '2026-11-11T00:07:00Z' }, // 2,2 km / 1' = 133 km/h
    ];
    expect(routeDistanceKm(route)).toBeCloseTo(1.112, 2);
  });

  it('timestamp trùng nhau thì không lọc vận tốc', () => {
    const t = '2026-11-11T00:00:00Z';
    const route = [
      { latitude: 10.77, longitude: 106.66, timestamp: t },
      { latitude: 10.79, longitude: 106.66, timestamp: t },
    ];
    expect(routeDistanceKm(route)).toBeCloseTo(2.224, 2);
  });

  it('quán trong 50 m mới tính là đi ngang', () => {
    const fuji = { id: 'fuji', latitude: 10.773, longitude: 106.66 };
    const far = { id: 'far', latitude: 10.776, longitude: 106.66 }; // ~330 m
    const route = [
      { latitude: 10.7733, longitude: 106.66 }, // ~33 m tới Fuji
      { latitude: 10.7745, longitude: 106.66 },
    ];
    expect(storesPassed(route, [far, fuji]).map((s) => s.id)).toEqual(['fuji']);
  });
});
