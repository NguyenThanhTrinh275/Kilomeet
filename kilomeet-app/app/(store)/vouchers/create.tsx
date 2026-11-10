import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { RANKS } from '../../../src/api/types';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/stores/auth';
import type { Rank, Store, VoucherTemplate } from '../../../src/api/types';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch kim', kim_cương: 'Kim cương', cao_thủ: 'Cao thủ',
};

const QUEST_OPTIONS = [
  { label: 'Không có', value: '' },
  { label: 'Chạy ngang qua quán', value: 'Chạy ngang qua quán' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-slate-400 text-sm mb-1.5">{label}</Text>
      {children}
    </View>
  );
}

export default function CreateVoucherScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTokens, setPriceTokens] = useState('');
  const [questType, setQuestType] = useState('');
  const [questDiscount, setQuestDiscount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [minRank, setMinRank] = useState<Rank>('đồng');
  const [area, setArea] = useState('');

  const inputClass = 'bg-km-bg-secondary text-white rounded-xl px-4 py-3 text-base';

  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user) as Store | null;

  const inputClass = 'bg-km-bg-secondary text-white rounded-xl px-4 py-3 text-base';

  const handleCreate = useCallback(async () => {
    if (!title || !priceTokens || !quantity || !discountPercent) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    setSubmitting(true);
    try {
      await api.post<VoucherTemplate>('/store/vouchers', {
        title,
        description,
        priceTokens: Number(priceTokens),
        discountPercent: Number(discountPercent),
        questDescription: questType || null,
        questDiscountPercent: questDiscount ? Number(questDiscount) : 0,
        totalSupply: Number(quantity),
        minRank,
        expiresAt: expiryDate
          ? new Date(expiryDate.split('/').reverse().join('-')).toISOString()
          : new Date(Date.now() + 90 * 86400000).toISOString(),
      });
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', (e as Error).message || 'Không thể tạo voucher');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, priceTokens, discountPercent, questType, questDiscount, quantity, minRank, expiryDate, router]);

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-4">Tạo voucher mới</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <Field label="Tiêu đề *">
          <TextInput
            className={inputClass}
            value={title}
            onChangeText={setTitle}
            placeholder="VD: Giảm 20% cà phê"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Mô tả">
          <TextInput
            className={inputClass}
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả chi tiết voucher"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </Field>

        <View className="flex-row">
          <View className="flex-1 mr-2">
            <Field label="Giá (token) *">
              <TextInput
                className={inputClass}
                value={priceTokens}
                onChangeText={setPriceTokens}
                placeholder="50"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </Field>
          </View>
          <View className="flex-1 ml-2">
            <Field label="Giảm giá (%) *">
              <TextInput
                className={inputClass}
                value={discountPercent}
                onChangeText={setDiscountPercent}
                placeholder="20"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </Field>
          </View>
        </View>

        {/* Quest type */}
        <Field label="Loại quest">
          <View className="flex-row">
            {QUEST_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                className="mr-2 px-4 py-2.5 rounded-xl"
                style={{
                  backgroundColor: questType === opt.value ? colors.primary + '20' : colors.bgSecondary,
                  borderWidth: questType === opt.value ? 1 : 0,
                  borderColor: colors.primary,
                }}
                onPress={() => setQuestType(opt.value)}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: questType === opt.value ? colors.primary : colors.textSecondary }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* Quest discount — only if quest selected */}
        {questType !== '' && (
          <Field label="Giảm giá quest (% trên giá token)">
            <TextInput
              className={inputClass}
              value={questDiscount}
              onChangeText={setQuestDiscount}
              placeholder="50"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </Field>
        )}

        <View className="flex-row">
          <View className="flex-1 mr-2">
            <Field label="Số lượng *">
              <TextInput
                className={inputClass}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </Field>
          </View>
          <View className="flex-1 ml-2">
            <Field label="Hạn sử dụng">
              <TextInput
                className={inputClass}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="31/12/2026"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
          </View>
        </View>

        {/* Min rank selector */}
        <Field label="Hạng tối thiểu">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {RANKS.map((rank) => {
                const isSelected = minRank === rank;
                const rankColor = colors.rank[rank];
                return (
                  <TouchableOpacity
                    key={rank}
                    className="mr-2 px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: isSelected ? rankColor + '20' : colors.bgSecondary,
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: rankColor,
                    }}
                    onPress={() => setMinRank(rank)}
                  >
                    <Text className="text-sm font-semibold" style={{ color: isSelected ? rankColor : colors.textSecondary }}>
                      {RANK_LABELS[rank]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Field>

        <Field label="Khu vực">
          <TextInput
            className={inputClass}
            value={area}
            onChangeText={setArea}
            placeholder="VD: Quận 1, TP.HCM"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        {/* Preview Card */}
        <Text className="text-slate-400 text-sm mb-2 mt-2">Xem trước</Text>
        <View className="bg-km-bg-secondary rounded-xl overflow-hidden mb-4">
          <View className="h-1 bg-km-accent" />
          <View className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-slate-400 text-xs mb-1">Cà phê Sài Gòn</Text>
                <Text className="text-white text-base font-semibold">{title || 'Tiêu đề voucher'}</Text>
              </View>
              <View
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: colors.rank[minRank] + '20' }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.rank[minRank] }}>
                  {RANK_LABELS[minRank]}+
                </Text>
              </View>
            </View>

            {questType !== '' && (
              <View className="flex-row items-center mb-3 bg-km-surface/50 rounded-lg p-2">
                <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                <Text className="text-slate-400 text-xs ml-2 flex-1">{questType}</Text>
              </View>
            )}

            <View className="flex-row items-center">
              <Ionicons name="pricetag" size={16} color={colors.accent} />
              <Text className="text-white text-lg font-bold ml-2">{priceTokens || '0'}</Text>
              <Text className="text-slate-400 text-xs ml-1">token</Text>
              {discountPercent ? (
                <Text className="text-km-primary text-sm font-bold ml-3">-{discountPercent}%</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          className="bg-km-primary rounded-xl py-4 items-center mb-8"
          activeOpacity={0.7}
          onPress={handleCreate}
        >
          <Text className="text-km-bg font-bold text-base">Tạo voucher</Text>
        </TouchableOpacity>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
