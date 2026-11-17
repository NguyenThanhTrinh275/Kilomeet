// KILOMeet — "Arcade Light" game design tokens.
// Khớp bộ biến "KILO Game" trong Figma: https://www.figma.com/design/RGHjgkkUPxUKr7fHlcZ8jo
import type { TextStyle, ViewStyle } from 'react-native';
import type { Rank } from '../api/types';

export const C = {
  ink900: '#1B1A3A',
  ink700: '#3A3866',
  ink500: '#6E6C99',
  ink300: '#B4B2D1',

  bg: '#FFF5E1',
  surface: '#FFFFFF',
  sunken: '#F7E8CC',
  night: '#231C5C',
  night2: '#3A2E8C',

  green300: '#C9F7D9',
  green500: '#2BD46A',
  green700: '#12A150',
  orange300: '#FFE0C2',
  orange500: '#FF8A1F',
  orange700: '#D9600A',
  coin300: '#FFF1C2',
  coin500: '#FFC83D',
  coin700: '#D99400',
  sky300: '#CFEBFF',
  sky500: '#3DB2FF',
  sky700: '#1A7FD6',
  grape300: '#E6DBFF',
  grape500: '#9B6BFF',
  grape700: '#6E3FE0',
  red300: '#FFD6DE',
  red500: '#FF4D6D',
  red700: '#D62848',

  mapLand: '#E4F2D6',
  mapPark: '#B6E39A',
  mapWater: '#BFE4FF',
  mapBlock: '#F3EBDD',

  white: '#FFFFFF',
} as const;

/** Bảng màu theo "tông": 300 = nền nhạt, 500 = chính, 700 = chữ/đậm. */
export type Tone = 'green' | 'orange' | 'coin' | 'sky' | 'grape' | 'red';
export const TONE: Record<Tone, { 300: string; 500: string; 700: string }> = {
  green: { 300: C.green300, 500: C.green500, 700: C.green700 },
  orange: { 300: C.orange300, 500: C.orange500, 700: C.orange700 },
  coin: { 300: C.coin300, 500: C.coin500, 700: C.coin700 },
  sky: { 300: C.sky300, 500: C.sky500, 700: C.sky700 },
  grape: { 300: C.grape300, 500: C.grape500, 700: C.grape700 },
  red: { 300: C.red300, 500: C.red500, 700: C.red700 },
};

export const RANK_COLOR: Record<Rank, string> = {
  đồng: '#D9894A',
  bạc: '#A9B6C8',
  vàng: '#FFC83D',
  bạch_kim: '#3FD6D0',
  kim_cương: '#7C8CFF',
  cao_thủ: '#FF4D8D',
};

export const RANK_LABEL: Record<Rank, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'Bạch Kim',
  kim_cương: 'Kim Cương',
  cao_thủ: 'Cao Thủ',
};

export const RANK_SHORT: Record<Rank, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'B.Kim',
  kim_cương: 'K.Cương',
  cao_thủ: 'C.Thủ',
};

export const FONT = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyXBold: 'Nunito_800ExtraBold',
  bodyBlack: 'Nunito_900Black',
  num: 'LilitaOne_400Regular',
} as const;

export type TextVariant =
  | 'displayXL'
  | 'displayL'
  | 'titleL'
  | 'titleM'
  | 'titleS'
  | 'bodyL'
  | 'bodyM'
  | 'bodyMStrong'
  | 'bodyS'
  | 'caps'
  | 'button'
  | 'numXL'
  | 'numL'
  | 'numM'
  | 'numS';

export const TYPE: Record<TextVariant, TextStyle> = {
  displayXL: { fontFamily: FONT.display, fontSize: 40, lineHeight: 48, letterSpacing: -0.4 },
  displayL: { fontFamily: FONT.display, fontSize: 32, lineHeight: 40, letterSpacing: -0.2 },
  titleL: { fontFamily: FONT.display, fontSize: 24, lineHeight: 31 },
  titleM: { fontFamily: FONT.displayBold, fontSize: 20, lineHeight: 27 },
  titleS: { fontFamily: FONT.displayBold, fontSize: 16, lineHeight: 22 },
  bodyL: { fontFamily: FONT.bodyBold, fontSize: 16, lineHeight: 22 },
  bodyM: { fontFamily: FONT.body, fontSize: 14, lineHeight: 20 },
  bodyMStrong: { fontFamily: FONT.bodyXBold, fontSize: 14, lineHeight: 20 },
  bodyS: { fontFamily: FONT.body, fontSize: 12, lineHeight: 16 },
  caps: { fontFamily: FONT.bodyBlack, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  button: { fontFamily: FONT.display, fontSize: 18, lineHeight: 24, letterSpacing: 0.3 },
  numXL: { fontFamily: FONT.num, fontSize: 56, lineHeight: 60 },
  numL: { fontFamily: FONT.num, fontSize: 32, lineHeight: 36 },
  numM: { fontFamily: FONT.num, fontSize: 20, lineHeight: 24 },
  numS: { fontFamily: FONT.num, fontSize: 14, lineHeight: 18 },
};

/** Bóng đổ cứng kiểu game (không blur). Dùng boxShadow của kiến trúc mới. */
export const DEPTH = {
  chunky: { boxShadow: `0px 4px 0px ${C.ink900}` } as ViewStyle,
  small: { boxShadow: `0px 2px 0px ${C.ink900}` } as ViewStyle,
  button: {
    boxShadow: `0px 4px 0px ${C.ink900}, inset 0px -4px 0px rgba(0,0,0,0.16), inset 0px 3px 0px rgba(255,255,255,0.5)`,
  } as ViewStyle,
  pressed: {
    boxShadow: `0px 0px 0px ${C.ink900}, inset 0px -2px 0px rgba(0,0,0,0.16)`,
    transform: [{ translateY: 4 }],
  } as ViewStyle,
  glowCoin: { boxShadow: `0px 0px 24px 2px rgba(255,200,61,0.7)` } as ViewStyle,
  glowGreen: { boxShadow: `0px 0px 28px 4px rgba(43,212,106,0.6)` } as ViewStyle,
  float: { boxShadow: `0px 14px 28px -4px rgba(27,26,58,0.22)` } as ViewStyle,
  none: {} as ViewStyle,
};

export const STROKE = 2.5;
export const RADIUS = { s: 10, m: 16, l: 22, pill: 999 } as const;

/** Nền gradient đêm tím dùng cho màn chiến thắng / đang chạy / tổng kết mùa. */
export const NIGHT_GRADIENT = [C.night2, C.night] as const;
export const NIGHT_DEEP_GRADIENT = [C.night2, C.ink900] as const;

/** Kiểu bản đồ Google pastel khớp minh hoạ game (Android / provider Google). */
export const GAME_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: C.mapLand }] },
  { elementType: 'labels.text.fill', stylers: [{ color: C.ink700 }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: C.mapPark }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: C.mapBlock }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: C.ink300 }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: C.coin300 }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: C.mapWater }] },
];
