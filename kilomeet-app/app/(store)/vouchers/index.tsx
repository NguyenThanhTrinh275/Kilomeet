import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import type { VoucherTemplate, Rank } from '../../../src/api/types';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch kim', kim_cương: 'Kim cương', cao_thủ: 'Cao thủ',
};

const MOCK_VOUCHERS: (VoucherTemplate & { usedCount: number })[] = [
  {
    id: 'v1', storeId: 's1', storeName: 'Cà phê Sài Gòn',
    storeLatitude: 10.77, storeLongitude: 106.69,
    title: 'Giảm 20% cà phê', description: 'Áp dụng cho tất cả đồ uống',
    priceTokens: 50, discountPercent: 20,
    questDescription: 'Chạy ngang qua quán', questDiscountPercent: 50,
    totalSupply: 100, remaining: 62, minRank: 'đồng' as Rank,
    expiresAt: '2026-12-31T23:59:59Z', imageUrl: null, usedCount: 23,
  },
  {
    id: 'v2', storeId: 's1', storeName: 'Cà phê Sài Gòn',
    storeLatitude: 10.77, storeLongitude: 106.69,
    title: 'Giảm 15% bánh mì', description: 'Bánh mì thịt nướng',
    priceTokens: 30, discountPercent: 15,
    questDescription: null, questDiscountPercent: 0,
    totalSupply: 50, remaining: 8, minRank: 'bạc' as Rank,
    expiresAt: '2026-11-30T23:59:59Z', imageUrl: null, usedCount: 18,
  },
  {
    id: 'v3', storeId: 's1', storeName: 'Cà phê Sài Gòn',
    storeLatitude: 10.77, storeLongitude: 106.69,
    title: 'Free topping', description: 'Thêm topping miễn phí',
    priceTokens: 20, discountPercent: 100,
    questDescription: 'Chạy ngang qua quán', questDiscountPercent: 30,
    totalSupply: 200, remaining: 0, minRank: 'đồng' as Rank,
    expiresAt: '2026-11-15T23:59:59Z', imageUrl: null, usedCount: 6,
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function VoucherStatus({ remaining, expiresAt }: { remaining: number; expiresAt: string }) {
  const expired = new Date(expiresAt) < new Date();
  if (expired) return <Text className="text-xs font-semibold" style={{ color: colors.error }}>Hết hạn</Text>;
  if (remaining === 0) return <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>Hết lượt</Text>;
  return <Text className="text-xs font-semibold" style={{ color: colors.success }}>Đang bán</Text>;
}

export default function StoreVouchersScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Voucher của tôi</Text>
        <TouchableOpacity onPress={() => router.push('/(store)/vouchers/create')}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {MOCK_VOUCHERS.map((v) => {
          const sold = v.totalSupply - v.remaining;
          return (
            <View key={v.id} className="bg-km-bg-secondary rounded-xl overflow-hidden mb-3">
              <View className="h-1 bg-km-accent" />
              <View className="p-4">
                {/* Title row */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-white text-base font-semibold">{v.title}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{v.description}</Text>
                  </View>
                  <VoucherStatus remaining={v.remaining} expiresAt={v.expiresAt} />
                </View>

                {/* Stats row */}
                <View className="flex-row items-center flex-wrap gap-y-2 mt-1">
                  {/* Price */}
                  <View className="flex-row items-center mr-4">
                    <Ionicons name="pricetag" size={14} color={colors.accent} />
                    <Text className="text-white text-sm font-bold ml-1">{v.priceTokens}</Text>
                    <Text className="text-slate-400 text-xs ml-0.5">token</Text>
                  </View>

                  {/* Discount */}
                  <View className="flex-row items-center mr-4">
                    <Ionicons name="trending-down" size={14} color={colors.primary} />
                    <Text className="text-km-primary text-sm font-bold ml-1">-{v.discountPercent}%</Text>
                  </View>

                  {/* Sold / Total */}
                  <View className="flex-row items-center mr-4">
                    <Ionicons name="cart" size={14} color={colors.textMuted} />
                    <Text className="text-slate-400 text-sm ml-1">{sold}/{v.totalSupply}</Text>
                  </View>

                  {/* Used count */}
                  <View className="flex-row items-center mr-4">
                    <Ionicons name="checkmark-done" size={14} color={colors.success} />
                    <Text className="text-slate-400 text-sm ml-1">{v.usedCount} đã dùng</Text>
                  </View>
                </View>

                {/* Bottom row */}
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-700">
                  {/* Min rank */}
                  <View
                    className="px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: (colors.rank[v.minRank as keyof typeof colors.rank] || colors.textMuted) + '20' }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: colors.rank[v.minRank as keyof typeof colors.rank] || colors.textMuted }}
                    >
                      {RANK_LABELS[v.minRank] || v.minRank}+
                    </Text>
                  </View>

                  {/* Expiry */}
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text className="text-slate-400 text-xs ml-1">HSD: {formatDate(v.expiresAt)}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
