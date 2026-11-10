import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useRunnerStore } from '../../src/stores/runner';
import { DAILY_QUEST_KM } from '../../src/api/types';
import type { Run } from '../../src/api/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(pace: number): string {
  if (!pace || !isFinite(pace)) return '--:-- /km';
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function RunCard({ run }: { run: Run }) {
  const meetsQuest = run.distanceKm >= DAILY_QUEST_KM;

  return (
    <View className="bg-km-bg-secondary rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text className="text-slate-400 text-sm ml-1.5">{formatDate(run.startedAt)}</Text>
          <Text className="text-slate-500 text-sm mx-2">·</Text>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text className="text-slate-400 text-sm ml-1">{formatTime(run.startedAt)}</Text>
        </View>
        {meetsQuest && (
          <View className="bg-km-primary/20 rounded-full w-7 h-7 items-center justify-center">
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          </View>
        )}
      </View>

      <View className="flex-row justify-between">
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-bold">{run.distanceKm.toFixed(1)}</Text>
          <Text className="text-slate-400 text-xs">km</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-bold">{formatDuration(run.durationMinutes)}</Text>
          <Text className="text-slate-400 text-xs">thời gian</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-bold">{formatPace(run.avgPaceMinPerKm)}</Text>
          <Text className="text-slate-400 text-xs">tốc độ</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { runs, fetchRuns } = useRunnerStore();

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const sorted = [...runs].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRuns();
    setRefreshing(false);
  }, [fetchRuns]);

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <TouchableOpacity
          className="w-10 h-10 bg-km-bg-secondary rounded-full items-center justify-center mr-3"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Lịch sử chạy</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RunCard run={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Ionicons name="fitness-outline" size={64} color={colors.textMuted} />
            <Text className="text-slate-400 text-base mt-4">Chưa có buổi chạy nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
