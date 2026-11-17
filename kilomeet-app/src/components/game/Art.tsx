// Minh hoạ: ghim bản đồ, bản đồ thành phố, ảnh bìa quán, logo, nền sao, tia sáng, confetti.
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { Coffee, Dumbbell, Flag, Footprints, Navigation, Star, Store, type LucideIcon } from 'lucide-react-native';
import { C, DEPTH, STROKE } from '../../theme/game';
import { GText } from './primitives';

// ─── Map pin ────────────────────────────────────────────────────

export type PinKind = 'store' | 'meet' | 'me' | 'quest';
const PIN: Record<PinKind, { color: string; icon: LucideIcon }> = {
  store: { color: C.orange500, icon: Store },
  meet: { color: C.green500, icon: Flag },
  me: { color: C.sky500, icon: Navigation },
  quest: { color: C.grape500, icon: Star },
};

export function MapPin({ kind = 'store', size = 44, icon }: { kind?: PinKind; size?: number; icon?: LucideIcon }) {
  const { color, icon: DefIcon } = PIN[kind];
  const Icon = icon ?? DefIcon;
  const h = size * (54 / 44);
  return (
    <View style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 44 54">
        <Path d="M22 53 C 22 53 3 35 3 23 A19 19 0 1 1 41 23 C 41 35 22 53 22 53 Z" fill={C.ink900} fillOpacity={0.25} />
        <Path d="M22 51 C 22 51 3 33 3 21 A19 19 0 1 1 41 21 C 41 33 22 51 22 51 Z" fill={color} stroke={C.ink900} strokeWidth={2.5} strokeLinejoin="round" />
        <Circle cx={22} cy={21} r={12} fill="#FFFFFF" stroke={C.ink900} strokeWidth={2} />
      </Svg>
      <View style={{ position: 'absolute', top: size * (13 / 44), left: 0, right: 0, alignItems: 'center' }}>
        <Icon size={size * 0.36} color={C.ink900} strokeWidth={2.5} />
      </View>
    </View>
  );
}

// ─── City map illustration ──────────────────────────────────────

export function CityMap({ width = 390, height = 560 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 390 560" preserveAspectRatio="xMidYMid slice">
      <Rect width={390} height={560} fill={C.mapLand} />
      <Path d="M-20 410 C 70 370 150 450 240 415 S 360 350 420 380 L 420 470 C 330 450 260 505 175 492 S 40 462 -20 492 Z" fill={C.mapWater} stroke={C.ink900} strokeWidth={2.5} />
      <Path d="M30 70 C 70 30 150 40 170 80 C 190 120 150 160 100 165 C 50 170 0 120 30 70 Z" fill={C.mapPark} stroke={C.ink900} strokeWidth={2.5} />
      <Path d="M250 190 C 290 170 360 180 370 225 C 380 270 330 300 290 290 C 245 280 215 215 250 190 Z" fill={C.mapPark} stroke={C.ink900} strokeWidth={2.5} />
      {[
        [200, 30, 70, 56],
        [300, 40, 70, 44],
        [30, 215, 80, 58],
        [175, 205, 52, 66],
        [40, 330, 62, 40],
        [300, 315, 70, 30],
      ].map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} rx={10} fill={C.mapBlock} stroke={C.ink900} strokeWidth={2} />
      ))}
      {[
        ['M-10 190 L 400 165', 20, 14],
        ['M140 -10 C 150 150 130 300 160 570', 20, 14],
        ['M-10 305 C 110 285 250 320 400 280', 20, 14],
        ['M290 -10 C 280 100 300 300 265 570', 16, 10],
      ].map(([d, a, b], i) => (
        <G key={i}>
          <Path d={d as string} fill="none" stroke={C.ink900} strokeWidth={a as number} strokeLinecap="round" />
          <Path d={d as string} fill="none" stroke="#FFFFFF" strokeWidth={b as number} strokeLinecap="round" />
        </G>
      ))}
      {[
        [70, 95, 9],
        [95, 80, 11],
        [120, 110, 8],
        [300, 225, 10],
        [330, 245, 8],
        [210, 140, 7],
      ].map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} fill={C.green500} stroke={C.ink900} strokeWidth={2} />
      ))}
    </Svg>
  );
}

// ─── Store cover ────────────────────────────────────────────────

