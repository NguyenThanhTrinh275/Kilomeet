import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';

// ponytail: mock — will use store lookup when API ready
const VOUCHER_DATA: Record<string, {
  storeName: string; title: string; description: string;
  originalPrice: number; discountedPrice?: number;
  questDescription?: string; questCompleted: boolean;
  minRank: string; expiresAt: string; storeAddress: string;
}> = {
  v1: {
    storeName: 'Cà Phê Bách Khoa',
    title: 'Giảm 20% nước uống',
    description: 'Áp dụng cho tất cả các loại nước uống tại quán. Không áp dụng combo.',
    originalPrice: 500, discountedPrice: 250,
    questDescription: 'Chạy ngang qua quán (cách quán dưới 50m)',
    questCompleted: true,
    minRank: 'bạc', expiresAt: '2026-12-31',
    storeAddress: '268 Lý Thường Kiệt, Q.10, TP.HCM',
  },
};

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const voucher = VOUCHER_DATA[id] || VOUCHER_DATA.v1;
  const hasDiscount = voucher.discountedPrice != null && voucher.discountedPrice < voucher.originalPrice;
  const price = hasDiscount ? voucher.discountedPrice! : voucher.originalPrice;

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold flex-1">Chi tiết voucher</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Store info */}
        <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-km-accent/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="storefront" size={22} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">{voucher.storeName}</Text>
              <Text className="text-slate-400 text-xs">{voucher.storeAddress}</Text>
            </View>
          </View>

          <Text className="text-white text-xl font-bold mb-2">{voucher.title}</Text>
          <Text className="text-slate-400 text-sm">{voucher.description}</Text>
        </View>

        {/* Quest */}
        {voucher.questDescription && (
          <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4">
            <Text className="text-white font-semibold mb-3">Nhiệm vụ giảm giá</Text>
            <View className="flex-row items-center">
              <Ionicons
                name={voucher.questCompleted ? 'checkmark-circle' : 'flag-outline'}
                size={20}
                color={voucher.questCompleted ? colors.success : colors.textMuted}
              />
              <Text className="text-slate-400 text-sm ml-2 flex-1">{voucher.questDescription}</Text>
            </View>
            {voucher.questCompleted && (
              <View className="mt-3 bg-km-primary/10 rounded-lg p-2">
                <Text className="text-km-primary text-xs text-center font-semibold">
                  ✓ Đã hoàn thành — Bạn được mua với giá giảm!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Price */}
        <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4">
          <Text className="text-white font-semibold mb-3">Giá</Text>
          <View className="flex-row items-baseline">
            {hasDiscount && (
              <Text className="text-slate-500 text-lg line-through mr-3">{voucher.originalPrice} token</Text>
            )}
            <Text className="text-km-accent text-3xl font-bold">{price}</Text>
            <Text className="text-slate-400 text-base ml-1">token</Text>
          </View>
          <Text className="text-slate-500 text-xs mt-2">Hết hạn: {voucher.expiresAt}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity className="h-14 bg-km-primary rounded-2xl items-center justify-center mb-3">
          <Text className="text-white text-lg font-semibold">Mua voucher — {price} token</Text>
        </TouchableOpacity>

        <TouchableOpacity className="h-14 bg-km-surface rounded-2xl items-center justify-center flex-row">
          <Ionicons name="gift-outline" size={20} color={colors.textSecondary} />
          <Text className="text-slate-300 text-base font-semibold ml-2">Tặng sau khi mua</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
