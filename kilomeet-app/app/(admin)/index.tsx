import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';

// Mock data — will wire stores later
const MOCK = {
  adminName: 'Admin Trung',
  pendingStores: 3,
  totalStores: 12,
  season: {
    name: 'Mùa 2 — Thu 2026',
    endDate: '2026-12-31',
    isActive: true,
  },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function AdminDashboard() {
  const router = useRouter();
  const daysLeft = daysUntil(MOCK.season.endDate);

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Greeting */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Xin chào, {MOCK.adminName}</Text>
            <Text className="text-slate-400 text-sm mt-1">Bảng điều khiển quản trị</Text>
          </View>
          <View className="bg-km-accent/20 px-3 py-1.5 rounded-full">
            <Text className="text-km-accent text-xs font-bold">ADMIN</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row mb-4 gap-3">
          <View className="flex-1 bg-km-bg-secondary rounded-2xl p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
              <Text className="text-slate-400 text-xs ml-2">Chờ duyệt</Text>
            </View>
            <Text className="text-white text-3xl font-bold">{MOCK.pendingStores}</Text>
            <Text className="text-slate-500 text-xs mt-1">cửa hàng</Text>
          </View>
          <View className="flex-1 bg-km-bg-secondary rounded-2xl p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text className="text-slate-400 text-xs ml-2">Tổng cộng</Text>
            </View>
            <Text className="text-white text-3xl font-bold">{MOCK.totalStores}</Text>
            <Text className="text-slate-500 text-xs mt-1">cửa hàng</Text>
          </View>
        </View>

        {/* Season Info */}
        <View className="bg-km-bg-secondary rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            <Text className="text-white text-base font-semibold ml-2">Mùa hiện tại</Text>
            <View className="ml-auto">
              {MOCK.season.isActive ? (
                <View className="bg-km-primary/20 px-2 py-1 rounded-md">
                  <Text className="text-km-primary text-xs font-semibold">Đang diễn ra</Text>
                </View>
              ) : (
                <View className="bg-red-500/20 px-2 py-1 rounded-md">
                  <Text className="text-red-400 text-xs font-semibold">Đã kết thúc</Text>
                </View>
              )}
            </View>
          </View>
          <Text className="text-white text-lg font-bold">{MOCK.season.name}</Text>
          <Text className="text-slate-400 text-sm mt-1">
            Kết thúc: {new Date(MOCK.season.endDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        {/* Season Countdown */}
        <View className="bg-km-accent/10 border border-km-accent/30 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center">
            <Ionicons name="timer-outline" size={24} color={colors.accent} />
            <View className="ml-3 flex-1">
              <Text className="text-km-accent text-sm font-semibold">Đếm ngược mùa</Text>
              <Text className="text-white text-2xl font-bold mt-1">{daysLeft} ngày còn lại</Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Truy cập nhanh
        </Text>

        <TouchableOpacity
          className="bg-km-bg-secondary rounded-2xl p-4 mb-3 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => router.push('/(admin)/stores')}
        >
          <View className="w-10 h-10 rounded-full bg-km-primary/20 items-center justify-center">
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white text-base font-semibold">Duyệt cửa hàng</Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {MOCK.pendingStores} đang chờ duyệt
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-km-bg-secondary rounded-2xl p-4 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => router.push('/(admin)/season')}
        >
          <View className="w-10 h-10 rounded-full bg-km-accent/20 items-center justify-center">
            <Ionicons name="trophy" size={20} color={colors.accent} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white text-base font-semibold">Quản lý mùa</Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {MOCK.season.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
