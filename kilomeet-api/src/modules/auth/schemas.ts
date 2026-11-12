import { z } from 'zod';

const email = z
  .string({ error: 'Vui lòng nhập email' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email không hợp lệ' }));

export const LoginBody = z.object({
  email: z.string({ error: 'Vui lòng nhập email và mật khẩu' }).trim().toLowerCase(),
  password: z.string({ error: 'Vui lòng nhập email và mật khẩu' }),
});

export const RegisterBody = z
  .object({
    email,
    name: z.string({ error: 'Vui lòng nhập tên' }).trim().min(2, 'Tên tối thiểu 2 ký tự'),
    password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    role: z.enum(['runner', 'store'], { error: 'Vai trò không hợp lệ' }).default('runner'),
    storeName: z.string().trim().optional(),
    storeAddress: z.string().trim().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (b) =>
      b.role !== 'store' ||
      (!!b.storeName && !!b.storeAddress && b.latitude !== undefined && b.longitude !== undefined),
    { error: 'Vui lòng nhập đủ thông tin cửa hàng (tên, địa chỉ, vị trí)' },
  );
