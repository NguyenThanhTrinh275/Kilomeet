// Định dạng số kiểu Việt Nam cho giao diện game.

/** 1000 → "1.000" */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

/** 32.4 → "32,4" (mặc định 1 chữ số thập phân) */
export function fmtKm(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',');
}

/** 185000 → "185.000đ" */
export function fmtVnd(n: number): string {
  return `${fmtInt(n)}đ`;
}

/** 185000 → "185K", 1560000 → "1,56tr" */
export function fmtVndShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** Phút (số thực) → "mm:ss" */
export function fmtMinutes(minutes: number): string {
  // Làm tròn TỔNG số giây trước, để 5,999 phút ra "06:00" chứ không phải "05:60".
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Tốc độ phút/km → 5'46" */
export function fmtPace(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm)) return `--'--"`;
  const total = Math.round(minPerKm * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** ISO → "dd/mm" */
export function fmtDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** ISO → "dd/mm/yyyy" */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${fmtDayMonth(iso)}/${d.getFullYear()}`;
}

/** ISO → "HH:mm" */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
/** ISO → "Thứ 3, 17/11" */
export function fmtWeekday(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${fmtDayMonth(iso)}`;
}

/** Lấy chữ cái đầu của 2 từ cuối: "Minh Trần" → "MT" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[parts.length - 2]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Màu avatar ổn định theo tên. */
const AVATAR_TONES = ['#C9F7D9', '#FFF1C2', '#CFEBFF', '#FFE0C2', '#E6DBFF', '#FFD6DE'];
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length]!;
}

/** % giảm của voucher → nhãn: 20 → "-20%", 100 → "FREE" */
export function discountLabel(p: number): string {
  return p >= 100 ? 'FREE' : `-${p}%`;
}
