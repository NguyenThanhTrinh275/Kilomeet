// Đồng xu token, chip ví, huy hiệu hạng lục giác, chip hạng, bậc thang hạng, avatar, thanh XP.
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Polygon, Text as SvgText } from 'react-native-svg';
import { Crown, Gem, Shield, Sparkles, Star } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { RANKS, type Rank } from '../../api/types';
import { C, DEPTH, FONT, RANK_COLOR, RANK_LABEL, RANK_SHORT, STROKE, TONE, type Tone } from '../../theme/game';
import { GText } from './primitives';

// ─── Coin ───────────────────────────────────────────────────────

export function Coin({ size = 24, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={11} fill={C.coin500} stroke={C.ink900} strokeWidth={2} />
        <Circle cx={12} cy={12} r={7} fill="none" stroke={C.coin700} strokeWidth={1.5} />
        <Ellipse cx={8.5} cy={6} rx={2.5} ry={1.5} fill="#FFFFFF" fillOpacity={0.8} />
        <SvgText x={12} y={15.6} fontSize={10} fontFamily={FONT.num} fill={C.coin700} textAnchor="middle">
          K
        </SvgText>
      </Svg>
    </View>
  );
}

export function CoinChip({ amount, style, size = 'm' }: { amount: string; style?: StyleProp<ViewStyle>; size?: 's' | 'm' }) {
  const coin = size === 's' ? 20 : 26;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 4,
          paddingLeft: 4,
          paddingRight: 12,
          borderRadius: 999,
          backgroundColor: C.surface,
          borderWidth: STROKE,
          borderColor: C.ink900,
          alignSelf: 'flex-start',
        },
        DEPTH.small,
        style,
      ]}>
      <Coin size={coin} />
      <GText v={size === 's' ? 'numS' : 'numM'}>{amount}</GText>
    </View>
  );
}

/** Đồng xu + số, không khung. */
export function CoinAmount({ amount, size = 18, v = 'numM', color = C.ink900, strike }: { amount: string; size?: number; v?: 'numS' | 'numM' | 'numL'; color?: string; strike?: boolean }) {
  return (
    // Không dùng `gap`: Android đo khung co-theo-nội-dung thiếu phần gap → cắt chữ số cuối ("1.06" thay vì "1.068").
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Coin size={size} />
      <GText v={v} color={color} strike={strike} style={{ marginLeft: 4 }}>
        {amount}
      </GText>
    </View>
  );
}

// ─── Rank emblem ────────────────────────────────────────────────

export const RANK_GLYPH: Record<Rank, LucideIcon> = {
  đồng: Shield,
  bạc: Shield,
  vàng: Star,
  bạch_kim: Star,
  kim_cương: Gem,
  cao_thủ: Crown,
};

const HEX = '28,2 53,15.5 53,42.5 28,56 3,42.5 3,15.5';
const HEX_SHADOW = '28,4 53,17.5 53,44.5 28,58 3,44.5 3,17.5';
const HEX_INNER = '28,9.5 46.5,19.5 46.5,38.5 28,48.5 9.5,38.5 9.5,19.5';

export function RankEmblem({ rank, size = 56, style }: { rank: Rank; size?: number; style?: StyleProp<ViewStyle> }) {
  const Glyph = RANK_GLYPH[rank];
  const top = RANKS.indexOf(rank) >= 4;
  const h = size * (60 / 56);
  return (
    <View style={[{ width: size, height: h }, style]}>
      <Svg width={size} height={h} viewBox="0 0 56 60">
        <Polygon points={HEX_SHADOW} fill={C.ink900} strokeLinejoin="round" stroke={C.ink900} strokeWidth={2.5} />
        <Polygon points={HEX} fill={RANK_COLOR[rank]} stroke={C.ink900} strokeWidth={2.5} strokeLinejoin="round" />
        <Polygon points={HEX_INNER} fill="#FFFFFF" fillOpacity={0.4} strokeLinejoin="round" />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size * (58 / 56), alignItems: 'center', justifyContent: 'center' }}>
        <Glyph size={size * 0.43} color={C.ink900} strokeWidth={2.5} />
      </View>
      {top ? (
        <View style={{ position: 'absolute', right: -size * 0.06, top: -size * 0.06 }}>
          <Sparkles size={size * 0.26} color={C.ink900} strokeWidth={2.5} fill={C.white} />
        </View>
      ) : null}
    </View>
  );
}

