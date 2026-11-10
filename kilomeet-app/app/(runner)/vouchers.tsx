import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VoucherCard } from '../../src/components/voucher/VoucherCard';
import { colors } from '../../src/theme/colors';
import { useVoucherStore } from '../../src/stores/voucher';

export default function VouchersScreen() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const { templates, myVouchers, isLoading, fetchTemplates, fetchMyVouchers } = useVoucherStore();

  useEffect(() => {
    fetchTemplates();
    fetchMyVouchers();
  }, [fetchTemplates, fetchMyVouchers]);

  const items = tab === 'all'
    ? templates.map((t) => ({
        id: t.id,
        storeName: t.storeName,
        title: t.title,
        originalPrice: t.priceTokens,
        discountedPrice: t.questDiscountPercent > 0
          ? Math.round(t.priceTokens * (1 - t.questDiscountPercent / 100))
          : undefined,
        questDescription: t.questDescription ?? undefined,
        questCompleted: false,
        minRank: t.minRank,
      }))
    : myVouchers.map((v) => ({
        id: v.id,
        storeName: v.template.storeName,
        title: v.template.title,
        originalPrice: v.template.priceTokens,
        discountedPrice: v.paidTokens < v.template.priceTokens ? v.paidTokens : undefined,
        questDescription: v.template.questDescription ?? undefined,
        questCompleted: v.questCompletedAt != null,
        minRank: v.template.minRank,
      }));

  const filtered = items.filter(
    (v) => v.storeName.toLowerCase().includes(search.toLowerCase()) ||
           v.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold mb-4">Voucher</Text>

        {/* Tabs */}
        <View className="flex-row gap-2 mb-4">
          {(['all', 'mine'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`px-4 py-2 rounded-full ${tab === t ? 'bg-km-primary' : 'bg-km-surface'}`}
              onPress={() => setTab(t)}
            >
              <Text className={`text-sm font-semibold ${tab === t ? 'text-white' : 'text-slate-400'}`}>
                {t === 'all' ? 'Khám phá' : 'Của tôi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-12 border border-km-surface-light">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            className="flex-1 text-white text-sm ml-2"
            placeholder="Tìm cửa hàng, voucher..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Voucher list */}
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} className="mt-12" />
        ) : (
          <>
            {filtered.map((v) => (
              <VoucherCard
                key={v.id}
                {...v}
                onPress={() => router.push(
                  tab === 'mine'
                    ? `/(runner)/voucher/${v.id}?owned=1`
                    : `/(runner)/voucher/${v.id}`,
                )}
              />
            ))}
            {filtered.length === 0 && (
              <View className="items-center py-12">
                <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
                <Text className="text-slate-400 mt-3">Không tìm thấy voucher</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
