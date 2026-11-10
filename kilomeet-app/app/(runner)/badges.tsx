import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { colors } from '../../src/theme/colors';
import { RankBadge } from '../../src/components/common/RankBadge';
import type { Rank, Runner } from '../../src/api/types';

const RANK_LABELS: Record<Rank, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'Bạch Kim',
  kim_cương: 'Kim Cương',
  cao_thủ: 'Cao Thủ',
};

interface SeasonBadge {
  season: string;
  period: string;
  highestRank: Rank;
}

// ponytail: mock until API has season history
const PAST_SEASONS: SeasonBadge[] = [
  { season: 'Mùa 2/2026', period: 'Tháng 5-8', highestRank: 'kim_cương' },
  { season: 'Mùa 1/2026', period: 'Tháng 1-4', highestRank: 'bạch_kim' },
];

export default function BadgesScreen() {
  const user = useAuthStore((s) => s.user);
  const isRunner = user?.role === 'runner' || user?.role === 'member';
  const currentBadge = isRunner ? (user as Runner).seasonBadge : null;

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-3">Huy hiệu mùa</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Current Season ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          <Text className="text-white text-base font-semibold mb-3">Mùa 3/2026</Text>
          {currentBadge ? (
            <View className="items-center py-4">
              <RankBadge rank={currentBadge} size="lg" />
              <Text
                className="text-sm font-semibold mt-2"
                style={{ color: colors.rank[currentBadge] }}
              >
                {RANK_LABELS[currentBadge]}
              </Text>
            </View>
          ) : (
            <Text className="text-km-muted text-sm py-4 text-center">
              Chưa đạt huy hiệu mùa này
            </Text>
          )}
        </View>

        {/* ── Past Seasons ── */}
        <View className="mx-4 p-4 rounded-2xl bg-km-surface-dark mb-4">
          <Text className="text-white text-base font-semibold mb-3">Các mùa trước</Text>
          {PAST_SEASONS.map((s) => (
            <View
              key={s.season}
              className="flex-row items-center py-3 border-b border-km-border last:border-b-0"
            >
              <RankBadge rank={s.highestRank} size="md" />
              <View className="ml-3 flex-1">
                <Text className="text-white text-sm font-semibold">{s.season}</Text>
                <Text className="text-km-secondary text-xs">{s.period}</Text>
              </View>
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.rank[s.highestRank] }}
              >
                {RANK_LABELS[s.highestRank]}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Info Note ── */}
        <View className="mx-4 flex-row items-start p-3 rounded-xl bg-km-surface-dark">
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text className="text-km-muted text-xs ml-2 flex-1">
            Huy hiệu ghi lại hạng cao nhất bạn đạt được mỗi mùa. Thành tích không mất khi reset.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