export function RankChip({ rank, style, small }: { rank: Rank; style?: StyleProp<ViewStyle>; small?: boolean }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: small ? 2 : 3,
          paddingLeft: small ? 2 : 3,
          paddingRight: small ? 8 : 12,
          borderRadius: 999,
          backgroundColor: RANK_COLOR[rank],
          borderWidth: 2,
          borderColor: C.ink900,
          alignSelf: 'flex-start',
        },
        DEPTH.small,
        style,
      ]}>
      <RankEmblem rank={rank} size={small ? 18 : 22} />
      <GText v="caps" style={[{ marginLeft: small ? 4 : 6 }, small ? { fontSize: 10 } : null]}>
        {RANK_LABEL[rank]}
      </GText>
    </View>
  );
}

/** Bậc thang 6 hạng, hạng hiện tại phóng to. */
export function RankLadder({ rank }: { rank: Rank }) {
  const idx = RANKS.indexOf(rank);
  return (
    <View style={{ height: 70 }}>
      <View style={{ position: 'absolute', left: 18, right: 18, top: 18, height: 6, borderRadius: 3, backgroundColor: C.sunken, borderWidth: 2, borderColor: C.ink900 }} />
      <View
        style={{
          position: 'absolute',
          left: 18,
          width: `${(idx / 5) * 100 * 0.88}%`,
          top: 18,
          height: 6,
          borderRadius: 3,
          backgroundColor: C.green500,
          borderWidth: 2,
          borderColor: C.ink900,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {RANKS.map((r, i) => {
          const cur = i === idx;
          const reached = i <= idx;
          return (
            <View key={r} style={{ alignItems: 'center', width: 48, gap: 2, opacity: reached ? 1 : 0.45 }}>
              <View style={{ height: 44, justifyContent: 'center' }}>
                <RankEmblem rank={r} size={cur ? 40 : 30} />
              </View>
              <GText v="caps" color={cur ? C.ink900 : C.ink500} style={{ fontSize: 9, letterSpacing: 0.4 }}>
                {RANK_SHORT[r]}
              </GText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────

export function Avatar({ initials, fill = C.grape300, size = 44, style, dim }: { initials: string; fill?: string; size?: number; style?: StyleProp<ViewStyle>; dim?: boolean }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: fill,
          borderWidth: size > 60 ? 3.5 : STROKE,
          borderColor: C.ink900,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dim ? 0.45 : 1,
        },
        style,
      ]}>
      <GText v={size > 60 ? 'displayL' : 'titleS'} style={size < 34 ? { fontSize: 11, lineHeight: 14 } : null}>
        {initials}
      </GText>
    </View>
  );
}

// ─── XP bar ─────────────────────────────────────────────────────

export function XPBar({ pct, tone = 'green', height = 22, style }: { pct: number; tone?: Tone; height?: number; style?: StyleProp<ViewStyle> }) {
  const p = Math.max(0, Math.min(1, pct));
  const pad = height <= 16 ? 2 : 3;
  const inner = Math.max(4, height - pad * 2 - STROKE * 2);
  return (
    <View
      style={[
        {
          height,
          borderRadius: 999,
          backgroundColor: C.sunken,
          borderWidth: STROKE,
          borderColor: C.ink900,
          padding: pad,
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}>
      {p > 0 ? (
        <View
          style={{
            width: `${Math.max(p * 100, 6)}%`,
            height: inner,
            borderRadius: 999,
            backgroundColor: TONE[tone][500],
            overflow: 'hidden',
          }}>
          <View style={{ position: 'absolute', top: 2, left: 6, right: 6, height: Math.max(2, inner * 0.28), borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' }} />
        </View>
      ) : null}
    </View>
  );
}
