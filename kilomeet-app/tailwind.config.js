/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        km: {
          primary: '#22C55E',
          'primary-dark': '#16A34A',
          'primary-light': '#4ADE80',
          accent: '#F97316',
          'accent-dark': '#EA580C',
          'accent-light': '#FB923C',
          bg: '#0F172A',
          'bg-secondary': '#1E293B',
          surface: '#334155',
          'surface-light': '#475569',
        },
        rank: {
          dong: '#A0785A',
          bac: '#94A3B8',
          vang: '#EAB308',
          'bach-kim': '#67E8F9',
          'kim-cuong': '#818CF8',
          'cao-thu': '#F43F5E',
        },
      },
    },
  },
  plugins: [],
};
