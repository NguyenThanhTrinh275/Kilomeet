import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { RANK_INDEX } from '../../../src/api/types';
import type { VoucherTemplate } from '../../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  AppBottomSheet,
  BottomSheetModal,
  BottomSheetTextInput,
} from '@/components/ui/bottom-sheet';

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templates = useVoucherStore((s) => s.templates);
  const myVouchers = useVoucherStore((s) => s.myVouchers);
  const buyVoucher = useVoucherStore((s) => s.buyVoucher);
  const giftVoucher = useVoucherStore((s) => s.giftVoucher);
  const fetchMyVouchers = useVoucherStore((s) => s.fetchMyVouchers);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const rank = useRunnerStore((s) => s.rank);
  const runs = useRunnerStore((s) => s.runs);

  const giftSheetRef = useRef<BottomSheetModal>(null);
  const [recipientId, setRecipientId] = useState('');
  const [gifting, setGifting] = useState(false);
  const [buying, setBuying] = useState(false);

  const ownedVoucher = myVouchers.find((v) => v.id === id);
  const template: VoucherTemplate | undefined =
    templates.find((t) => t.id === id) ?? ownedVoucher?.template;

  if (!template) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center px-6 gap-3" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text className="text-muted-foreground">Không tìm thấy voucher</Text>
        <Button variant="secondary" onPress={() => router.back()}>
          <Text>Quay lại</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const passedStoreIds = runs.flatMap((r) => r.passedStoreIds || []);
  const hasPassedStore = passedStoreIds.includes(template.storeId);
  const questCompleted = ownedVoucher?.questCompletedAt != null || hasPassedStore;

  const hasQuestDiscount = template.questDiscountPercent > 0 && template.questDescription;
  const discountedPrice = hasQuestDiscount
    ? Math.round(template.priceTokens * (1 - template.questDiscountPercent / 100))
    : null;

  const price = questCompleted && discountedPrice != null ? discountedPrice : template.priceTokens;

  const handleBuy = async () => {
    if (RANK_INDEX[rank] < RANK_INDEX[template.minRank]) {
      toast.warning('Chưa đủ hạng', {
        description: `Cần đạt từ hạng ${template.minRank.toUpperCase()} trở lên để mua voucher này.`,
      });
      return;
    }
    if (tokenBalance < price) {
      toast.warning('Không đủ token', {
        description: `Bạn cần ${price} token nhưng hiện có ${tokenBalance} token.`,
      });
      return;
    }

    setBuying(true);
    try {
      await buyVoucher(template.id, questCompleted);
      useRunnerStore.setState({ tokenBalance: tokenBalance - price });
      await fetchMyVouchers();
      toast.success('Mua thành công 🎉', {
        description: `Đã đổi ${price} token lấy voucher "${template.title}".`,
        action: {
          label: 'Xem mã QR',
          onClick: () => router.replace('/(runner)/vouchers'),
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể mua voucher';
      toast.error('Lỗi mua voucher', { description: msg });
    } finally {
      setBuying(false);
    }
  };

  const confirmGift = async () => {
    if (!ownedVoucher) return;
    const trimmed = recipientId.trim();
    if (!trimmed) {
      toast.warning('Thiếu thông tin', {
        description: 'Vui lòng nhập ID hoặc chọn tài khoản người nhận.',
      });
      return;
    }

    setGifting(true);
    try {
      await giftVoucher(ownedVoucher.id, trimmed);
      await fetchMyVouchers();
      giftSheetRef.current?.dismiss();
      toast.success('Đã tặng thành công 🎉', {
        description: `Voucher đã được chuyển quyền sở hữu cho ${trimmed}.`,
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể tặng voucher';
      toast.error('Lỗi tặng voucher', { description: msg });
    } finally {
      setGifting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-km-bg-secondary">
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold flex-1">Chi tiết voucher</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Store info card */}
        <Card className="mb-4 gap-3">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-km-accent/15 rounded-xl items-center justify-center mr-3 border border-km-accent/30">
              <Ionicons name="storefront" size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{template.storeName}</Text>
              <Text className="text-muted-foreground text-xs mt-0.5">HSD: {template.expiresAt.slice(0, 10)}</Text>
            </View>
          </View>

          <View className="gap-1">
            <Text className="text-white text-xl font-bold">{template.title}</Text>
            <Text className="text-slate-300 text-sm leading-5">{template.description}</Text>
          </View>
        </Card>

        {/* Quest Info Card */}
        {template.questDescription && (
          <Card className="mb-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold text-base">Nhiệm vụ giảm giá</Text>
              <Badge variant={questCompleted ? 'default' : 'secondary'}>
                <Text>{questCompleted ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}</Text>
              </Badge>
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
              <View className="bg-km-primary/10 rounded-xl p-2.5 border border-km-primary/30">
                <Text className="text-km-primary text-xs text-center font-bold">
                  🎉 Bạn được giảm giá từ {template.priceTokens} xuống còn {price} token!
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Price & Rank Card */}
        <Card className="mb-4 gap-3">
          <Text className="text-white font-bold text-base">Thông tin giá & điều kiện</Text>
          <View className="flex-row items-baseline">
            {discountedPrice != null && questCompleted && (
              <Text className="text-slate-500 text-lg line-through mr-3">{template.priceTokens} token</Text>
            )}
            <Text className="text-km-accent text-3xl font-extrabold">{price}</Text>
            <Text className="text-slate-300 text-base font-semibold ml-1.5">token</Text>
          </View>

          <Separator />

          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-xs">Yêu cầu hạng:</Text>
            <Text className="text-white text-xs font-bold uppercase">{template.minRank}+</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-xs">Số lượng còn lại:</Text>
            <Text className="text-white text-xs font-bold">{template.remaining}/{template.totalSupply}</Text>
          </View>
        </Card>

        {/* QR Code for owned vouchers */}
        {ownedVoucher && (
          <Card className="mb-4 items-center gap-4">
            <View className="flex-row items-center justify-between w-full">
              <Text className="text-white font-bold text-base">Mã QR sử dụng</Text>
              <Badge variant={ownedVoucher.status === 'used' ? 'secondary' : 'default'}>
                <Text>{ownedVoucher.status === 'used' ? 'Đã sử dụng' : 'Có thể dùng'}</Text>
              </Badge>
            </View>

            <View className="bg-white p-4 rounded-2xl shadow-md">
              <QRCode value={ownedVoucher.qrCode} size={200} />
            </View>

            <Text className="text-muted-foreground text-xs text-center">
              Đưa mã này cho nhân viên {template.storeName} quét để nhận ưu đãi
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        {!ownedVoucher && (
          <Button size="lg" className="mb-6" onPress={handleBuy} disabled={buying}>
            <Text>{buying ? 'Đang giao dịch...' : `Đổi voucher — ${price} token`}</Text>
          </Button>
        )}

        {ownedVoucher && ownedVoucher.status === 'owned' && !ownedVoucher.giftedFrom && (
          <Button
            variant="outline"
            size="lg"
            className="mb-6"
            onPress={() => giftSheetRef.current?.present()}>
            <Ionicons name="gift-outline" size={20} color={colors.accent} />
            <Text>Tặng voucher cho bạn bè</Text>
          </Button>
        )}
      </ScrollView>

      {ownedVoucher && ownedVoucher.status === 'owned' && !ownedVoucher.giftedFrom && (
        <AppBottomSheet ref={giftSheetRef}>
        <View className="gap-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-km-accent/15 items-center justify-center mr-3 border border-km-accent/30">
              <Ionicons name="gift" size={20} color={colors.accent} />
            </View>
            <Text className="text-white text-xl font-bold">Tặng voucher</Text>
          </View>

          <Text className="text-slate-300 text-xs leading-5">
            Voucher chỉ được tặng một lần duy nhất. Sau khi tặng, bạn sẽ không còn quyền sử dụng mã này.
          </Text>

          <View className="gap-1.5">
            <Label>Chọn nhanh người nhận (Demo):</Label>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onPress={() => setRecipientId('user-minh')}>
              <Text className="text-km-primary">+ Chọn: Trần Minh (user-minh)</Text>
            </Button>
          </View>

          <View className="gap-1.5">
            <Label>Hoặc nhập User ID người nhận:</Label>
            <View className="bg-km-bg rounded-xl px-4 h-12 border border-border flex-row items-center">
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <BottomSheetTextInput
                className="flex-1 text-white text-sm ml-2.5"
                placeholder="VD: user-minh"
                placeholderTextColor={colors.textMuted}
                value={recipientId}
                onChangeText={setRecipientId}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="flex-row gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => giftSheetRef.current?.dismiss()}
              disabled={gifting}>
              <Text>Huỷ</Text>
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              onPress={confirmGift}
              disabled={gifting}>
              <Text>{gifting ? 'Đang tặng...' : 'Xác nhận tặng'}</Text>
            </Button>
          </View>
        </View>
        </AppBottomSheet>
      )}
    </SafeAreaView>
  );
}
