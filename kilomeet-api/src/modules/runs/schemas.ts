import { z } from 'zod';

export const GpsPointIn = z.object({
  latitude: z.number({ error: 'Toạ độ GPS không hợp lệ' }).min(-90).max(90),
  longitude: z.number({ error: 'Toạ độ GPS không hợp lệ' }).min(-180).max(180),
  timestamp: z.string().optional(),
});

export const EndRunBody = z.object({
  runId: z.string({ error: 'Thiếu runId' }).min(1, 'Thiếu runId'),
  durationMinutes: z.number().min(0).optional(),
  route: z.array(GpsPointIn).max(50_000, 'Đường chạy quá dài').default([]),
  // distanceKm và passedStoreIds FE gửi lên bị BỎ QUA — BE tự tính.
});

export const RunIdQuery = z.object({ runId: z.string({ error: 'Thiếu runId' }).min(1, 'Thiếu runId') });

export const ClaimStoreBody = z.object({
  runId: z.string({ error: 'Thiếu runId' }).min(1, 'Thiếu runId'),
  storeId: z.string({ error: 'Thiếu storeId' }).min(1, 'Thiếu storeId'),
});
