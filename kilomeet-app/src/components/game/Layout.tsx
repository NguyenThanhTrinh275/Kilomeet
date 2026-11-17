// Khung màn hình: nền, header có nút back chunky, thanh dính dưới đáy, trạng thái trống/đang tải.
import * as React from 'react';
import { ActivityIndicator, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { C, STROKE } from '../../theme/game';
import { GText, IconButton, IconTile } from './primitives';

/** Nền màn hình + vùng an toàn. `gradient` cho màn tối. */
export function Screen({
  children,
  bg = C.bg,
  gradient,
  edges = ['top'],
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  gradient?: readonly [string, string, ...string[]];
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: bg }, style]}>
      {gradient ? <LinearGradient colors={gradient} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** ScrollView với padding chuẩn 24 và khoảng cách giữa các khối. */
export function Body({
  children,
  gap = 16,
  padTop = 8,
  padBottom = 40,
  center,
  ...props
}: ScrollViewProps & { gap?: number; padTop?: number; padBottom?: number; center?: boolean }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
      contentContainerStyle={[
        { paddingHorizontal: 24, paddingTop: padTop, paddingBottom: padBottom, gap, alignItems: center ? 'center' : undefined },
        props.contentContainerStyle,
      ]}>
      {children}
    </ScrollView>
  );
}

/** Header màn phụ: nút back chunky + tiêu đề giữa + action phải. */
export function TopBar({
  title,
  action,
  onAction,
  onBack,
  light,
  actionBadge,
}: {
  title?: string;
  action?: LucideIcon;
  onAction?: () => void;
  onBack?: () => void;
  light?: boolean;
  actionBadge?: boolean;
}) {
  return (
    <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <IconButton icon={ChevronLeft} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <GText v="titleM" align="center" color={light ? C.white : C.ink900} numberOfLines={1} style={{ flex: 1 }}>
        {title ?? ''}
      </GText>
      {action ? <IconButton icon={action} onPress={onAction} badge={actionBadge} /> : <View style={{ width: 44 }} />}
    </View>
  );
}

/** Thanh dính dưới đáy (mua voucher, lưu hồ sơ...). */
export function StickyBar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 14,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 14) + 6,
          backgroundColor: C.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 3,
          borderBottomWidth: 0,
          borderColor: C.ink900,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Loading({ dark }: { dark?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? C.night : C.bg }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.green500, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 4px 0px ${C.ink900}` }}>
        <ActivityIndicator color={C.ink900} size="large" />
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, text, tone = C.sky300 }: { icon: LucideIcon; title: string; text?: string; tone?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 120, height: 120, borderRadius: 999, backgroundColor: tone, borderWidth: STROKE, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
        <IconTile icon={icon} size={64} iconSize={34} fill={C.surface} radius={20} depth="chunky" sw={STROKE} />
      </View>
      <GText v="titleM" align="center">
        {title}
      </GText>
      {text ? (
        <GText v="bodyM" color={C.ink500} align="center">
          {text}
        </GText>
      ) : null}
    </View>
  );
}
