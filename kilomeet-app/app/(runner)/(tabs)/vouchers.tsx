import { View, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { VoucherCard } from '../../../src/components/voucher/VoucherCard';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { colors } from '../../../src/theme/colors';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function VouchersScreen() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const { templates, myVouchers, isLoading, fetchTemplates, fetchMyVouchers } = useVoucherStore();
  const runs = useRunnerStore((s) => s.runs);
  const passedStoreIds = runs.flatMap((r) => r.passedStoreIds || []);

  useEffect(() => {
    fetchTemplates();
    fetchMyVouchers();
  }, [fetchTemplates, fetchMyVouchers]);

  const items =
    tab === 'all'
      ? templates.map((t) => ({
          id: t.id,
          storeName: t.storeName,
          title: t.title,
          originalPrice: t.priceTokens,
          discountedPrice:
            t.questDiscountPercent > 0
              ? Math.round(t.priceTokens * (1 - t.questDiscountPercent / 100))
              : undefined,
          questDescription: t.questDescription ?? undefined,
          questCompleted: passedStoreIds.includes(t.storeId),
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
    (v) =>
      v.storeName.toLowerCase().includes(search.toLowerCase()) ||
      v.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 gap-4">
        <Text className="text-white text-2xl font-bold">Voucher</Text>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'mine')}>
          <TabsList className="w-full">
            <TabsTrigger value="all">
              <Text>Khám phá</Text>
            </TabsTrigger>
            <TabsTrigger value="mine">
              <Text>Của tôi</Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-12 border border-border">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Input
            className="flex-1 border-0 bg-transparent px-2 h-full text-sm shadow-none"
            placeholder="Tìm cửa hàng, voucher..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Voucher list */}
      <View className="flex-1">
        {isLoading ? (
          <View className="px-5 gap-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </View>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <VoucherCard
                {...item}
                onPress={() =>
                  router.push(
                    tab === 'mine'
                      ? `/(runner)/voucher/${item.id}?owned=1`
                      : `/(runner)/voucher/${item.id}`,
                  )
                }
              />
            )}
            ListEmptyComponent={
              <EmptyState type="vouchers" message="Không tìm thấy voucher" />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
