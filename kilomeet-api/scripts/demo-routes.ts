// Route GPS mẫu cho demo và test. Nội suy mỗi ~20 m, tốc độ ~6 phút/km.
import { haversineKm, type RoutePoint } from '../src/domain/geo.js';

type LL = [number, number];

function build(waypoints: LL[], start: Date, paceMinPerKm = 6): RoutePoint[] {
  const out: RoutePoint[] = [];
  let t = start.getTime();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [aLat, aLng] = waypoints[i]!;
    const [bLat, bLng] = waypoints[i + 1]!;
    const segKm = haversineKm({ latitude: aLat, longitude: aLng }, { latitude: bLat, longitude: bLng });
    const steps = Math.max(1, Math.round((segKm * 1000) / 20));
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const f = s / steps;
      if (s > 0) t += ((segKm / steps) * paceMinPerKm) * 60_000;
      out.push({ latitude: aLat + (bLat - aLat) * f, longitude: aLng + (bLng - aLng) * f, timestamp: new Date(t).toISOString() });
    }
  }
  return out;
}

/** ~3,1 km, vòng phía nam HCMUT, không đi ngang quán nào. */
export const route3km = (start: Date) =>
  build([[10.76, 106.665], [10.7645, 106.665], [10.7645, 106.6746], [10.76, 106.6746], [10.76, 106.665]], start);

/**
 * ~5 km đi ngang đúng 2 quán: Fuji Coffee (10.773, 106.660) và Highlands (10.775, 106.662).
 * Né Juice Factory (10.774, 106.661) và các quán khác > 50 m.
 */
export const route5km2Stores = (start: Date) =>
  build(
    [
      [10.769, 106.665], [10.773, 106.665], [10.773, 106.66], // vào Fuji từ phía đông
      [10.775, 106.66], [10.775, 106.662], // lên bắc rồi sang Highlands
      [10.775, 106.671], [10.763, 106.671], [10.763, 106.665], [10.769, 106.665],
    ],
    start,
  );

export const ROUTES = { '3km': route3km, '5km-2-quan': route5km2Stores } as const;
