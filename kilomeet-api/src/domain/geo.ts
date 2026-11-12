// Khoảng cách trên mặt cầu (haversine). Không cần PostGIS: số quán ít, duyệt hết là đủ nhanh.

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends LatLng {
  timestamp?: string;
}

const R_KM = 6371;
const rad = (x: number) => (x * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Vận tốc tối đa hợp lý khi chạy bộ; đoạn nhanh hơn (đi xe) bị bỏ. */
export const MAX_RUN_SPEED_KMH = 25;

/**
 * Tổng quãng đường của route. Đoạn nào có timestamp hợp lệ và vận tốc > 25 km/h thì không tính.
 * Đoạn không có timestamp (hoặc trùng timestamp) vẫn được tính.
 */
export function routeDistanceKm(route: readonly RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!;
    const b = route[i]!;
    const d = haversineKm(a, b);
    const ta = a.timestamp ? Date.parse(a.timestamp) : NaN;
    const tb = b.timestamp ? Date.parse(b.timestamp) : NaN;
    const hours = (tb - ta) / 3_600_000;
    if (Number.isFinite(hours) && hours > 0 && d / hours > MAX_RUN_SPEED_KMH) continue;
    total += d;
  }
  return total;
}

export const STORE_PROXIMITY_M = 50;

/** Các quán mà route đi qua trong bán kính `radiusM` (giữ thứ tự quán gặp đầu tiên). */
export function storesPassed<S extends LatLng & { id: string }>(
  route: readonly LatLng[],
  stores: readonly S[],
  radiusM = STORE_PROXIMITY_M,
): S[] {
  const hits: { store: S; at: number }[] = [];
  for (const store of stores) {
    const at = route.findIndex((p) => haversineKm(p, store) * 1000 < radiusM);
    if (at !== -1) hits.push({ store, at });
  }
  return hits.sort((x, y) => x.at - y.at).map((h) => h.store);
}

export function centroid(points: readonly LatLng[]): LatLng {
  const n = points.length || 1;
  return {
    latitude: points.reduce((s, p) => s + p.latitude, 0) / n,
    longitude: points.reduce((s, p) => s + p.longitude, 0) / n,
  };
}
