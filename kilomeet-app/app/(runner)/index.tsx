import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatsCard } from '../../src/components/runner/StatsCard';
import { QuestCard } from '../../src/components/runner/QuestCard';
import { RankProgress } from '../../src/components/runner/RankProgress';
import { colors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/stores/auth';
import { useRunnerStore } from '../../src/stores/runner';
import { RANK_TOKEN_RETENTION } from '../../src/api/types';
import type { Runner, Rank } from '../../src/api/types';

export default function RunnerHome() {
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user) as Runner | null;
  const { tokenBalance, rank, kmThisWeek, quests, runs, syncFromUser, fetchQuests, fetchRuns } =
    useRunnerStore();

  useEffect(() => {
    if (user) {
      syncFromUser(user);
      fetchQuests();
      fetchRuns();
    }
  }, [user, syncFromUser, fetchQuests, fetchRuns]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchQuests(), fetchRuns()]);
    setRefreshing(false);
  }, [fetchQuests, fetchRuns]);

  const seasonDaysLeft = 45; // ponytail: hardcoded until season API; add when /season endpoint exists
  const retentionCap = RANK_TOKEN_RETENTION[rank];
  const showBurnWarning = tokenBalance > retentionCap;

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
              <Text className="text-white text-2xl font-bold">{user?.name ?? 'Runner'} 👋</Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 bg-km-bg-secondary rounded-full items-center justify-center"
              onPress={() => Alert.alert('Thông báo', 'Chưa có thông báo mới')}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Season banner */}
        <View className="mx-5 mb-5 bg-km-primary/10 border border-km-primary/30 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text className="text-km-primary font-semibold ml-2">Mùa 3/2026</Text>
            <Text className="text-slate-400 text-xs ml-auto">Còn {seasonDaysLeft} ngày</Text>
          </View>
        </View>

        {/* Token burn warning */}
        {showBurnWarning && (
          <View className="mx-5 mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <Text className="text-red-400 text-sm font-semibold">
              ⚠ Bạn đang giữ {tokenBalance} token — hạng {rank} chỉ giữ tối đa {retentionCap} khi kết mùa.
              Hãy dùng token trước khi mùa kết thúc!
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View className="flex-row gap-3 px-5 mb-5">
          <StatsCard icon="footsteps" value={`${kmThisWeek.toFixed(1)}`} label="km tuần này" color={colors.primary} />
          <StatsCard icon="flame" value={`${runs.length}`} label="buổi chạy" color={colors.accent} />
          <StatsCard icon="analytics" value={`${tokenBalance}`} label="token" color={colors.info} />
        </View>

        {/* Rank Progress */}
        <View className="px-5 mb-5">
          <RankProgress
            rank={rank}
            weeklyKm={kmThisWeek}
            tokenBalance={tokenBalance}
            seasonDaysLeft={seasonDaysLeft}
          />
        </View>

        {/* Start Run CTA */}
        {/* Start Run & History CTAs */}
        <View className="px-5 mb-5 gap-3">
          <TouchableOpacity
            className="h-16 bg-km-primary rounded-2xl flex-row items-center justify-center"
            onPress={() => router.push('/(runner)/run')}
          >
            <Ionicons name="play-circle" size={28} color={colors.white} />
            <Text className="text-white text-lg font-bold ml-3">Bắt đầu chạy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 bg-km-bg-secondary rounded-2xl flex-row items-center justify-center"
            onPress={() => router.push('/(runner)/history')}
          >
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text className="text-white font-semibold ml-2">Lịch sử chạy</Text>
          </TouchableOpacity>
        </View>

        {/* Quests */}
        <View className="px-5">
          <Text className="text-white text-lg font-bold mb-3">Nhiệm vụ</Text>
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              type={quest.type}
              title={quest.type === 'daily' ? 'Chạy hàng ngày' : 'Nhiệm vụ tuần'}
              requirement={
                quest.type === 'daily'
                  ? `Chạy ít nhất ${quest.targetKm} km`
                  : `Chạy ${quest.targetKm} km trong tuần`
              }
              reward={quest.rewardTokens}
              progress={quest.progressKm}
              target={quest.targetKm}
              completed={quest.status === 'completed'}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
