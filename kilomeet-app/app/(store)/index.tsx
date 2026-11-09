import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import type { StoreDashboard } from '../../src/api/types';

const MOCK_DASHBOARD: StoreDashboard = {
  storeId: 'store-1',
  storeName: 'Cà phê Sài Gòn',
  totalVouchersCreated: 12,
  totalVouchersUsed: 47,
  totalFeesVnd: 235_000,
  recentUsages: [
    { voucherTitle: 'Giảm 20% cà phê', usedAt: '2026-11-10T08:30:00Z', userName: 'Nguyễn Văn A' },
    { voucherTitle: 'Giảm 15% bánh mì', usedAt: '2026-11-09T14:20:00Z', userName: 'Trần Thị B' },
    { voucherTitle: 'Giảm 20% cà phê', usedAt: '2026-11-09T09:15:00Z', userName: 'Lê Văn C' },
    { voucherTitle: 'Free topping', usedAt: '2026-11-08T16:45:00Z', userName: 'Phạm D' },
  ],
};

const APPROVED = true; // mock store status

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
  const d = MOCK_DASHBOARD;

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">{d.storeName}</Text>
            <View className="flex-row items-center mt-1">
              <View
                className="px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: APPROVED ? colors.success + '20' : colors.warning + '20' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: APPROVED ? colors.success : colors.warning }}
                >
                  {APPROVED ? 'Đã duyệt' : 'Chờ duyệt'}
                </Text>
              </View>
            </View>
          </View>
          <View className="bg-km-bg-secondary rounded-full p-3">
            <Ionicons name="storefront" size={24} color={colors.accent} />
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mb-4">
          <StatCard icon="pricetags" label="Voucher tạo" value={String(d.totalVouchersCreated)} color={colors.info} />
          <StatCard icon="checkmark-done" label="Đã sử dụng" value={String(d.totalVouchersUsed)} color={colors.success} />
          <StatCard icon="cash" label="Phí còn nợ" value={formatVnd(d.totalFeesVnd)} color={colors.warning} />
        </View>

        {/* Quick Actions */}
        <View className="flex-row mb-6">
          <TouchableOpacity
            className="flex-1 bg-km-primary rounded-xl py-4 items-center mr-2 flex-row justify-center"
            activeOpacity={0.7}
            onPress={() => router.push('/(store)/vouchers/create')}
          >
            <Ionicons name="add-circle" size={20} color={colors.textInverse} />
            <Text className="text-km-bg font-bold text-base ml-2">Tạo voucher</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-km-accent rounded-xl py-4 items-center ml-2 flex-row justify-center"
            activeOpacity={0.7}
            onPress={() => router.push('/(store)/scan')}
          >
            <Ionicons name="qr-code" size={20} color={colors.white} />
            <Text className="text-white font-bold text-base ml-2">Quét QR</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Redemptions */}
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
              <Text className="text-km-warning text-xs mt-0.5">-5.000đ</Text>
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
