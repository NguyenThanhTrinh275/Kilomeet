import { z } from 'zod';

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

export const ScanBody = z.object({ qrCode: z.string({ error: 'QR không hợp lệ' }).trim().min(1, 'QR không hợp lệ') });