export type CoverTheme = 'coffee' | 'tea' | 'gym';
const COVER: Record<CoverTheme, { g1: string; g2: string; awning: string; door: string; icon: LucideIcon }> = {
  coffee: { g1: '#FF8A1F', g2: '#FFC83D', awning: '#FF4D6D', door: '#D9600A', icon: Coffee },
  tea: { g1: '#2BD46A', g2: '#C9F7D9', awning: '#12A150', door: '#9B6BFF', icon: Store },
  gym: { g1: '#3DB2FF', g2: '#CFEBFF', awning: '#1A7FD6', door: '#FF8A1F', icon: Dumbbell },
};

export function StoreCover({ theme = 'coffee', height = 220, style }: { theme?: CoverTheme; height?: number; style?: StyleProp<ViewStyle> }) {
  const t = COVER[theme];
  const Icon = t.icon;
  return (
    <View style={[{ height, overflow: 'hidden', backgroundColor: t.g1 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`cv-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.g1} />
            <Stop offset="1" stopColor={t.g2} />
          </LinearGradient>
        </Defs>
        <Rect width={390} height={220} fill={`url(#cv-${theme})`} />
        <Circle cx={330} cy={40} r={26} fill="#FFF5E1" stroke={C.ink900} strokeWidth={3} />
        <Path d="M20 60 q15 -18 30 0 q15 -18 30 0 z" fill="#FFFFFF" stroke={C.ink900} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M250 90 q12 -14 24 0 q12 -14 24 0 z" fill="#FFFFFF" stroke={C.ink900} strokeWidth={2.5} strokeLinejoin="round" />
        <Rect x={-10} y={196} width={410} height={40} fill={C.sunken} stroke={C.ink900} strokeWidth={3} />
        <Path d="M0 206 H390" stroke={C.ink900} strokeWidth={2} strokeDasharray="14 12" />
        <G transform="translate(95 46)">
          <Rect x={20} y={44} width={160} height={112} rx={8} fill="#FFF5E1" stroke={C.ink900} strokeWidth={3} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Circle key={i} cx={23 + 22 * i} cy={44} r={11} fill="#FFFFFF" stroke={C.ink900} strokeWidth={3} />
          ))}
          <Path d="M12 44 L188 44 L180 22 L20 22 Z" fill={t.awning} stroke={C.ink900} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={34} y={74} width={62} height={46} rx={6} fill={C.mapWater} stroke={C.ink900} strokeWidth={3} />
          <Rect x={112} y={70} width={50} height={86} rx={6} fill={t.door} stroke={C.ink900} strokeWidth={3} />
          <Circle cx={152} cy={114} r={3.5} fill={C.ink900} />
          <Rect x={66} y={2} width={68} height={22} rx={7} fill={C.coin500} stroke={C.ink900} strokeWidth={3} />
          <Circle cx={28} cy={140} r={12} fill={C.green500} stroke={C.ink900} strokeWidth={2.5} />
          <Circle cx={176} cy={142} r={10} fill={C.green500} stroke={C.ink900} strokeWidth={2.5} />
        </G>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ marginTop: (42 / 220) * height, width: 28 * (height / 220), height: 28 * (height / 220), borderRadius: 8, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16 * (height / 220)} color={C.ink900} strokeWidth={2.5} />
        </View>
      </View>
    </View>
  );
}

// ─── Logo ───────────────────────────────────────────────────────

export function Logo({ size = 56, light }: { size?: number; light?: boolean }) {
  const font = size >= 80 ? 64 : 40;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.18 }}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size * 0.32,
            backgroundColor: C.green500,
            borderWidth: 3,
            borderColor: C.ink900,
            alignItems: 'center',
            justifyContent: 'center',
          },
          DEPTH.chunky,
        ]}>
        <Footprints size={size * 0.58} color={C.ink900} strokeWidth={2.5} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <GText v="displayXL" color={light ? C.white : C.ink900} style={{ fontSize: font, lineHeight: font * 1.2 }}>
          KILO
        </GText>
        <GText v="displayXL" color={C.orange500} style={{ fontSize: font, lineHeight: font * 1.2 }}>
          Meet
        </GText>
      </View>
    </View>
  );
}

// ─── Decorations ────────────────────────────────────────────────

function rng(seed: number) {
  let r = seed;
  return () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };
}

/** Nền sao lấp lánh cho màn tối. */
export function StarField({ count = 20, seed = 7, height = 420, width = 400 }: { count?: number; seed?: number; height?: number; width?: number }) {
  const stars = React.useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: count }).map(() => ({ x: rnd() * width, y: 40 + rnd() * height, d: 2 + rnd() * 4, o: 0.3 + rnd() * 0.6 }));
  }, [count, seed, height, width]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {stars.map((s, i) => (
        <View key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.d, height: s.d, borderRadius: s.d, backgroundColor: '#FFFFFF', opacity: s.o }} />
      ))}
    </View>
  );
}

