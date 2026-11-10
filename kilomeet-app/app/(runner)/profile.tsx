import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { colors } from '../../src/theme/colors';
import type { Rank } from '../../src/api/types';

// ponytail: hardcoded mock — swap with Zustand runner store when API ready
const MOCK = {
  name: 'Nguyễn Văn Minh',
  email: 'minh@kilomeet.vn',
  rank: 'vàng' as Rank,
  walletAddress: '0x1a2B3c4D5e6F7890aBcDeF1234567890AbCdEf12',
  totalKm: 342.8,
  totalRuns: 47,
  bestStreak: 12,
  seasonBadges: 3,
  isMember: false,
  memberExpiry: '2027-03-15',
  punctuality: 92,
};

const RANK_LABELS: Record<Rank, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'Bạch Kim',
  kim_cương: 'Kim Cương',
  cao_thủ: 'Cao Thủ',
};

const MEMBER_BENEFITS = [
  'Ghép nhóm chạy tự động',
  'Nhận thưởng token khi chạy nhóm',
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
  const logout = useAuthStore((s) => s.logout);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const rankColor = colors.rank[MOCK.rank];

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
              {getInitials(MOCK.name)}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold">{MOCK.name}</Text>
          <Text className="text-km-secondary text-sm mt-1">{MOCK.email}</Text>

          <View className="flex-row items-center mt-2 gap-2">
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${rankColor}20` }}
            >
              <Text className="text-xs font-semibold" style={{ color: rankColor }}>
                {RANK_LABELS[MOCK.rank]}
              </Text>
            </View>
            <View className="flex-row items-center px-3 py-1 rounded-full bg-km-surface">
              <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} />
              <Text className="text-km-secondary text-xs ml-1">
                {truncateAddress(MOCK.walletAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          <Text className="text-white text-base font-semibold mb-3">Thống kê</Text>
          <View className="flex-row justify-between">
            <StatItem label="Tổng km" value={`${MOCK.totalKm}`} icon="map-outline" />
            <StatItem label="Lần chạy" value={`${MOCK.totalRuns}`} icon="footsteps-outline" />
            <StatItem label="Streak" value={`${MOCK.bestStreak}`} icon="flame-outline" />
            <StatItem label="Badges" value={`${MOCK.seasonBadges}`} icon="ribbon-outline" />
          </View>
        </View>

        {/* ── Membership ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          {MOCK.isMember ? (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="star" size={18} color={colors.accent} />
                <Text className="text-white text-base font-semibold ml-2">Hội viên</Text>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-km-secondary text-xs">Hết hạn</Text>
                  <Text className="text-white text-sm">{MOCK.memberExpiry}</Text>
                </View>
                <View>
                  <Text className="text-km-secondary text-xs">Đúng giờ</Text>
                  <Text className="text-white text-sm">{MOCK.punctuality}%</Text>
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
              >
                <Text className="text-km-inverse font-bold text-sm">
                  Đăng ký Hội viên — 39.000đ/tháng
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
          <SettingsRow
            icon="language-outline"
            label="Ngôn ngữ"
            value="Tiếng Việt"
          />

          {/* About */}
          <SettingsRow
            icon="information-circle-outline"
            label="Về KILOMeet"
            value="v1.0.0"
          />

          {/* Logout */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5"
            onPress={logout}
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
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text className="text-white text-lg font-bold mt-1">{value}</Text>
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
      <View className="flex-row items-center">
        <Text className="text-km-secondary text-sm mr-1">{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </View>
  );
}
