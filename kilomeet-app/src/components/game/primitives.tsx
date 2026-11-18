// Primitive kiểu game: chữ, thẻ chunky, nhãn, ô icon, nút icon, chip, công tắc.
import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Pressable } from './Press';
import { Check, type LucideIcon } from 'lucide-react-native';
import { C, DEPTH, FONT, STROKE, TONE, TYPE, type TextVariant, type Tone } from '../../theme/game';

// ─── Text ───────────────────────────────────────────────────────

export type GTextProps = TextProps & {
  v?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  strike?: boolean;
};

/**
 * Font số Lilita One không có dấu thanh tiếng Việt (ộ, ủ, ơ, ư…): chữ như "Cao Thủ", "Đội" bị đổi sang font
 * hệ thống. Kiểu num* gặp các ký tự đó thì dùng Baloo 2 (cùng phong cách, đủ tiếng Việt). đ/Đ, â, ê, ô, ă vẫn có sẵn.
 */
const NO_LILITA = /[\u01A0\u01A1\u01AF\u01B0\u0300-\u036F\u1EA0-\u1EF9]/;
function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');
}

/**
 * Android đo độ rộng chữ `textTransform: 'uppercase'` theo chuỗi GỐC (chữ thường hẹp hơn) → nhãn caps bị cắt
 * "NHIỆM VỤ T…" / xuống dòng. Viết hoa sẵn trong JS rồi bỏ textTransform để đo đúng.
 */
function upper(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (c) => (typeof c === 'string' ? c.toUpperCase() : c));
}

/**
 * Android đo thiếu chuỗi có chữ tiếng Việt khối Latin Extended Additional (ạ ầ ồ ữ ệ…, U+1EA0–U+1EF9) và font đậm
 * Lilita One / Nunito Black → cắt chữ cuối ("ĐỒNG" → "ĐỒN", "1.068" → "1.06", "Tạm giữ 0đ" → "Tạm giữ").
 * Thêm 1 dấu cách không ngắt ở cuối thì đo đủ.
 */
const STACKED_UPPER = /[\u1EA0-\u1EF9]/;

export function GText({ v = 'bodyM', color = C.ink900, align, strike, style, children, ...props }: GTextProps) {
  const fallback = v.startsWith('num') && NO_LILITA.test(textOf(children)) ? { fontFamily: FONT.display } : null;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const caps = (flat?.textTransform ?? TYPE[v].textTransform) === 'uppercase';
  let content = caps ? upper(children) : children;
  // Lilita One (num*) và Nunito Black (caps) có nét tràn quá độ rộng ký tự → Android cắt chữ số / chữ cuối.
  const heavy = v.startsWith('num') || caps;
  if (Platform.OS === 'android' && (heavy || STACKED_UPPER.test(textOf(content))) && textOf(content)) content = [content, '\u00A0'];
  return (
    <Text
      {...props}
      children={content}
      style={[
        TYPE[v],
        fallback,
        { color },
        align ? { textAlign: align } : null,
        strike ? { textDecorationLine: 'line-through' } : null,
        style,
        caps ? { textTransform: 'none' } : null,
      ]}
    />
  );
}

// ─── Card ───────────────────────────────────────────────────────

type Pad = number | [number, number] | [number, number, number, number];
function padStyle(p?: Pad): ViewStyle {
  if (p == null) return {};
  if (typeof p === 'number') return { padding: p };
  if (p.length === 2) return { paddingVertical: p[0], paddingHorizontal: p[1] };
  return { paddingTop: p[0], paddingRight: p[1], paddingBottom: p[2], paddingLeft: p[3] };
}

export type CardProps = ViewProps & {
  fill?: string;
  depth?: keyof typeof DEPTH;
  radius?: number;
  pad?: Pad;
  gap?: number;
  row?: boolean;
  center?: boolean;
  stroke?: string | false;
  sw?: number;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
};

export function Card({
  fill = C.surface,
  depth = 'chunky',
  radius = 20,
  pad = 16,
  gap = 12,
  row,
  center,
  stroke = C.ink900,
  sw = STROKE,
  onPress,
  disabled,
  style,
  children,
  ...props
}: CardProps) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: fill,
      borderRadius: radius,
      gap,
      flexDirection: row ? 'row' : 'column',
      alignItems: center ? 'center' : row ? 'center' : undefined,
      ...(stroke ? { borderWidth: sw, borderColor: stroke } : null),
    },
    padStyle(pad),
  ];
  if (!onPress) {
    return (
      <View {...props} style={[base, DEPTH[depth], style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        base,
        pressed ? { boxShadow: `0px 1px 0px ${C.ink900}`, transform: [{ translateY: 3 }] } : DEPTH[depth],
        style,
      ]}>
      {children}
    </Pressable>
  );
}

// ─── Row / Col shorthands ───────────────────────────────────────

export function Row({ gap = 8, style, center = true, between, ...props }: ViewProps & { gap?: number; center?: boolean; between?: boolean }) {
  return (
    <View
      {...props}
      style={[
        { flexDirection: 'row', gap, alignItems: center ? 'center' : undefined, justifyContent: between ? 'space-between' : undefined },
        style,
      ]}
    />
  );
}

export function Col({ gap = 8, style, ...props }: ViewProps & { gap?: number }) {
  return <View {...props} style={[{ gap }, style]} />;
}

// ─── Pill ───────────────────────────────────────────────────────

