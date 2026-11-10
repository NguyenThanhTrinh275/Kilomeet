// KILOMeet Design System — Colors
export const colors = {
  // Primary
  primary: '#22C55E',       // Green — running/nature
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',

  // Accent
  accent: '#F97316',        // Orange — achievement/fire
  accentDark: '#EA580C',
  accentLight: '#FB923C',

  // Background
  bgPrimary: '#0F172A',     // Deep navy
  bgSecondary: '#1E293B',   // Lighter navy
  bgTertiary: '#334155',    // Card/surface

  // Surface
  surface: '#334155',
  surfaceLight: '#475569',
  surfaceBorder: '#475569',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Semantic
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#3B82F6',

  // Rank colors
  rank: {
    đồng: '#A0785A',
    bạc: '#94A3B8',
    vàng: '#EAB308',
    bạch_kim: '#67E8F9',
    kim_cương: '#818CF8',
    cao_thủ: '#F43F5E',
  },

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export type RankColor = keyof typeof colors.rank;
