import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { RANKS, RANK_KM_THRESHOLD, RANK_TOKEN_RETENTION } from '../../src/api/types';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch Kim', kim_cương: 'Kim Cương', cao_thủ: 'Cao Thủ',
};

// Mock data
const MOCK_SEASON = {
  id: 's2',
  name: 'Mùa 2 — Thu 2026',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  isActive: true,
};

export default function SeasonScreen() {
  const router = useRouter();
  const [season, setSeason] = useState(MOCK_SEASON);
  const [closeModal, setCloseModal] = useState(false);
  const [newModal, setNewModal] = useState(false);

  const daysLeft = Math.max(0, Math.ceil((new Date(season.endDate).getTime() - Date.now()) / 86_400_000));

  function handleCloseSeason() {
    setSeason((s) => ({ ...s, isActive: false }));
    setCloseModal(false);
  }

  function handleNewSeason() {
    setSeason({
      id: 's3',
      name: 'Mùa 3 — Xuân 2027',
      startDate: '2027-01-01',
      endDate: '2027-04-30',
      isActive: true,
    });
    setNewModal(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Quản lý mùa</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Current Season Card */}
        <View className="bg-km-bg-secondary rounded-2xl p-4 mt-2 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="trophy" size={22} color={colors.accent} />
            <Text className="text-white text-lg font-bold ml-2 flex-1">{season.name}</Text>
            {season.isActive ? (
              <View className="bg-km-primary/20 px-2.5 py-1 rounded-md">
                <Text className="text-km-primary text-xs font-semibold">Đang diễn ra</Text>
              </View>
            ) : (
              <View className="bg-red-500/20 px-2.5 py-1 rounded-md">
                <Text className="text-red-400 text-xs font-semibold">Đã kết thúc</Text>
              </View>
            )}
          </View>

          <View className="flex-row mb-1">
            <Text className="text-slate-400 text-sm w-24">Bắt đầu:</Text>
            <Text className="text-white text-sm">{new Date(season.startDate).toLocaleDateString('vi-VN')}</Text>
          </View>
          <View className="flex-row mb-1">
            <Text className="text-slate-400 text-sm w-24">Kết thúc:</Text>
            <Text className="text-white text-sm">{new Date(season.endDate).toLocaleDateString('vi-VN')}</Text>
          </View>
          {season.isActive && (
            <View className="flex-row">
              <Text className="text-slate-400 text-sm w-24">Còn lại:</Text>
              <Text className="text-km-accent text-sm font-semibold">{daysLeft} ngày</Text>
            </View>
          )}
        </View>

        {/* Rank Thresholds */}
        <Text className="text-white text-base font-bold mb-3">Ngưỡng rank (km/tuần)</Text>
        <View className="bg-km-bg-secondary rounded-2xl overflow-hidden mb-4">
          {RANKS.map((rank, i) => (
            <View
              key={rank}
              className={`flex-row items-center px-4 py-3 ${i < RANKS.length - 1 ? 'border-b border-km-surface' : ''}`}
            >
              <View
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: colors.rank[rank] }}
              />
              <Text className="text-white text-sm flex-1">{RANK_LABELS[rank]}</Text>
              <Text className="text-slate-400 text-sm font-mono">≥ {RANK_KM_THRESHOLD[rank]} km</Text>
            </View>
          ))}
        </View>

        {/* Token Retention */}
        <Text className="text-white text-base font-bold mb-3">Giữ lại token cuối mùa</Text>
        <View className="bg-km-bg-secondary rounded-2xl overflow-hidden mb-4">
          {RANKS.map((rank, i) => (
            <View
              key={rank}
              className={`flex-row items-center px-4 py-3 ${i < RANKS.length - 1 ? 'border-b border-km-surface' : ''}`}
            >
              <View
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: colors.rank[rank] }}
              />
              <Text className="text-white text-sm flex-1">{RANK_LABELS[rank]}</Text>
              <Text className="text-slate-400 text-sm font-mono">{RANK_TOKEN_RETENTION[rank]} token</Text>
            </View>
          ))}
        </View>

        {/* Quest Rewards */}
        <Text className="text-white text-base font-bold mb-3">Phần thưởng nhiệm vụ</Text>
        <View className="bg-km-bg-secondary rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="walk-outline" size={18} color={colors.primary} />
            <Text className="text-white text-sm ml-2 flex-1">Nhiệm vụ ngày (chạy 2km)</Text>
            <Text className="text-km-accent text-sm font-semibold">+10 token</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={18} color={colors.info} />
            <Text className="text-white text-sm ml-2 flex-1">Nhiệm vụ tuần (mỗi km)</Text>
            <Text className="text-km-accent text-sm font-semibold">+7 token/km</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {season.isActive ? (
          <TouchableOpacity
            className="bg-red-500/20 border border-red-500/30 rounded-2xl py-4 items-center"
            activeOpacity={0.7}
            onPress={() => setCloseModal(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={20} color={colors.error} />
              <Text className="text-red-400 text-base font-bold ml-2">Đóng mùa</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-km-primary rounded-2xl py-4 items-center"
            activeOpacity={0.7}
            onPress={() => setNewModal(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text className="text-white text-base font-bold ml-2">Mở mùa mới</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Close Season Modal */}
      <Modal visible={closeModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-km-bg-secondary rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <Ionicons name="warning" size={48} color={colors.warning} />
            </View>
            <Text className="text-white text-lg font-bold text-center mb-3">
              Đóng mùa hiện tại?
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-4">
              Khi đóng mùa, các thay đổi sau sẽ diễn ra:
            </Text>

            <View className="bg-km-surface/50 rounded-xl p-3 mb-4">
              <View className="flex-row items-start mb-2.5">
                <Ionicons name="arrow-down" size={16} color={colors.error} />
                <Text className="text-slate-300 text-sm ml-2 flex-1">
                  Rank giảm 2 bậc (ví dụ: Kim Cương → Vàng)
                </Text>
              </View>
              <View className="flex-row items-start mb-2.5">
                <Ionicons name="wallet-outline" size={16} color={colors.warning} />
                <Text className="text-slate-300 text-sm ml-2 flex-1">
                  Token bị giới hạn theo rank (Đồng: 0, Bạc: 100, Vàng: 200, ...)
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                <Text className="text-slate-300 text-sm ml-2 flex-1">
                  Voucher đã sở hữu được giữ nguyên
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-km-surface rounded-xl py-3 items-center"
                onPress={() => setCloseModal(false)}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-semibold">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3 items-center"
                onPress={handleCloseSeason}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-bold">Đóng mùa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Season Modal */}
      <Modal visible={newModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-km-bg-secondary rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <Ionicons name="sunny" size={48} color={colors.accent} />
            </View>
            <Text className="text-white text-lg font-bold text-center mb-2">
              Mở mùa mới?
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6">
              Mùa mới sẽ bắt đầu và runner có thể thăng hạng trở lại.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-km-surface rounded-xl py-3 items-center"
                onPress={() => setNewModal(false)}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-semibold">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-km-primary rounded-xl py-3 items-center"
                onPress={handleNewSeason}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-bold">Mở mùa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
