// Thanh tab nổi của Runner (nút CHẠY tròn ở giữa) và thanh điều hướng của Cửa hàng.
import { View } from 'react-native';
import { Pressable } from './Press';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { Footprints, House, ScanLine, ShoppingBag, User, Users, type LucideIcon } from 'lucide-react-native';
import { C, DEPTH, STROKE } from '../../theme/game';
import { useUiStore } from '../../stores/ui';
import { GText } from './primitives';

/** Chiều cao vùng thanh tab (để nội dung chừa chỗ). */
export const TAB_BAR_SPACE = 120;

const RUNNER_TABS: { name: string; label: string; icon: LucideIcon | null }[] = [
  { name: 'index', label: 'Sảnh', icon: House },
  { name: 'vouchers', label: 'Cửa hàng', icon: ShoppingBag },
  { name: 'run', label: 'Chạy', icon: null },
  { name: 'groups', label: 'Nhóm', icon: Users },
  { name: 'profile', label: 'Hồ sơ', icon: User },
];

function TabItem({ label, icon: Icon, active, onPress, center }: { label: string; icon: LucideIcon | null; active: boolean; onPress: () => void; center?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: center ? 'flex-end' : 'center',
        paddingBottom: center ? 6 : 0,
        gap: 2,
        borderRadius: 18,
        backgroundColor: active && !center ? C.coin300 : 'transparent',
        borderWidth: active && !center ? 2 : 0,
        borderColor: C.ink900,
      }}>
      {Icon ? <Icon size={24} color={active ? C.ink900 : C.ink500} strokeWidth={2.5} /> : null}
      <GText v="caps" color={active ? C.ink900 : C.ink500} align="center" numberOfLines={1} style={{ fontSize: 10, letterSpacing: 0 }}>
        {label}
      </GText>
    </Pressable>
  );
}

/**
 * Nút tròn nổi giữa thanh tab. Căn giữa bằng một hàng phủ ngang (alignItems: center)
 * thay vì `left: '50%'` + marginLeft âm — cách đó bị lệch sang mép trái trên Android.
 */
function CenterButton({ onPress, icon: Icon, color }: { onPress: () => void; icon: LucideIcon; color: string }) {
  return (
    // top âm: đẩy nút lên cao hơn để không đè lên nhãn ("QUÉT QR" / "CHẠY") nằm ở đáy thanh tab.
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -12, height: 64, alignItems: 'center' }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: color,
            borderWidth: 3,
            borderColor: C.ink900,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed
            ? DEPTH.pressed
            : { boxShadow: `0px 5px 0px ${C.ink900}, inset 0px -5px 0px rgba(0,0,0,0.18), inset 0px 4px 0px rgba(255,255,255,0.55)` },
        ]}>
        <Icon size={30} color={C.ink900} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

export function GameTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hidden = useUiStore((s) => s.hideTabBar);
  if (hidden) return null;
  const current = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r: { name: string }) => r.name === name);
    if (!route || current === name) return;
    navigateToTab(route.key);
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 98 + Math.max(insets.bottom - 8, 0) }}>
      <View
        style={[
          {
            position: 'absolute',
            left: 12,
            right: 12,
            top: 26,
            height: 68,
            borderRadius: 24,
            backgroundColor: C.surface,
            borderWidth: STROKE,
            borderColor: C.ink900,
            flexDirection: 'row',
            alignItems: 'center',
            padding: 6,
            gap: 2,
          },
          DEPTH.chunky,
        ]}>
        {RUNNER_TABS.map((t) => (
          <TabItem key={t.name} label={t.label} icon={t.icon} active={current === t.name} center={t.name === 'run'} onPress={() => go(t.name)} />
        ))}
      </View>
      <CenterButton color={current === 'run' ? C.orange500 : C.green500} icon={Footprints} onPress={() => go('run')} />
    </View>
  );
}

/** Thanh điều hướng nổi của tài khoản Cửa hàng (Tổng quan · Quét QR · Voucher). */
export function StoreNav({ active }: { active: 'home' | 'vouchers' }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 98 + Math.max(insets.bottom - 8, 0) }}>
      <View
        style={[
          {
            position: 'absolute',
            left: 12,
            right: 12,
            top: 26,
            height: 68,
            borderRadius: 24,
            backgroundColor: C.surface,
            borderWidth: STROKE,
            borderColor: C.ink900,
            flexDirection: 'row',
            alignItems: 'center',
            padding: 6,
            gap: 2,
          },
          DEPTH.chunky,
        ]}>
        <TabItem label="Tổng quan" icon={House} active={active === 'home'} onPress={() => active !== 'home' && router.replace('/(store)')} />
        <TabItem label="Quét QR" icon={null} active={false} center onPress={() => router.push('/(store)/scan')} />
        <TabItem label="Voucher" icon={ShoppingBag} active={active === 'vouchers'} onPress={() => active !== 'vouchers' && router.replace('/(store)/vouchers')} />
      </View>
      <CenterButton color={C.orange500} icon={ScanLine} onPress={() => router.push('/(store)/scan')} />
    </View>
  );
}
