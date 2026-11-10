import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../../src/theme/colors';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { RANK_INDEX } from '../../../src/api/types';
import type { VoucherTemplate } from '../../../src/api/types';

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { templates, myVouchers, buyVoucher, giftVoucher, fetchMyVouchers } = useVoucherStore();
  const { tokenBalance, rank, runs } = useRunnerStore();

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [gifting, setGifting] = useState(false);
  const [buying, setBuying] = useState(false);

  // Find as template or owned voucher
  const ownedVoucher = myVouchers.find((v) => v.id === id);
  const template: VoucherTemplate | undefined =
    templates.find((t) => t.id === id) ?? ownedVoucher?.template;

  if (!template) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text className="text-slate-400 mt-2">Không tìm thấy voucher</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 py-2 px-4 bg-km-bg-secondary rounded-xl">
          <Text className="text-km-primary font-semibold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Check if runner passed store during recent runs
  const passedStoreIds = runs.flatMap((r) => r.passedStoreIds || []);
  const hasPassedStore = passedStoreIds.includes(template.storeId);
  const questCompleted = ownedVoucher?.questCompletedAt != null || hasPassedStore;

  const hasQuestDiscount = template.questDiscountPercent > 0 && template.questDescription;
  const discountedPrice = hasQuestDiscount
    ? Math.round(template.priceTokens * (1 - template.questDiscountPercent / 100))
    : null;

  const price = questCompleted && discountedPrice != null ? discountedPrice : template.priceTokens;

  const handleBuy = async () => {
    // Check rank requirement
    if (RANK_INDEX[rank] < RANK_INDEX[template.minRank]) {
      Alert.alert('Chưa đủ hạng', `Cần đạt từ hạng ${template.minRank.toUpperCase()} trở lên để mua voucher này.`);
      return;
    }
    // Check token balance
    if (tokenBalance < price) {
      Alert.alert('Không đủ token', `Bạn cần ${price} token nhưng hiện có ${tokenBalance} token.`);
      return;
    }

    setBuying(true);
    try {
      await buyVoucher(template.id, questCompleted);
      // Update local runner token balance immediately
      useRunnerStore.setState({ tokenBalance: tokenBalance - price });
      await fetchMyVouchers();
      Alert.alert(
        'Mua thành công 🎉',
        `Đã đổi ${price} token lấy voucher "${template.title}". Xem mã QR trong tab "Của tôi".`,
        [{ text: 'Đến xem mã QR', onPress: () => router.replace('/(runner)/vouchers') }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể mua voucher';
      Alert.alert('Lỗi', msg);
    } finally {
      setBuying(false);
    }
  };

  const confirmGift = async () => {
    if (!ownedVoucher) return;
    const trimmed = recipientId.trim();
    if (!trimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ID hoặc chọn tài khoản người nhận.');
      return;
    }

    setGifting(true);
    try {
      await giftVoucher(ownedVoucher.id, trimmed);
      await fetchMyVouchers();
      setShowGiftModal(false);
      Alert.alert(
        'Đã tặng thành công 🎉',
        `Voucher đã được chuyển quyền sở hữu cho ${trimmed}.`,
        [{ text: 'Đóng', onPress: () => router.back() }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể tặng voucher';
      Alert.alert('Lỗi', msg);
    } finally {
      setGifting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-km-bg-secondary">
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold flex-1">Chi tiết voucher</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Store info card */}
        <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4 border border-slate-800 shadow-sm">
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 bg-km-accent/15 rounded-xl items-center justify-center mr-3 border border-km-accent/30">
              <Ionicons name="storefront" size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{template.storeName}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">HSD: {template.expiresAt.slice(0, 10)}</Text>
            </View>
          </View>

          <Text className="text-white text-xl font-bold mb-1.5">{template.title}</Text>
          <Text className="text-slate-300 text-sm leading-5">{template.description}</Text>
        </View>

        {/* Quest Info Card */}
        {template.questDescription && (
          <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4 border border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-bold text-base">Nhiệm vụ giảm giá</Text>
              <View className={`px-2.5 py-1 rounded-full ${questCompleted ? 'bg-km-primary/15 border border-km-primary/40' : 'bg-slate-800'}`}>
                <Text className={`text-xs font-semibold ${questCompleted ? 'text-km-primary' : 'text-slate-400'}`}>
                  {questCompleted ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start bg-km-bg/80 rounded-xl p-3 border border-slate-800">
              <Ionicons
                name={questCompleted ? 'checkmark-circle' : 'flag-outline'}
                size={20}
                color={questCompleted ? colors.primary : colors.textMuted}
                style={{ marginTop: 1 }}
              />
              <View className="ml-2.5 flex-1">
                <Text className="text-slate-200 text-sm">{template.questDescription}</Text>
                <Text className="text-km-accent text-xs font-semibold mt-1">
                  Giảm {template.questDiscountPercent}% khi hoàn thành
                </Text>
              </View>
            </View>

            {questCompleted && (
              <View className="mt-3 bg-km-primary/10 rounded-xl p-2.5 border border-km-primary/30">
                <Text className="text-km-primary text-xs text-center font-bold">
                  🎉 Bạn được giảm giá từ {template.priceTokens} xuống còn {price} token!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Price & Rank Card */}
        <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4 border border-slate-800 shadow-sm">
          <Text className="text-white font-bold text-base mb-3">Thông tin giá & điều kiện</Text>
          <View className="flex-row items-baseline mb-2">
            {discountedPrice != null && questCompleted && (
              <Text className="text-slate-500 text-lg line-through mr-3">{template.priceTokens} token</Text>
            )}
            <Text className="text-km-accent text-3xl font-extrabold">{price}</Text>
            <Text className="text-slate-300 text-base font-semibold ml-1.5">token</Text>
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-slate-800 mt-2">
            <Text className="text-slate-400 text-xs">Yêu cầu hạng:</Text>
            <Text className="text-white text-xs font-bold uppercase">{template.minRank}+</Text>
          </View>
          <View className="flex-row items-center justify-between pt-2">
            <Text className="text-slate-400 text-xs">Số lượng còn lại:</Text>
            <Text className="text-white text-xs font-bold">{template.remaining}/{template.totalSupply}</Text>
          </View>
        </View>

        {/* QR Code for owned vouchers */}
        {ownedVoucher && (
          <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4 items-center border border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between w-full mb-4">
              <Text className="text-white font-bold text-base">Mã QR sử dụng</Text>
              <View className={`px-2.5 py-0.5 rounded-full ${ownedVoucher.status === 'used' ? 'bg-slate-700' : 'bg-km-primary/20 border border-km-primary/40'}`}>
                <Text className={`text-xs font-semibold ${ownedVoucher.status === 'used' ? 'text-slate-400' : 'text-km-primary'}`}>
                  {ownedVoucher.status === 'used' ? 'Đã sử dụng' : 'Có thể dùng'}
                </Text>
              </View>
            </View>

            <View className="bg-white p-4 rounded-2xl shadow-md">
              <QRCode value={ownedVoucher.qrCode} size={200} />
            </View>

            <Text className="text-slate-400 text-xs mt-3.5 text-center">
              Đưa mã này cho nhân viên {template.storeName} quét để nhận ưu đãi
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!ownedVoucher && (
          <TouchableOpacity
            className="h-14 bg-km-primary rounded-2xl items-center justify-center mb-6 shadow-sm"
            onPress={handleBuy}
            disabled={buying}
            activeOpacity={0.8}
          >
            <Text className="text-slate-900 text-lg font-bold">
              {buying ? 'Đang giao dịch...' : `Đổi voucher — ${price} token`}
            </Text>
          </TouchableOpacity>
        )}

        {ownedVoucher && ownedVoucher.status === 'owned' && !ownedVoucher.giftedFrom && (
          <TouchableOpacity
            className="h-14 bg-km-bg-secondary border border-slate-700 rounded-2xl items-center justify-center flex-row mb-6"
            onPress={() => setShowGiftModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="gift-outline" size={20} color={colors.accent} />
            <Text className="text-white text-base font-bold ml-2">Tặng voucher cho bạn bè</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Gift Voucher Modal (Android + iOS compatible) ── */}
      <Modal visible={showGiftModal} transparent animationType="fade">
        <View className="flex-1 bg-black/75 items-center justify-center px-5">
          <View className="w-full bg-km-bg-secondary border border-slate-700 rounded-3xl p-6 shadow-xl">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-full bg-km-accent/15 items-center justify-center mr-3 border border-km-accent/30">
                <Ionicons name="gift" size={20} color={colors.accent} />
              </View>
              <Text className="text-white text-xl font-bold">Tặng voucher</Text>
            </View>

            <Text className="text-slate-300 text-xs mb-4 leading-5">
              Voucher chỉ được tặng một lần duy nhất. Sau khi tặng, bạn sẽ không còn quyền sử dụng mã này.
            </Text>

            <Text className="text-slate-400 text-xs font-semibold mb-1.5">Chọn nhanh người nhận (Demo):</Text>
            <TouchableOpacity
              className="py-2 px-3 rounded-xl bg-km-bg border border-slate-700 self-start mb-4"
              onPress={() => setRecipientId('user-minh')}
              activeOpacity={0.7}
            >
              <Text className="text-km-primary text-xs font-bold">+ Chọn: Trần Minh (user-minh)</Text>
            </TouchableOpacity>

            <Text className="text-slate-400 text-xs font-semibold mb-1.5">Hoặc nhập User ID người nhận:</Text>
            <View className="bg-km-bg rounded-xl px-4 h-12 border border-slate-700 flex-row items-center mb-5">
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <TextInput
                className="flex-1 text-white text-sm ml-2.5"
                placeholder="VD: user-minh"
                placeholderTextColor={colors.textMuted}
                value={recipientId}
                onChangeText={setRecipientId}
                autoCapitalize="none"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl bg-slate-800 items-center justify-center"
                onPress={() => setShowGiftModal(false)}
                disabled={gifting}
              >
                <Text className="text-slate-300 font-semibold text-sm">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl bg-km-accent items-center justify-center"
                onPress={confirmGift}
                disabled={gifting}
              >
                <Text className="text-white font-bold text-sm">
                  {gifting ? 'Đang tặng...' : 'Xác nhận tặng'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
