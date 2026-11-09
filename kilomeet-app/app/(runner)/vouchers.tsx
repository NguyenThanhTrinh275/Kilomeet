import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VoucherCard } from '../../src/components/voucher/VoucherCard';
import { colors } from '../../src/theme/colors';

// ponytail: mock vouchers — swap with Zustand store when API layer ready
const MOCK_VOUCHERS = [
  {
    id: 'v1',
    storeName: 'Cà Phê Bách Khoa',
    title: 'Giảm 20% nước uống',
    originalPrice: 500,
    discountedPrice: 250,
    questDescription: 'Chạy ngang qua quán',
    questCompleted: true,
    minRank: 'bạc',
  },
  {
    id: 'v2',
    storeName: 'Trà Sữa TocoToco',
    title: 'Mua 1 tặng 1',
    originalPrice: 800,
    discountedPrice: 400,
    questDescription: 'Chạy ngang qua quán',
    questCompleted: false,
    minRank: 'vàng',
  },
  {
    id: 'v3',
    storeName: 'Bánh Mì Huỳnh Hoa',
    title: 'Giảm 15.000đ',
    originalPrice: 300,
    questDescription: undefined,
    questCompleted: false,
    minRank: 'đồng',
  },
  {
    id: 'v4',
    storeName: 'GYM Fitness 24/7',
    title: '1 buổi tập miễn phí',
    originalPrice: 1200,
    discountedPrice: 600,
    questDescription: 'Chạy ngang qua phòng tập',
    questCompleted: false,
    minRank: 'bạch_kim',
  },
  {
    id: 'v5',
    storeName: 'Highlands Coffee',
    title: 'Giảm 30% Phin Sữa Đá',
    originalPrice: 400,
    discountedPrice: 200,
    questDescription: 'Chạy ngang qua quán',
    questCompleted: true,
    minRank: 'bạc',
  },
];

export default function VouchersScreen() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const filtered = MOCK_VOUCHERS.filter(
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
        {filtered.map((v) => (
          <VoucherCard
            key={v.id}
            {...v}
            onPress={() => router.push(`/(runner)/voucher/${v.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <View className="items-center py-12">
            <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
            <Text className="text-slate-400 mt-3">Không tìm thấy voucher</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
