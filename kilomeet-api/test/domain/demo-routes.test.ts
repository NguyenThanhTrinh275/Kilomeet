import { describe, expect, it } from 'vitest';
import { route3km, route5km2Stores } from '../../scripts/demo-routes.js';
import { routeDistanceKm, storesPassed } from '../../src/domain/geo.js';

const stores = [
  { id: 'store-fuji', latitude: 10.773, longitude: 106.66 },
  { id: 'store-highlands', latitude: 10.775, longitude: 106.662 },
  { id: 'store-phuclong', latitude: 10.771, longitude: 106.658 },
  { id: 'store-cong', latitude: 10.776, longitude: 106.664 },
  { id: 'store-banhmi', latitude: 10.77, longitude: 106.656 },
  { id: 'store-juice', latitude: 10.774, longitude: 106.661 },
];
const t0 = new Date('2026-11-12T22:30:00Z');

describe('route demo', () => {
  it('3 km: ≥ 3 km, không qua quán nào', () => {
    const r = route3km(t0);
    expect(routeDistanceKm(r)).toBeGreaterThanOrEqual(3);
    expect(storesPassed(r, stores)).toEqual([]);
  });
  it('5 km: ~5 km, qua đúng Fuji và Highlands', () => {
    const r = route5km2Stores(t0);
    expect(routeDistanceKm(r)).toBeGreaterThan(4.8);
    expect(routeDistanceKm(r)).toBeLessThan(5.5);
    expect(storesPassed(r, stores).map((s) => s.id)).toEqual(['store-fuji', 'store-highlands']);
  });
});
