// Nhóm chạy cho Hội viên (hợp đồng 6.6).
import { GROUP_TIME_SLOTS } from '../contract/schemas.js';
import { centroid, haversineKm, type LatLng } from './geo.js';
import { MINUTE_MS } from './time.js';

export { GROUP_TIME_SLOTS };
export type RankRange = 'same' | 'within1' | 'within2' | 'any';

export const GROUP_MAX = 6;
export const GROUP_MIN_CONFIRMED = 2;
export const AUTO_MATCH_MIN = 3;
export const MATCH_RADIUS_KM = 3;
export const ARRIVE_RADIUS_M = 50;
export const NO_SHOW_BAN_THRESHOLD = 2;
export const NO_SHOW_BAN_DAYS = 7;
export const GROUP_DISTANCES = [3, 5, 7, 10] as const;

const RANGE_DIFF: Record<RankRange, number> = { same: 0, within1: 1, within2: 2, any: Infinity };

/** Hai người vào chung nhóm được khi hạng của mỗi người nằm trong phạm vi người kia chọn. */
export function rankCompatible(a: { rank: number; range: RankRange }, b: { rank: number; range: RankRange }): boolean {
  const diff = Math.abs(a.rank - b.rank);
  return diff <= RANGE_DIFF[a.range] && diff <= RANGE_DIFF[b.range];
}

export function validSlot(slot: string): slot is (typeof GROUP_TIME_SLOTS)[number] {
  return (GROUP_TIME_SLOTS as readonly string[]).includes(slot);
}

export function punctuality(joined: number, onTime: number): number {
  return joined === 0 ? 100 : Math.round((onTime / joined) * 100);
}

/** Thời gian chạy dự kiến để tự đóng nhóm (10 phút/km + 10 phút chờ). */
export const groupEndsAt = (startsAt: Date, distanceKm: number) =>
  new Date(startsAt.getTime() + (10 + distanceKm * 10) * MINUTE_MS);

/** Các mốc theo thứ tự. `at` tính bằng phút so với giờ xuất phát T. */
export const MILESTONES = [
  { key: 'T-2h', at: -120 },
  { key: 'T-1h', at: -60 },
  { key: 'T-30m', at: -30 },
  { key: 'T-10m', at: -10 },
  { key: 'T', at: 0 },
  { key: 'T+10m', at: 10 },
  { key: 'end', at: Infinity },
] as const;
export type MilestoneKey = (typeof MILESTONES)[number]['key'];

/**
 * Các mốc đã tới hạn nhưng chưa xử lý (theo thứ tự), dựa vào mốc đã xử lý gần nhất.
 * Mốc 'end' tới hạn ở groupEndsAt.
 */
export function dueMilestones(
  g: { startsAt: Date; distanceKm: number; milestone: string },
  now: Date,
): MilestoneKey[] {
  const doneIdx = MILESTONES.findIndex((m) => m.key === g.milestone);
  const out: MilestoneKey[] = [];
  for (let i = doneIdx + 1; i < MILESTONES.length; i++) {
    const m = MILESTONES[i]!;
    const at = m.key === 'end' ? groupEndsAt(g.startsAt, g.distanceKm).getTime() : g.startsAt.getTime() + m.at * MINUTE_MS;
    if (now.getTime() >= at) out.push(m.key);
    else break;
  }
  return out;
}

/** Từ T−30' tới khi kết thúc thì được chia sẻ vị trí. */
export function locationSharingOpen(startsAt: Date, distanceKm: number, now: Date): boolean {
  return now.getTime() >= startsAt.getTime() - 30 * MINUTE_MS && now.getTime() < groupEndsAt(startsAt, distanceKm).getTime();
}

/** Trong cửa sổ check-in (T−30' … T+10') và cách điểm hội tụ < 50 m. */
export function arrivedWithin50m(pos: LatLng, meeting: LatLng, startsAt: Date, now: Date): boolean {
  const t = now.getTime();
  const inWindow = t >= startsAt.getTime() - 30 * MINUTE_MS && t <= startsAt.getTime() + 10 * MINUTE_MS;
  return inWindow && haversineKm(pos, meeting) * 1000 < ARRIVE_RADIUS_M;
}

/** Phút cần để tới điểm hội tụ với tốc độ đi bộ nhanh/chạy nhẹ 8 km/h. */
export function etaMinutes(pos: LatLng, meeting: LatLng): number {
  return Math.ceil((haversineKm(pos, meeting) / 8) * 60);
}

export interface MatchCandidate extends LatLng {
  id: string;
  userId: string;
  rank: number;
  range: RankRange;
  slots: readonly string[];
  distanceKm: number;
  createdAt: Date;
}

/**
 * Ghép tự động cho `seed`: gom 3–6 người cùng khung giờ, cùng quãng đường,
 * trong ~3 km quanh `seed`, tương thích hạng từng đôi. Ưu tiên khung giờ của seed theo thứ tự,
 * người đăng ký sớm trước. Trả null nếu chưa đủ người.
 */
export function autoMatch(
  seed: MatchCandidate,
  pool: readonly MatchCandidate[],
): { slot: string; members: MatchCandidate[] } | null {
  for (const slot of seed.slots) {
    const picked: MatchCandidate[] = [seed];
    const candidates = pool
      .filter((c) => c.userId !== seed.userId && c.slots.includes(slot) && c.distanceKm === seed.distanceKm)
      .filter((c) => haversineKm(c, seed) <= MATCH_RADIUS_KM)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (const c of candidates) {
      if (picked.length >= GROUP_MAX) break;
      if (picked.some((p) => p.userId === c.userId)) continue;
      if (picked.every((p) => rankCompatible(p, c))) picked.push(c);
    }
    if (picked.length >= AUTO_MATCH_MIN) return { slot, members: picked };
  }
  return null;
}

/** Điểm hội tụ có sẵn gần tâm nhóm nhất. */
export function pickMeetingPoint<P extends LatLng & { name: string }>(members: readonly LatLng[], points: readonly P[]): P {
  const c = centroid(members);
  return [...points].sort((a, b) => haversineKm(a, c) - haversineKm(b, c))[0]!;
}

/** Điểm hội tụ cố định (công viên, sân vận động quanh HCMUT). Cửa hàng đối tác được thêm lúc chạy. */
export const PUBLIC_MEETING_POINTS = [
  { name: 'Công viên Lê Thị Riêng', latitude: 10.7865, longitude: 106.6648 },
  { name: 'Sân vận động Phú Thọ', latitude: 10.7673, longitude: 106.6543 },
  { name: 'Cổng ĐH Bách Khoa (Lý Thường Kiệt)', latitude: 10.7722, longitude: 106.6596 },
  { name: 'Công viên Văn Lang', latitude: 10.7569, longitude: 106.6673 },
] as const;
