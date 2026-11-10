import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/auth';
import { useRunnerStore } from '../../../src/stores/runner';
import { colors } from '../../../src/theme/colors';
import { api } from '../../../src/api/client';
import { RankBadge } from '../../../src/components/common/RankBadge';
import type { Rank, Runner } from '../../../src/api/types';

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
  'Xem vị trí nhóm chạy trực tiếp trên bản đồ',
  'Huy hiệu Hội viên VIP trên hồ sơ',
  'Ưu tiên tham gia sự kiện và giải chạy',
];

function truncateAddress(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
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
  }, [fetchRuns]);

  if (!user) return null;

  const rank = user.rank || 'đồng';
  const rankColor = colors.rank[rank] || colors.primary;
  const totalKm = runs.reduce((sum, r) => sum + r.distanceKm, 0);

  const handleSubscribe = () => {
    Alert.alert(
      'Đăng ký Hội viên',
      'Xác nhận đăng ký gói Hội viên 39.000đ/tháng để mở tính năng Ghép nhóm chạy?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận (39.000đ)',
          onPress: async () => {
            setSubscribing(true);
            try {
              await api.post('/auth/subscribe');
              const updated = { ...user, isMember: true, role: 'member' as const };
              useAuthStore.setState({ user: updated });
              Alert.alert('Thành công 🎉', 'Bạn đã là Hội viên KILOMeet! Vào tab "Nhóm" để ghép chạy.');
            } catch (e) {
              Alert.alert('Lỗi', (e as Error).message);
            } finally {
              setSubscribing(false);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ── User Header Card ── */}
        <View className="items-center px-6 pt-5 pb-6">
          <View className="mb-3 relative">
            <RankBadge rank={rank} size="lg" />
            {user.isMember && (
              <View className="absolute -top-1 -right-1 w-6 h-6 bg-km-accent rounded-full items-center justify-center border-2 border-km-bg">
                <Ionicons name="star" size={12} color="white" />
              </View>
            )}
          </View>

          <Text className="text-white text-2xl font-bold">{user.name}</Text>
          <Text className="text-slate-400 text-sm mt-0.5">{user.email}</Text>

          <View className="flex-row items-center mt-3 gap-2">
            <View
              className="px-3 py-1 rounded-full border"
              style={{
                backgroundColor: `${rankColor}15`,
                borderColor: `${rankColor}50`,
              }}
            >
              <Text className="text-xs font-bold" style={{ color: rankColor }}>
                Hạng {RANK_LABELS[rank]}
              </Text>
            </View>

            {user.isMember && (
              <View className="px-3 py-1 rounded-full bg-km-accent/15 border border-km-accent/40">
                <Text className="text-km-accent text-xs font-bold">Hội viên VIP</Text>
              </View>
            )}

            <View className="flex-row items-center px-3 py-1 rounded-full bg-km-bg-secondary border border-slate-700">
              <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
              <Text className="text-slate-300 text-xs ml-1.5 font-mono">
                {truncateAddress(user.walletAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats Card ── */}
        <View className="mx-4 p-5 rounded-2xl bg-km-bg-secondary border border-slate-800 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-bold">Thành tích mùa này</Text>
            <TouchableOpacity onPress={() => router.push('/(runner)/history')}>
              <Text className="text-km-primary text-xs font-semibold">Xem chi tiết →</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between">
            <StatItem
              label="Tổng km"
              value={`${Math.round(totalKm * 10) / 10}`}
              unit="km"
              icon="map"
              iconColor={colors.primary}
            />
            <StatItem
              label="Buổi chạy"
              value={`${runs.length}`}
              unit="buổi"
              icon="footsteps"
              iconColor={colors.info}
            />
            <StatItem
              label="Token ví"
              value={`${tokenBalance}`}
              unit="token"
              icon="diamond"
              iconColor={colors.accent}
            />
            <StatItem
              label="Hạng hiện tại"
              value={RANK_LABELS[rank]}
              unit=""
              icon="ribbon"
              iconColor={rankColor}
            />
          </View>
        </View>

        {/* ── Membership Card ── */}
        <View className="mx-4 p-5 rounded-2xl bg-km-bg-secondary border border-slate-800 mb-4 shadow-sm">
          {user.isMember ? (
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-km-accent/20 items-center justify-center mr-2.5">
                    <Ionicons name="star" size={16} color={colors.accent} />
                  </View>
                  <View>
                    <Text className="text-white text-base font-bold">Gói Hội viên KILOMeet</Text>
                    <Text className="text-km-primary text-xs">Đang hoạt động</Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-md bg-km-primary/10 border border-km-primary/30">
                  <Text className="text-km-primary text-xs font-bold">VIP</Text>
                </View>
              </View>

              <View className="bg-km-bg rounded-xl p-3.5 flex-row justify-around border border-slate-800 mt-1">
                <View className="items-center">
                  <Text className="text-slate-400 text-xs mb-0.5">Độ đúng hẹn</Text>
                  <Text className="text-white text-base font-bold">{user.punctuality}%</Text>
                </View>
                <View className="w-[1px] bg-slate-800" />
                <View className="items-center">
                  <Text className="text-slate-400 text-xs mb-0.5">Ghép nhóm</Text>
                  <Text className="text-km-primary text-base font-bold">Không giới hạn</Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View className="flex-row items-start justify-between mb-3">
                <View>
                  <Text className="text-white text-base font-bold">Đăng ký Hội viên</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Mở khoá tính năng ghép nhóm chạy chung</Text>
                </View>
                <Text className="text-km-accent text-base font-bold">39.000đ<Text className="text-xs text-slate-400">/tháng</Text></Text>
              </View>

              <View className="mb-4 bg-km-bg/70 rounded-xl p-3.5 border border-slate-800/80">
                {MEMBER_BENEFITS.map((benefit, i) => (
                  <View key={i} className="flex-row items-center py-1">
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text className="text-slate-300 text-xs ml-2.5 flex-1">{benefit}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className="h-12 rounded-xl items-center justify-center bg-km-primary"
                activeOpacity={0.8}
                onPress={handleSubscribe}
                disabled={subscribing}
              >
                <Text className="text-slate-900 font-bold text-sm">
                  {subscribing ? 'Đang kích hoạt...' : 'Kích hoạt Hội viên ngay — 39.000đ'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Settings & Links Card ── */}
        <View className="mx-4 rounded-2xl bg-km-bg-secondary border border-slate-800 overflow-hidden mb-4 shadow-sm">
          {/* Lịch sử chạy */}
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4 border-b border-slate-800/80"
            onPress={() => router.push('/(runner)/history')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-500/10 items-center justify-center">
                <Ionicons name="time" size={18} color="#38BDF8" />
              </View>
              <Text className="text-white text-sm font-medium ml-3">Lịch sử chạy bộ</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Huy hiệu mùa */}
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4 border-b border-slate-800/80"
            onPress={() => router.push('/(runner)/badges')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-amber-500/10 items-center justify-center">
                <Ionicons name="ribbon" size={18} color="#FBBF24" />
              </View>
              <Text className="text-white text-sm font-medium ml-3">Huy hiệu mùa giải</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Notifications toggle */}
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-800/80">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <Text className="text-white text-sm font-medium ml-3">Thông báo nhắc chạy</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Version info */}
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-800/80">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-slate-700/30 items-center justify-center">
                <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
              </View>
              <Text className="text-white text-sm font-medium ml-3">Phiên bản</Text>
            </View>
            <Text className="text-slate-400 text-xs font-mono">v1.0.0 (Avalanche)</Text>
          </View>

          {/* Logout */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-4"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center">
              <Ionicons name="log-out" size={18} color={colors.error} />
            </View>
            <Text className="text-red-400 text-sm font-medium ml-3">
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  label,
  value,
  unit,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
}) {
  return (
    <View className="items-center flex-1">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mb-1.5"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text className="text-white text-base font-bold">
        {value}
        {unit ? <Text className="text-xs text-slate-400 font-normal"> {unit}</Text> : null}
      </Text>
      <Text className="text-slate-400 text-xs mt-0.5 text-center">{label}</Text>
    </View>
  );
}
