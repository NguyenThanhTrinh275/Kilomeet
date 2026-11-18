import { z } from 'zod';
import { COVER_THEMES, HHMM, PROFILE_LIMITS as L } from '../../domain/store-profile.js';

const pct = (msg: string) => z.coerce.number({ error: msg }).min(0, msg).max(100, msg);

export const CreateVoucherBody = z.object({
  title: z.string({ error: 'Vui lòng nhập tên voucher' }).trim().min(1, 'Vui lòng nhập tên voucher'),
  description: z.string().optional(),
  priceTokens: z.coerce.number({ error: 'Giá token phải là số nguyên dương' })
    .int('Giá token phải là số nguyên dương').positive('Giá token phải là số nguyên dương'),
  discountPercent: pct('Mức giảm phải từ 0 đến 100%'),
  // Tên mới (FE commit 8c40a76) và tên cũ đều nhận.
  questType: z.string().nullish().transform((v) => v ?? undefined),
  questDescription: z.string().nullish().transform((v) => v ?? undefined),
  questDiscountPercent: pct('Mức giảm khi làm nhiệm vụ phải từ 0 đến 100%').optional(),
  quantity: z.coerce.number().optional(),
  totalSupply: z.coerce.number().optional(),
  minRank: z.string().optional(),
  expiryDate: z.string().nullish(),
  expiresAt: z.string().nullish(),
  area: z.string().nullish(),
});

export const TopupBody = z.object({
  amountVnd: z.coerce.number({ error: 'Số tiền nạp không hợp lệ' }),
  /** Mã do app sinh cho mỗi lần bấm "Nạp": gọi lặp cùng mã chỉ nạp 1 lần. */
  requestId: z.string().max(64).optional(),
});

export const ScanBody = z.object({ qrCode: z.string({ error: 'QR không hợp lệ' }).trim().min(1, 'QR không hợp lệ') });

// ─── Hồ sơ quán (Mục 8.2) ───────────────────────────────────────

const HHMM_MSG = 'Giờ mở cửa phải theo dạng HH:mm';
const hhmm = z.string({ error: HHMM_MSG }).trim().regex(HHMM, HHMM_MSG);

/** Mọi field đều tuỳ chọn: chỉ cập nhật field được gửi. Field lạ (address, latitude, …) bị bỏ qua. */
export const StoreProfileBody = z.object({
  storeName: z.string().trim().min(1, 'Vui lòng nhập tên quán').max(L.storeName, `Tên quán tối đa ${L.storeName} ký tự`).optional(),
  tagline: z.string().trim().max(L.tagline, `Câu giới thiệu ngắn tối đa ${L.tagline} ký tự`).optional(),
  description: z.string().trim().max(L.description, `Giới thiệu chi tiết tối đa ${L.description} ký tự`).optional(),
  coverTheme: z.enum(COVER_THEMES, { error: 'Ảnh bìa không hợp lệ' }).optional(),
  tags: z
    .array(z.string().trim().min(1, 'Thẻ tiện ích không được để trống').max(30, 'Thẻ tiện ích tối đa 30 ký tự'))
    .max(L.tags, `Chọn tối đa ${L.tags} thẻ tiện ích`)
    .transform((t) => [...new Set(t)])
    .optional(),
  openingHours: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Vui lòng nhập nhãn ngày mở cửa').max(30, 'Nhãn ngày mở cửa tối đa 30 ký tự'),
        open: hhmm,
        close: hhmm,
        enabled: z.boolean().default(true),
      }),
    )
    .max(L.openingHours, `Tối đa ${L.openingHours} dòng giờ mở cửa`)
    .optional(),
  highlights: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Vui lòng nhập tên món').max(40, 'Tên món tối đa 40 ký tự'),
        priceVnd: z.coerce.number({ error: 'Giá món phải là số nguyên không âm' }).int('Giá món phải là số nguyên không âm').min(0, 'Giá món phải là số nguyên không âm'),
      }),
    )
    .max(L.highlights, `Tối đa ${L.highlights} món nổi bật`)
    .optional(),
  phone: z.string().trim().max(L.phone, 'Số điện thoại không hợp lệ').regex(/^[\d\s+().-]*$/, 'Số điện thoại không hợp lệ').optional(),
});

export const StoreProfileQuery = z.object({
  storeId: z.string({ error: 'Thiếu storeId' }).trim().min(1, 'Thiếu storeId'),
});
