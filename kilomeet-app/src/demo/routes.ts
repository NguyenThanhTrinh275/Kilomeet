// Route GPS mẫu để demo trên sân khấu (giống kilomeet-api/scripts/demo-routes.ts).
// Bật nút "Phát buổi chạy mẫu" bằng EXPO_PUBLIC_DEMO=true.
import type { GpsPoint } from '../api/types';

type LL = [number, number];
const R = 6371;
const rad = (x: number) => (x * Math.PI) / 180;
function km(a: LL, b: LL) {
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Nội suy mỗi ~20 m, tốc độ 6 phút/km, kết thúc tại `end`. */
function build(waypoints: LL[], end: Date, paceMinPerKm = 6): GpsPoint[] {
  const pts: { lat: number; lng: number; t: number }[] = [];
  let t = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    const seg = km(a, b);
    const steps = Math.max(1, Math.round((seg * 1000) / 20));
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      if (s > 0) t += (seg / steps) * paceMinPerKm * 60_000;
      pts.push({ lat: a[0] + ((b[0] - a[0]) * s) / steps, lng: a[1] + ((b[1] - a[1]) * s) / steps, t });
    }
  }
  const start = end.getTime() - t;
  return pts.map((p) => ({ latitude: p.lat, longitude: p.lng, timestamp: new Date(start + p.t).toISOString() }));
}

export const DEMO_ROUTES = {
  '3 km (không qua quán)': (end: Date) =>
    build([[10.76, 106.665], [10.7645, 106.665], [10.7645, 106.6746], [10.76, 106.6746], [10.76, 106.665]], end),
  '5 km ngang Fuji + Highlands': (end: Date) =>
    build([[10.769, 106.665], [10.773, 106.665], [10.773, 106.66], [10.775, 106.66], [10.775, 106.662],
      [10.775, 106.671], [10.763, 106.671], [10.763, 106.665], [10.769, 106.665]], end),
} as const;

export const DEMO_ENABLED = process.env.EXPO_PUBLIC_DEMO === 'true';
