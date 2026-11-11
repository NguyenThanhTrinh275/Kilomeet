import { View } from 'react-native';
import { colors } from '../../theme/colors';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng',
  bạc: 'Bạc',
  vàng: 'Vàng',
  bạch_kim: 'Bạch kim',
  kim_cương: 'Kim cương',
  cao_thủ: 'Cao thủ',
};

const RANK_THRESHOLDS: Record<string, number> = {
  đồng: 0,
  bạc: 5,
  vàng: 10,
  bạch_kim: 15,
  kim_cương: 25,
  cao_thủ: 40,
};

type Props = {
  rank: string;
  weeklyKm: number;
  tokenBalance: number;
  seasonDaysLeft: number;
};

export function RankProgress({ rank, weeklyKm, tokenBalance, seasonDaysLeft }: Props) {
  const rankColor = colors.rank[rank as keyof typeof colors.rank] || colors.textMuted;
  const rankLabel = RANK_LABELS[rank] || rank;
  const threshold = RANK_THRESHOLDS[rank] || 0;
  const progressPct = threshold > 0 ? Math.min((weeklyKm / threshold) * 100, 100) : 100;

  const ranks = Object.keys(RANK_THRESHOLDS);
  const currentIdx = ranks.indexOf(rank);
  const nextRank = currentIdx < ranks.length - 1 ? ranks[currentIdx + 1] : null;
  const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : null;
  const kmToNextRank = nextThreshold ? Math.max(nextThreshold - weeklyKm, 0) : 0;

  return (
    <Card className="p-5 gap-3">
      {/* Rank header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: rankColor + '20' }}>
            <Text className="text-lg font-bold" style={{ color: rankColor }}>
              {rankLabel.charAt(0)}
            </Text>
          </View>
          <View>
            <Text className="text-white text-lg font-bold">{rankLabel}</Text>
            <Text className="text-muted-foreground text-xs">{weeklyKm.toFixed(1)} km tuần này</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-km-accent text-lg font-bold">{tokenBalance}</Text>
          <Text className="text-muted-foreground text-xs">token</Text>
        </View>
      </View>

      {/* Keep rank progress */}
      <View className="gap-1.5">
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground text-xs">Giữ hạng</Text>
          <Text className="text-muted-foreground text-xs">
            {weeklyKm.toFixed(1)} / {threshold} km
          </Text>
        </View>
        <Progress value={progressPct} indicatorColor={rankColor} />
      </View>

      {nextRank && (
        <>
          <Separator />
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-xs">
              Lên {RANK_LABELS[nextRank]}: còn {kmToNextRank.toFixed(1)} km
            </Text>
            <Text className="text-slate-500 text-xs">Mùa còn {seasonDaysLeft} ngày</Text>
          </View>
        </>
      )}
    </Card>
  );
}
