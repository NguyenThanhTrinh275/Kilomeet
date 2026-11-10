import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { useRunnerStore } from '../../src/stores/runner';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import type { Rank, Runner } from '../../src/api/types';

const RANK_LABELS: Record<Rank, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'Bạch Kim',
  kim_cương: 'Kim Cương',
  cao_thủ: 'Cao Thủ',
};

const MEMBER_BENEFITS = [
  'Ghép nhóm chạy tự động gần nhà',
  'Được ghép nhóm chạy chung gần nhà',
  'Badge hội viên trên hồ sơ',
  'Ưu tiên sự kiện & giải chạy',
];

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user) as Runner | null;
  const logout = useAuthStore((s) => s.logout);
  const runs = useRunnerStore((s) => s.runs);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const fetchRuns = useRunnerStore((s) => s.fetchRuns);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, []);

  if (!user) return null;

  const rank = user.rank;
  const rankColor = colors.rank[rank];
  const totalKm = runs.reduce((sum, r) => sum + r.distanceKm, 0);

  const handleSubscribe = () => {
    Alert.alert(
      'Đăng ký Hội viên',
      'Xác nhận đăng ký gói Hội viên 39.000đ/tháng?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng ký',
          onPress: async () => {
            setSubscribing(true);
            try {
              await api.post('/auth/subscribe');
              // Update local auth state
              const updated = { ...user, isMember: true, role: 'member' as const };
              useAuthStore.setState({ user: updated });
              Alert.alert('Thành công', 'Bạn đã là Hội viên KILOMeet!');
            } catch (e) {
              Alert.alert('Lỗi', (e as Error).message);
            }
            setSubscribing(false);
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ── */}
        <View className="items-center px-6 pt-6 pb-4">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: rankColor }}
          >
            <Text className="text-2xl font-bold" style={{ color: colors.bgPrimary }}>
              {getInitials(user.name)}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold">{user.name}</Text>
          <Text className="text-km-secondary text-sm mt-1">{user.email}</Text>

          <View className="flex-row items-center mt-2 gap-2">
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${rankColor}20` }}
            >
              <Text className="text-xs font-semibold" style={{ color: rankColor }}>
                {RANK_LABELS[rank]}
              </Text>
            </View>
            <View className="flex-row items-center px-3 py-1 rounded-full bg-km-surface">
              <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} />
              <Text className="text-km-secondary text-xs ml-1">
                {truncateAddress(user.walletAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          <Text className="text-white text-base font-semibold mb-3">Thống kê</Text>
          <View className="flex-row justify-between">
            <StatItem label="Tổng km" value={`${Math.round(totalKm * 10) / 10}`} icon="map-outline" />
            <StatItem label="Lần chạy" value={`${runs.length}`} icon="footsteps-outline" />
            <StatItem label="Token" value={`${tokenBalance}`} icon="diamond-outline" />
            <StatItem label="Hạng" value={RANK_LABELS[rank]} icon="ribbon-outline" />
          </View>
        </View>

        {/* ── Membership ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          {user.isMember ? (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="star" size={18} color={colors.accent} />
                <Text className="text-white text-base font-semibold ml-2">Hội viên</Text>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-km-secondary text-xs">Đúng giờ</Text>
                  <Text className="text-white text-sm">{user.punctuality}%</Text>
                </View>
                <View>
                  <Text className="text-km-secondary text-xs">Token</Text>
                  <Text className="text-white text-sm">{tokenBalance}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text className="text-white text-base font-semibold mb-2">Hội viên KILOMeet</Text>
              <View className="mb-3">
                {MEMBER_BENEFITS.map((b) => (
                  <View key={b} className="flex-row items-center mb-1.5">
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text className="text-km-secondary text-sm ml-2">{b}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primary }}
                activeOpacity={0.8}
                onPress={handleSubscribe}
                disabled={subscribing}
              >
                <Text className="text-km-inverse font-bold text-sm">
                  {subscribing ? 'Đang xử lý...' : 'Đăng ký Hội viên — 39.000đ/tháng'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Settings ── */}
        <View className="mx-4 rounded-2xl bg-km-surface-dark overflow-hidden">
          {/* Notifications toggle */}
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-km-border">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <Text className="text-white text-sm ml-3">Thông báo</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={{ false: colors.bgTertiary, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Language */}
          <SettingsRow icon="language-outline" label="Ngôn ngữ" value="Tiếng Việt" />

          {/* About */}
          <SettingsRow icon="information-circle-outline" label="Về KILOMeet" value="v1.0.0" />

          {/* Logout */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text className="text-sm ml-3" style={{ color: colors.error }}>
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function StatItem({ label, value, icon }: { label: string; value: string; icon: IoniconsName }) {
  return (
    <View className="items-center flex-1">
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text className="text-white text-base font-bold mt-1">{value}</Text>
      <Text className="text-km-secondary text-xs">{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, value }: { icon: IoniconsName; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-km-border">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text className="text-white text-sm ml-3">{label}</Text>
      </View>
      <Text className="text-km-secondary text-sm">{value}</Text>
    </View>
  );
}
