import { View, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { colors } from '../../src/theme/colors';
import { useRunnerStore } from '../../src/stores/runner';
import { DAILY_QUEST_KM } from '../../src/api/types';
import type { Run } from '../../src/api/types';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

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
    <Card className="mb-3 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text className="text-muted-foreground text-sm ml-1.5">{formatDate(run.startedAt)}</Text>
          <Text className="text-slate-500 text-sm mx-2">·</Text>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text className="text-muted-foreground text-sm ml-1">{formatTime(run.startedAt)}</Text>
        </View>
        {meetsQuest && (
          <View className="bg-km-primary/20 rounded-full w-7 h-7 items-center justify-center">
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          </View>
        )}
      </View>

      <View className="flex-row justify-between">
        <View className="items-center flex-1">
          <Text className="text-foreground text-lg font-bold">{run.distanceKm.toFixed(1)}</Text>
          <Text className="text-muted-foreground text-xs">km</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-foreground text-lg font-bold">{formatDuration(run.durationMinutes)}</Text>
          <Text className="text-muted-foreground text-xs">thời gian</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-foreground text-lg font-bold">{formatPace(run.avgPaceMinPerKm)}</Text>
          <Text className="text-muted-foreground text-xs">tốc độ</Text>
        </View>
      </View>
    </Card>
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
          className="w-10 h-10 bg-km-bg-secondary border border-border rounded-full items-center justify-center mr-3"
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold">Lịch sử chạy</Text>
      </View>

      <View className="flex-1">
        <FlashList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RunCard run={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState type="runs" message="Chưa có buổi chạy nào" />
          }
        />
      </View>
    </SafeAreaView>
  );
}
