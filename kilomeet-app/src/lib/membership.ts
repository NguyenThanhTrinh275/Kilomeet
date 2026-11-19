// Đăng ký gói Hội viên (thanh toán giả lập) — dùng chung cho tab Nhóm và Hồ sơ.
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { Runner } from '../api/types';

export async function subscribeMember(): Promise<void> {
  await api.post('/auth/subscribe');
  // Lấy lại user từ BE (role đã đổi sang member); mock thì cập nhật tại chỗ.
  try {
    await useAuthStore.getState().refreshMe();
  } catch {
    const user = useAuthStore.getState().user as Runner | null;
    if (user) useAuthStore.setState({ user: { ...user, isMember: true, role: 'member' } });
  }
}

export const MEMBERSHIP_PRICE = '39.000đ';
export const MEMBER_BENEFITS = [
  'Ghép nhóm tự động trong bán kính 3 km',
  'Xem vị trí đồng đội trực tiếp trên bản đồ',
  'Huy hiệu "Chạy chung" sau mỗi buổi',
  'Huy hiệu VIP trên hồ sơ',
];
