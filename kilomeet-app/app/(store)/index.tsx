import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import type { StoreDashboard, Store } from '../../src/api/types';

function StatCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View className="flex-1 bg-km-bg-secondary rounded-xl p-4 mx-1">
      <Ionicons name={icon} size={22} color={color} />
      <Text className="text-white text-xl font-bold mt-2">{value}</Text>
      <Text className="text-slate-400 text-xs mt-1">{label}</Text>
    </View>
  );
}

function formatVnd(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function StoreDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as Store | null;
  const logout = useAuthStore((s) => s.logout);
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const approved = user?.approved ?? false;

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.get<StoreDashboard>('/store/dashboard');
      setDashboard(data);
    } catch {
      // silently fail — dashboard stays null
    }
  }, []);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const d = dashboard;

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">{d?.storeName ?? user?.storeName ?? ''}</Text>
            <View className="flex-row items-center mt-1">
              <View
                className="px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: approved ? colors.success + '20' : colors.warning + '20' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: approved ? colors.success : colors.warning }}
                >
                  {approved ? 'Đã duyệt' : 'Chờ duyệt'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} className="bg-km-bg-secondary rounded-full p-3">
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Pending approval banner */}
        {!approved && (
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex-row items-center">
            <Ionicons name="time-outline" size={24} color={colors.warning} />
            <Text className="text-amber-400 text-sm ml-3 flex-1 font-semibold">
              Tài khoản đang chờ duyệt. Bạn chưa thể tạo voucher hoặc quét QR.
            </Text>
          </View>
        )}

        {/* Stats */}
        {d && (
          <View className="flex-row mb-4">
            <StatCard icon="pricetags" label="Voucher tạo" value={String(d.totalVouchersCreated)} color={colors.info} />
            <StatCard icon="checkmark-done" label="Đã sử dụng" value={String(d.totalVouchersUsed)} color={colors.success} />
            <StatCard icon="cash" label="Phí còn nợ" value={formatVnd(d.totalFeesVnd)} color={colors.warning} />
          </View>
        )}

        {/* Quick Actions */}
        <View className="flex-row mb-4">
          <TouchableOpacity
            className="flex-1 bg-km-primary rounded-xl py-4 items-center mr-2 flex-row justify-center"
            activeOpacity={0.7}
            onPress={() => router.push('/(store)/vouchers/create')}
            disabled={!approved}
            style={!approved ? { opacity: 0.4 } : undefined}
          >
            <Ionicons name="add-circle" size={20} color={colors.textInverse} />
            <Text className="text-km-bg font-bold text-base ml-2">Tạo voucher</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-km-accent rounded-xl py-4 items-center ml-2 flex-row justify-center"
            activeOpacity={0.7}
            onPress={() => router.push('/(store)/scan')}
            disabled={!approved}
            style={!approved ? { opacity: 0.4 } : undefined}
          >
            <Ionicons name="qr-code" size={20} color={colors.white} />
            <Text className="text-white font-bold text-base ml-2">Quét QR</Text>
          </TouchableOpacity>
        </View>

        {/* Nav to voucher list */}
        <TouchableOpacity
          className="bg-km-bg-secondary rounded-xl py-4 px-4 mb-6 flex-row items-center justify-between"
          activeOpacity={0.7}
          onPress={() => router.push('/(store)/vouchers')}
        >
          <View className="flex-row items-center">
            <Ionicons name="list" size={20} color={colors.primary} />
            <Text className="text-white font-semibold text-base ml-3">Danh sách voucher</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Recent Redemptions */}
        {d && d.recentUsages.length > 0 && (
          <>
            <Text className="text-white text-lg font-bold mb-3">Đổi gần đây</Text>
            {d.recentUsages.map((u, i) => (
              <View key={i} className="bg-km-bg-secondary rounded-xl p-4 mb-2 flex-row items-center">
                <View className="bg-km-surface rounded-full p-2 mr-3">
                  <Ionicons name="receipt" size={18} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold">{u.voucherTitle}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{u.userName}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-400 text-xs">{formatTime(u.usedAt)}</Text>
                  <Text className="text-amber-400 text-xs mt-0.5">-5.000đ</Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
