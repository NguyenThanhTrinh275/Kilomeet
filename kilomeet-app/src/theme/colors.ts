// KILOMeet Design System — Colors
export const colors = {
  // Primary
  primary: '#16A34A',       // Green — running/nature (đậm hơn để đọc rõ trên nền sáng)
  primaryDark: '#15803D',
  primaryLight: '#22C55E',

  // Accent
  accent: '#EA580C',        // Orange — achievement/fire
  accentDark: '#C2410C',
  accentLight: '#F97316',

  // Background
  bgPrimary: '#F4F6F9',     // Nền trang — xám rất nhạt
  bgSecondary: '#FFFFFF',   // Thẻ, ô nhập, thanh tab
  bgTertiary: '#EEF2F6',    // Bề mặt phụ

  // Surface
  surface: '#EEF2F6',
  surfaceLight: '#E2E8F0',
  surfaceBorder: '#E2E8F0',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',   // chữ/icon trên nền màu (nút xanh, cam)

  // Semantic
  success: '#16A34A',
  warning: '#CA8A04',
  error: '#DC2626',
  info: '#2563EB',

  // Rank colors
  rank: {
    đồng: '#9A6B4B',
    bạc: '#64748B',
    vàng: '#CA8A04',
    bạch_kim: '#0891B2',
    kim_cương: '#6366F1',
    cao_thủ: '#E11D48',
  },

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(15,23,42,0.45)',
} as const;

export type RankColor = keyof typeof colors.rank;
