// Nút "chunky" kiểu game: viền mực 2.5, bóng đáy cứng 4px, nhấn xuống khi bấm.
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Press';
import type { LucideIcon } from 'lucide-react-native';
import { C, DEPTH, STROKE } from '../../theme/game';
import { GText } from './primitives';

export type ButtonType = 'primary' | 'accent' | 'coin' | 'secondary' | 'danger' | 'night' | 'disabled';
export type ButtonSize = 'L' | 'M' | 'S';

const TYPES: Record<ButtonType, { bg: string; fg: string }> = {
  primary: { bg: C.green500, fg: C.ink900 },
  accent: { bg: C.orange500, fg: C.ink900 },
  coin: { bg: C.coin500, fg: C.ink900 },
  secondary: { bg: C.surface, fg: C.ink900 },
  danger: { bg: C.red500, fg: C.white },
  night: { bg: C.grape500, fg: C.white },
  disabled: { bg: C.sunken, fg: C.ink500 },
};

const SIZES: Record<ButtonSize, { h: number; px: number; icon: number; radius: number; text: 'button' | 'titleS' | 'bodyMStrong' }> = {
  L: { h: 56, px: 24, icon: 22, radius: 16, text: 'button' },
  M: { h: 44, px: 18, icon: 20, radius: 16, text: 'titleS' },
  S: { h: 34, px: 12, icon: 16, radius: 12, text: 'bodyMStrong' },
};

export type GButtonProps = {
  label: string;
  onPress?: () => void;
  type?: ButtonType;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Icon bên phải nhãn thay vì bên trái */
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** flex: 1 trong hàng ngang */
  flex?: boolean;
  /** Kéo giãn hết chiều ngang trong cột */
  block?: boolean;
  height?: number;
  /** Tô đặc icon (Play / Pause) */
  filledIcon?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GButton({
  label,
  onPress,
  type = 'primary',
  size = 'L',
  icon: Icon,
  iconRight,
  disabled,
  loading,
  flex,
  block,
  height,
  filledIcon,
  style,
}: GButtonProps) {
  const off = disabled || loading;
  const t = TYPES[disabled ? 'disabled' : type];
  const s = SIZES[size];
  const iconEl = Icon ? (
    <Icon
      size={s.icon}
      color={t.fg}
      strokeWidth={2.5}
      fill={filledIcon ? t.fg : 'transparent'}
    />
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        {
          height: height ?? s.h,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          backgroundColor: t.bg,
          borderWidth: STROKE,
          borderColor: disabled ? C.ink300 : C.ink900,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        flex ? { flex: 1 } : null,
        block ? { alignSelf: 'stretch' } : null,
        disabled ? DEPTH.small : pressed ? DEPTH.pressed : DEPTH.button,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          {!iconRight ? iconEl : null}
          <GText v={s.text} color={t.fg} numberOfLines={1}>
            {label}
          </GText>
          {iconRight ? iconEl : null}
        </>
      )}
    </Pressable>
  );
}

/** Nút tròn lớn (Xuất phát / Tạm dừng / Dừng). */
export function RoundButton({
  icon: Icon,
  size = 72,
  fill = C.green500,
  color = C.ink900,
  onPress,
  disabled,
  filledIcon,
  style,
}: {
  icon: LucideIcon;
  size?: number;
  fill?: string;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  filledIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: fill,
          borderWidth: 3,
          borderColor: C.ink900,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        pressed
          ? DEPTH.pressed
          : { boxShadow: `0px 5px 0px ${C.ink900}, inset 0px -5px 0px rgba(0,0,0,0.18), inset 0px 4px 0px rgba(255,255,255,0.5)` },
        style,
      ]}>
      <Icon size={Math.round(size * 0.42)} color={color} strokeWidth={2.5} fill={filledIcon ? color : 'transparent'} />
    </Pressable>
  );
}
