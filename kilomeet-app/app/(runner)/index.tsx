import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatsCard } from '../../src/components/runner/StatsCard';
import { QuestCard } from '../../src/components/runner/QuestCard';
import { RankProgress } from '../../src/components/runner/RankProgress';
import { colors } from '../../src/theme/colors';

// ponytail: hardcoded demo data — swap with Zustand store when API layer ready
const MOCK = {
  name: 'Minh',
  rank: 'cao_thủ' as const,
  tokenBalance: 1000,
  weeklyKm: 38.5,
  totalKm: 342.8,
  totalRuns: 47,
  streak: 12,
  seasonDaysLeft: 45,
  quests: [
    {
      id: '1',
      type: 'daily' as const,
      title: 'Chạy hàng ngày',
      requirement: 'Chạy ít nhất 2 km',
      reward: 10,
      progress: 0,
      target: 2,
      completed: false,
    },
    {
      id: '2',
      type: 'weekly' as const,
      title: 'Nhiệm vụ tuần',
      requirement: 'Chạy 42 km trong tuần (trung bình + 10%)',
      reward: 294,
      progress: 38.5,
      target: 42,
      completed: false,
    },
  ],
};

export default function RunnerHome() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-slate-400 text-sm">Xin chào,</Text>
              <Text className="text-white text-2xl font-bold">{MOCK.name} 👋</Text>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-km-bg-secondary rounded-full items-center justify-center">
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Season banner */}
        <View className="mx-5 mb-5 bg-km-primary/10 border border-km-primary/30 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text className="text-km-primary font-semibold ml-2">Mùa 3/2026</Text>
            <Text className="text-slate-400 text-xs ml-auto">Còn {MOCK.seasonDaysLeft} ngày</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3 px-5 mb-5">
          <StatsCard icon="footsteps" value={`${MOCK.weeklyKm}`} label="km tuần này" color={colors.primary} />
          <StatsCard icon="flame" value={`${MOCK.streak}`} label="ngày liên tiếp" color={colors.accent} />
          <StatsCard icon="analytics" value={`${MOCK.totalRuns}`} label="buổi chạy" color={colors.info} />
        </View>

        {/* Rank Progress */}
        <View className="px-5 mb-5">
          <RankProgress
            rank={MOCK.rank}
            weeklyKm={MOCK.weeklyKm}
            tokenBalance={MOCK.tokenBalance}
            seasonDaysLeft={MOCK.seasonDaysLeft}
          />
        </View>

        {/* Start Run CTA */}
        <View className="px-5 mb-5">
          <TouchableOpacity
            className="h-16 bg-km-primary rounded-2xl flex-row items-center justify-center"
            onPress={() => router.push('/(runner)/run')}
          >
            <Ionicons name="play-circle" size={28} color={colors.white} />
            <Text className="text-white text-lg font-bold ml-3">Bắt đầu chạy</Text>
          </TouchableOpacity>
        </View>

        {/* Quests */}
        <View className="px-5">
          <Text className="text-white text-lg font-bold mb-3">Nhiệm vụ</Text>
          {MOCK.quests.map((quest) => (
            <QuestCard key={quest.id} {...quest} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