export type PillTone = Tone | 'ink';
export function Pill({ tone = 'green', label, icon: Icon, style }: { tone?: PillTone; label: string; icon?: LucideIcon; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'ink' ? C.ink900 : TONE[tone][300];
  const fg = tone === 'ink' ? C.white : C.ink900;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          paddingVertical: 3,
          paddingHorizontal: 10,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: C.ink900,
        },
        style,
      ]}>
      {Icon ? <Icon size={12} color={tone === 'ink' ? C.coin500 : C.ink900} strokeWidth={2.5} /> : null}
      <GText v="caps" color={fg} numberOfLines={1}>
        {label}
      </GText>
    </View>
  );
}

// ─── IconTile ───────────────────────────────────────────────────

export function IconTile({
  icon: Icon,
  size = 44,
  iconSize,
  fill = C.orange500,
  color = C.ink900,
  radius,
  sw = 2,
  depth = 'none',
  style,
}: {
  icon: LucideIcon;
  size?: number;
  iconSize?: number;
  fill?: string;
  color?: string;
  radius?: number;
  sw?: number;
  depth?: keyof typeof DEPTH;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius ?? Math.round(size * 0.3),
          backgroundColor: fill,
          borderWidth: sw,
          borderColor: C.ink900,
          alignItems: 'center',
          justifyContent: 'center',
        },
        DEPTH[depth],
        style,
      ]}>
      <Icon size={iconSize ?? Math.round(size * 0.52)} color={color} strokeWidth={2.5} />
    </View>
  );
}

// ─── IconButton ─────────────────────────────────────────────────

export function IconButton({
  icon: Icon,
  onPress,
  size = 44,
  fill = C.surface,
  color = C.ink900,
  style,
  disabled,
  badge,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  fill?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  badge?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: 14,
          backgroundColor: fill,
          borderWidth: STROKE,
          borderColor: C.ink900,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed ? { transform: [{ translateY: 2 }] } : DEPTH.small,
        style,
      ]}>
      <Icon size={Math.round(size * 0.5)} color={color} strokeWidth={2.5} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.red500,
            borderWidth: 2,
            borderColor: C.ink900,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// ─── SectionHeader ──────────────────────────────────────────────

export function SectionHeader({ title, link, linkColor = C.orange700, onLink }: { title: string; link?: string; linkColor?: string; onLink?: () => void }) {
  return (
    <Row between>
      <GText v="titleM">{title}</GText>
      {link ? (
        <Pressable onPress={onLink} disabled={!onLink} hitSlop={8}>
          <GText v="bodyMStrong" color={linkColor}>
            {link}
          </GText>
        </Pressable>
      ) : null}
    </Row>
  );
}

// ─── Chip (selectable) ──────────────────────────────────────────

export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  tone = 'ink',
  disabled,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  tone?: 'ink' | Tone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const onBg = tone === 'ink' ? C.ink900 : TONE[tone][500];
  const onFg = tone === 'ink' || tone === 'grape' ? C.white : C.ink900;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: C.ink900,
          backgroundColor: selected ? onBg : C.surface,
          opacity: disabled ? 0.4 : 1,
        },
        selected && !pressed ? DEPTH.small : null,
        pressed ? { transform: [{ translateY: 1 }] } : null,
        style,
      ]}>
      {Icon ? <Icon size={14} color={selected ? (tone === 'ink' ? C.coin500 : onFg) : C.ink700} strokeWidth={2.5} /> : null}
      <GText v="bodyMStrong" color={selected ? onFg : C.ink900}>
        {label}
      </GText>
    </Pressable>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────

export function Toggle({ value, onChange, size = 'm' }: { value: boolean; onChange?: (v: boolean) => void; size?: 's' | 'm' }) {
  const w = size === 's' ? 40 : 48;
  const h = size === 's' ? 24 : 28;
  const k = h - 8;
  return (
    <Pressable
      onPress={() => onChange?.(!value)}
      hitSlop={8}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        backgroundColor: value ? C.green500 : C.sunken,
        borderWidth: 2,
        borderColor: C.ink900,
        padding: 2,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}>
      <View style={{ width: k, height: k, borderRadius: k, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink900 }} />
    </Pressable>
  );
}

// ─── Divider row (bảng thông tin) ───────────────────────────────

export function InfoRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1.5,
        borderBottomColor: C.ink300,
        gap: 12,
      }}>
      <GText v="bodyM" color={C.ink500}>
        {label}
      </GText>
      {typeof children === 'string' ? <GText v="bodyMStrong">{children}</GText> : children}
    </View>
  );
}

// ─── Banner (dải thông báo nhỏ) ─────────────────────────────────

export function Banner({
  icon: Icon,
  tone = 'sky',
  title,
  text,
  iconColor,
  style,
  right,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title?: string;
  text: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          borderRadius: 14,
          backgroundColor: TONE[tone][300],
          borderWidth: 2,
          borderColor: C.ink900,
        },
        style,
      ]}>
      <Icon size={20} color={iconColor ?? TONE[tone][700]} strokeWidth={2.5} />
      <View style={{ flex: 1, gap: 1 }}>
        {title ? <GText v="bodyMStrong">{title}</GText> : null}
        <GText v={title ? 'bodyS' : 'bodyMStrong'} color={title ? C.ink700 : C.ink900}>
          {text}
        </GText>
      </View>
      {right}
    </View>
  );
}

// ─── Radio dot ──────────────────────────────────────────────────

export function RadioDot({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size,
        borderWidth: 2.5,
        borderColor: C.ink900,
        backgroundColor: on ? C.ink900 : C.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {on ? <Check size={size * 0.58} color={C.white} strokeWidth={3} /> : null}
    </View>
  );
}
