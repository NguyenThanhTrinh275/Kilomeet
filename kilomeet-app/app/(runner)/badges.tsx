import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Info } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth';
import { colors } from '../../src/theme/colors';
import { RankBadge } from '../../src/components/common/RankBadge';
import type { Rank, Runner } from '../../src/api/types';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">Huy hiệu mùa</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Current Season */}
        <Card className="p-5 mb-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-base font-bold">Mùa 3/2026</Text>
            <Badge variant="default">
              <Text>Hiện tại</Text>
            </Badge>
          </View>
          {currentBadge ? (
            <View className="items-center py-4 gap-2">
              <RankBadge rank={currentBadge} size="lg" />
              <Badge
                variant="outline"
                style={{
                  backgroundColor: `${colors.rank[currentBadge]}20`,
                  borderColor: `${colors.rank[currentBadge]}60`,
                }}>
                <Text style={{ color: colors.rank[currentBadge] }}>
                  {RANK_LABELS[currentBadge]}
                </Text>
              </Badge>
            </View>
          ) : (
            <View className="items-center py-6 bg-km-bg/60 rounded-xl border border-slate-800 gap-2">
              <Ionicons name="ribbon-outline" size={32} color={colors.textSecondary} />
              <Text className="text-slate-300 text-sm text-center">
                Chưa đạt huy hiệu mùa này
              </Text>
            </View>
          )}
        </Card>

        {/* Past Seasons */}
        <Card className="p-5 mb-4 gap-2">
          <Text className="text-white text-base font-bold mb-1">Các mùa trước</Text>
          {PAST_SEASONS.map((s, idx) => {
            const rankColor = colors.rank[s.highestRank];
            return (
              <View key={s.season}>
                <View className="flex-row items-center py-3">
                  <RankBadge rank={s.highestRank} size="md" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white text-sm font-semibold">{s.season}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{s.period}</Text>
                  </View>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: `${rankColor}20`,
                      borderColor: `${rankColor}50`,
                    }}>
                    <Text style={{ color: rankColor }}>{RANK_LABELS[s.highestRank]}</Text>
                  </Badge>
                </View>
                {idx < PAST_SEASONS.length - 1 ? <Separator /> : null}
              </View>
            );
          })}
        </Card>

        {/* Info Note */}
        <Alert icon={Info}>
          <AlertDescription className="text-slate-300">
            Huy hiệu ghi lại hạng cao nhất bạn đạt được mỗi mùa. Thành tích không mất khi reset.
          </AlertDescription>
        </Alert>
      </ScrollView>
    </SafeAreaView>
  );
}