/** Tia sáng vàng phía sau cúp/huy hiệu. */
export function Rays({ size = 390, color = C.coin500, opacity = 0.18 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 390 390" pointerEvents="none">
      <G fill={color} opacity={opacity}>
        <Polygon points="195,195 160,0 230,0" />
        <Polygon points="195,195 390,120 390,200" />
        <Polygon points="195,195 320,390 250,390" />
        <Polygon points="195,195 60,390 0,330" />
        <Polygon points="195,195 0,140 0,70" />
        <Polygon points="195,195 330,0 390,40" />
        <Polygon points="195,195 40,0 100,0" />
      </G>
    </Svg>
  );
}

const CONFETTI_COLORS = [C.green500, C.orange500, C.coin500, C.sky500, C.grape500, C.red500];
/** Confetti hai bên mép màn (không đè chữ ở giữa). */
export function Confetti({ count = 18, seed = 9, height = 320, width = 390 }: { count?: number; seed?: number; height?: number; width?: number }) {
  const bits = React.useMemo(() => {
    const rnd = rng(seed);
    return Array.from({ length: count }).map((_, i) => {
      const left = i % 2 === 0;
      return {
        x: left ? 4 + rnd() * 36 : width - 40 + rnd() * 30,
        y: 50 + rnd() * height,
        w: 6 + rnd() * 6,
        h: 10 + rnd() * 8,
        r: rnd() * 90 - 45,
        c: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      };
    });
  }, [count, seed, height, width]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {bits.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 3, backgroundColor: b.c, borderWidth: 1.5, borderColor: C.ink900, transform: [{ rotate: `${b.r}deg` }] }} />
      ))}
    </View>
  );
}

/** Vòng sáng tròn mờ phía sau minh hoạ. */
export function Glow({ size, color, opacity = 0.22, style }: { size: number; color: string; opacity?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={color} fillOpacity={opacity} />
      </Svg>
    </View>
  );
}

/** Đường chạy minh hoạ (thumbnail lịch sử). */
export function RouteThumb({ size = 64, seed = 1 }: { size?: number; seed?: number }) {
  const paths = [
    'M10 50 C 18 30 30 44 34 28 S 50 14 54 20',
    'M8 20 C 20 40 30 18 40 34 S 52 52 56 44',
    'M12 54 C 14 30 34 40 30 22 S 46 8 56 14',
    'M6 36 C 20 20 28 50 42 30 S 54 18 58 26',
  ];
  const d = paths[seed % paths.length]!;
  return (
    <View style={{ width: size, height: size, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden', backgroundColor: C.mapLand }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path d="M-4 22 L 70 16" stroke="#FFFFFF" strokeWidth={6} />
        <Path d="M30 -4 C 32 20 28 40 34 70" stroke="#FFFFFF" strokeWidth={6} />
        <Circle cx={50} cy={48} r={8} fill={C.mapPark} stroke={C.ink900} strokeWidth={1.5} />
        <Path d={d} fill="none" stroke={C.ink900} strokeWidth={7} strokeLinecap="round" />
        <Path d={d} fill="none" stroke={C.orange500} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Hai vạch mép ngắn: dùng để vẽ khung quét QR. */
export function ScanFrame({ size = 270 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 270 270" pointerEvents="none">
      <G fill="none" stroke={C.ink900} strokeWidth={14} strokeLinecap="round">
        <Path d="M10 60 V20 Q10 10 20 10 H60" />
        <Path d="M210 10 H250 Q260 10 260 20 V60" />
        <Path d="M260 210 V250 Q260 260 250 260 H210" />
        <Path d="M60 260 H20 Q10 260 10 250 V210" />
      </G>
      <G fill="none" stroke={C.coin500} strokeWidth={8} strokeLinecap="round">
        <Path d="M10 60 V20 Q10 10 20 10 H60" />
        <Path d="M210 10 H250 Q260 10 260 20 V60" />
        <Path d="M260 210 V250 Q260 260 250 260 H210" />
        <Path d="M60 260 H20 Q10 260 10 250 V210" />
      </G>
      <Rect x={30} y={130} width={210} height={6} rx={3} fill={C.green500} />
    </Svg>
  );
}

export const STROKE_W = STROKE;
