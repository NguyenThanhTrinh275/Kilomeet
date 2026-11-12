import { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import { RANKS, RANK_KM_THRESHOLD, RANK_TOKEN_RETENTION } from '../../src/api/types';
import type { SeasonInfo } from '../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch Kim', kim_cương: 'Kim Cương', cao_thủ: 'Cao Thủ',
};

export default function SeasonScreen() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [newModal, setNewModal] = useState(false);

  const fetchSeasons = useCallback(async () => {
    try {
      const data = await api.get<SeasonInfo[]>('/admin/season');
      setSeasons(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSeasons(); }, [fetchSeasons]);

  const season = seasons.find((s) => s.isActive) ?? seasons[seasons.length - 1];
  const daysLeft = season?.endDate
    ? Math.max(0, Math.ceil((new Date(season.endDate).getTime() - Date.now()) / 86_400_000))
    : 0;

  async function handleCloseSeason() {
    setActionLoading(true);
    try {
      await api.post<SeasonInfo>('/admin/season', { action: 'end' });
      setCloseModal(false);
      toast.success('Đã đóng mùa giải hiện tại');
      setLoading(true);
      await fetchSeasons();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể đóng mùa');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleNewSeason() {
    setActionLoading(true);
    try {
      await api.post<SeasonInfo>('/admin/season', { action: 'start' });
      setNewModal(false);
      toast.success('Đã mở mùa giải mới');
      setLoading(true);
      await fetchSeasons();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể mở mùa mới');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && seasons.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold flex-1">Quản lý mùa</Text>
      </View>

      {!season ? (
        <View className="flex-1 items-center justify-center px-4 gap-4">
          <Text className="text-muted-foreground text-base">Chưa có mùa nào</Text>
          <Button size="lg" onPress={() => setNewModal(true)}>
            <Text>Mở mùa mới</Text>
          </Button>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Current Season Card */}
          <Card className="mt-2 mb-4 gap-2">
            <View className="flex-row items-center mb-1">
              <Ionicons name="trophy" size={22} color={colors.accent} />
              <Text className="text-foreground text-lg font-bold ml-2 flex-1">{season.name}</Text>
              <Badge variant={season.isActive ? 'default' : 'destructive'}>
                <Text>{season.isActive ? 'Đang diễn ra' : 'Đã kết thúc'}</Text>
              </Badge>
            </View>

            <View className="flex-row">
              <Text className="text-muted-foreground text-sm w-24">Bắt đầu:</Text>
              <Text className="text-foreground text-sm">{new Date(season.startDate).toLocaleDateString('vi-VN')}</Text>
            </View>
            {season.endDate ? (
              <View className="flex-row">
                <Text className="text-muted-foreground text-sm w-24">Kết thúc:</Text>
                <Text className="text-foreground text-sm">{new Date(season.endDate).toLocaleDateString('vi-VN')}</Text>
              </View>
            ) : null}
            {season.isActive && season.endDate ? (
              <View className="flex-row">
                <Text className="text-muted-foreground text-sm w-24">Còn lại:</Text>
                <Text className="text-km-accent text-sm font-semibold">{daysLeft} ngày</Text>
              </View>
            ) : null}
          </Card>

          {/* Rank Thresholds */}
          <Text className="text-foreground text-base font-bold mb-3">Ngưỡng rank (km/tuần)</Text>
          <Card className="p-0 overflow-hidden mb-4 gap-0">
            {RANKS.map((rank, i) => (
              <View key={rank}>
                <View className="flex-row items-center px-4 py-3">
                  <View
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: colors.rank[rank] }}
                  />
                  <Text className="text-foreground text-sm flex-1">{RANK_LABELS[rank]}</Text>
                  <Text className="text-muted-foreground text-sm font-mono">≥ {RANK_KM_THRESHOLD[rank]} km</Text>
                </View>
                {i < RANKS.length - 1 ? <Separator /> : null}
              </View>
            ))}
          </Card>

          {/* Token Retention */}
          <Text className="text-foreground text-base font-bold mb-3">Giữ lại token cuối mùa</Text>
          <Card className="p-0 overflow-hidden mb-4 gap-0">
            {RANKS.map((rank, i) => (
              <View key={rank}>
                <View className="flex-row items-center px-4 py-3">
                  <View
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: colors.rank[rank] }}
                  />
                  <Text className="text-foreground text-sm flex-1">{RANK_LABELS[rank]}</Text>
                  <Text className="text-muted-foreground text-sm font-mono">{RANK_TOKEN_RETENTION[rank]} token</Text>
                </View>
                {i < RANKS.length - 1 ? <Separator /> : null}
              </View>
            ))}
          </Card>

          {/* Quest Rewards */}
          <Text className="text-foreground text-base font-bold mb-3">Phần thưởng nhiệm vụ</Text>
          <Card className="mb-6 gap-2.5">
            <View className="flex-row items-center">
              <Ionicons name="walk-outline" size={18} color={colors.primary} />
              <Text className="text-foreground text-sm ml-2 flex-1">Nhiệm vụ ngày (chạy 2km)</Text>
              <Text className="text-km-accent text-sm font-semibold">+10 token</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={18} color={colors.info} />
              <Text className="text-foreground text-sm ml-2 flex-1">Nhiệm vụ tuần (mỗi km)</Text>
              <Text className="text-km-accent text-sm font-semibold">+7 token/km</Text>
            </View>
          </Card>

          {/* Action Buttons */}
          {season.isActive ? (
            <Button
              variant="destructive"
              size="lg"
              onPress={() => setCloseModal(true)}>
              <Ionicons name="lock-closed" size={18} color={colors.white} />
              <Text>Đóng mùa</Text>
            </Button>
          ) : (
            <Button size="lg" onPress={() => setNewModal(true)}>
              <Ionicons name="add-circle" size={18} color={colors.textInverse} />
              <Text>Mở mùa mới</Text>
            </Button>
          )}
        </ScrollView>
      )}

      {/* Close Season AlertDialog */}
      <AlertDialog open={closeModal} onOpenChange={setCloseModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <View className="items-center mb-1">
              <Ionicons name="warning" size={44} color={colors.warning} />
            </View>
            <AlertDialogTitle className="text-center">Đóng mùa hiện tại?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Khi đóng mùa, các thay đổi sau sẽ diễn ra:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <View className="bg-km-surface/50 rounded-xl p-3 gap-2">
            <View className="flex-row items-start">
              <Ionicons name="arrow-down" size={16} color={colors.error} />
              <Text className="text-slate-600 text-sm ml-2 flex-1">
                Rank giảm 2 bậc (ví dụ: Kim Cương → Vàng)
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="wallet-outline" size={16} color={colors.warning} />
              <Text className="text-slate-600 text-sm ml-2 flex-1">
                Token bị giới hạn theo rank (Đồng: 0, Bạc: 100, Vàng: 200, ...)
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <Text className="text-slate-600 text-sm ml-2 flex-1">
                Voucher đã sở hữu được giữ nguyên
              </Text>
            </View>
          </View>

          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1" disabled={actionLoading}>
              <Text>Huỷ</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1"
              disabled={actionLoading}
              onPress={() => void handleCloseSeason()}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text>Đóng mùa</Text>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Season AlertDialog */}
      <AlertDialog open={newModal} onOpenChange={setNewModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <View className="items-center mb-1">
              <Ionicons name="sunny" size={44} color={colors.accent} />
            </View>
            <AlertDialogTitle className="text-center">Mở mùa mới?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Mùa mới sẽ bắt đầu và runner có thể thăng hạng trở lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1" disabled={actionLoading}>
              <Text>Huỷ</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1"
              disabled={actionLoading}
              onPress={() => void handleNewSeason()}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text>Mở mùa</Text>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
