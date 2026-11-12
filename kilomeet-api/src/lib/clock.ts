import { prisma } from './prisma.js';

/**
 * Nguồn giờ duy nhất của BE. Không gọi `new Date()` / `Date.now()` ở chỗ khác.
 * Demo/test tua giờ bằng offset (POST /admin/clock), lưu vào app_settings để sống qua restart.
 */
const KEY = 'clock_offset_ms';
let offsetMs = 0;

export const clock = {
  now(): Date {
    return new Date(Date.now() + offsetMs);
  },
  offsetMs(): number {
    return offsetMs;
  },
  async load(): Promise<void> {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    offsetMs = row ? Number(row.value) || 0 : 0;
  },
  /** Đặt offset sao cho `now()` = `target`, hoặc đặt offset trực tiếp. */
  async set(opts: { offsetMs?: number; now?: Date }): Promise<void> {
    offsetMs = opts.now ? opts.now.getTime() - Date.now() : (opts.offsetMs ?? 0);
    await prisma.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: String(offsetMs) },
      update: { value: String(offsetMs) },
    });
  },
};
