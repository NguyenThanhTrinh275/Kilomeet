import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../../src/theme/colors';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { RANK_INDEX } from '../../../src/api/types';
import type { Rank, VoucherTemplate, OwnedVoucher } from '../../../src/api/types';

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { templates, myVouchers, buyVoucher, giftVoucher, fetchMyVouchers } = useVoucherStore();
  const { tokenBalance, rank } = useRunnerStore();

  // Find as template or owned voucher
  const ownedVoucher = myVouchers.find((v) => v.id === id);
  const template: VoucherTemplate | undefined =
    templates.find((t) => t.id === id) ?? ownedVoucher?.template;

  if (!template) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <Text className="text-slate-400">Không tìm thấy voucher</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-km-primary">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const questCompleted = ownedVoucher?.questCompletedAt != null;
  const hasQuestDiscount = template.questDiscountPercent > 0 && template.questDescription;
  const discountedPrice = hasQuestDiscount
    ? Math.round(template.priceTokens * (1 - template.questDiscountPercent / 100))
    : null;
  const price = questCompleted && discountedPrice != null ? discountedPrice : template.priceTokens;

  const handleBuy = async () => {
    // Check rank requirement
    if (RANK_INDEX[rank] < RANK_INDEX[template.minRank]) {
      Alert.alert('Không đủ hạng', `Cần hạng ${template.minRank} trở lên để mua voucher này.`);
      return;
    }
    // Check token balance
    if (tokenBalance < price) {
      Alert.alert('Không đủ token', `Bạn cần ${price} token nhưng chỉ có ${tokenBalance}.`);
      return;
    }
    try {
      await buyVoucher(template.id, questCompleted);
      await fetchMyVouchers();
      Alert.alert('Thành công', 'Đã mua voucher! Xem trong mục "Của tôi".');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể mua voucher';
      Alert.alert('Lỗi', msg);
    }
  };

  const handleGift = () => {
    if (!ownedVoucher) {
      Alert.alert('Thông báo', 'Bạn cần mua voucher trước khi tặng.');
      return;
    }
    Alert.prompt(
      'Tặng voucher',
      'Nhập ID người nhận:',
      async (recipientId) => {
        if (!recipientId?.trim()) return;
        try {
          await giftVoucher(ownedVoucher.id, recipientId.trim());
          Alert.alert('Thành công', 'Đã tặng voucher!');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Không thể tặng voucher';
          Alert.alert('Lỗi', msg);
        }
      },
    );
  };

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
              <Text className="text-white font-semibold text-base">{template.storeName}</Text>
              <Text className="text-slate-400 text-xs">Hết hạn: {template.expiresAt}</Text>
            </View>
          </View>

          <Text className="text-white text-xl font-bold mb-2">{template.title}</Text>
          <Text className="text-slate-400 text-sm">{template.description}</Text>
        </View>

        {/* Quest */}
        {template.questDescription && (
          <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4">
            <Text className="text-white font-semibold mb-3">Nhiệm vụ giảm giá</Text>
            <View className="flex-row items-center">
              <Ionicons
                name={questCompleted ? 'checkmark-circle' : 'flag-outline'}
                size={20}
                color={questCompleted ? colors.success : colors.textMuted}
              />
              <Text className="text-slate-400 text-sm ml-2 flex-1">{template.questDescription}</Text>
            </View>
            {questCompleted && (
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
            {discountedPrice != null && (
              <Text className="text-slate-500 text-lg line-through mr-3">{template.priceTokens} token</Text>
            )}
            <Text className="text-km-accent text-3xl font-bold">{price}</Text>
            <Text className="text-slate-400 text-base ml-1">token</Text>
          </View>
          <Text className="text-slate-500 text-xs mt-2">Còn lại: {template.remaining}/{template.totalSupply}</Text>
        </View>

        {/* QR Code for owned vouchers */}
        {ownedVoucher && ownedVoucher.status === 'owned' && (
          <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4 items-center">
            <Text className="text-white font-semibold mb-4">Mã QR voucher</Text>
            <View className="bg-white p-4 rounded-xl">
              <QRCode value={ownedVoucher.qrCode} size={200} />
            </View>
            <Text className="text-slate-400 text-xs mt-3">Đưa mã này cho cửa hàng để sử dụng</Text>
          </View>
        )}

        {/* Actions */}
        {!ownedVoucher && (
          <TouchableOpacity
            className="h-14 bg-km-primary rounded-2xl items-center justify-center mb-3"
            onPress={handleBuy}
          >
            <Text className="text-white text-lg font-semibold">Mua voucher — {price} token</Text>
          </TouchableOpacity>
        )}

        {ownedVoucher && ownedVoucher.status === 'owned' && (
          <TouchableOpacity
            className="h-14 bg-km-surface rounded-2xl items-center justify-center flex-row"
            onPress={handleGift}
          >
            <Ionicons name="gift-outline" size={20} color={colors.textSecondary} />
            <Text className="text-slate-300 text-base font-semibold ml-2">Tặng voucher</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
