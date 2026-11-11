import { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import { GroupCard } from '../../../src/components/group/GroupCard';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { useGroupStore } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import type { Runner } from '../../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const RANK_RANGE_LABELS: Record<string, string> = {
  same: 'Cùng hạng',
  within1: 'Chênh 1 hạng',
  within2: 'Chênh 2 hạng',
  any: 'Mọi hạng',
};

export default function GroupsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const { groups, isLoading, fetchGroups } = useGroupStore();

  const runner = user?.role === 'runner' || user?.role === 'member' ? (user as Runner) : null;
  const isMember = runner?.isMember ?? false;

  useEffect(() => {
    if (isMember) {
      fetchGroups();
    }
  }, [isMember, fetchGroups]);

  if (!isMember) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="lock-closed-outline" size={64} color={colors.primary} />
          <Text className="text-white text-xl font-bold text-center">
            Tính năng dành cho Hội viên
          </Text>
          <Text className="text-muted-foreground text-sm text-center">
            Nâng cấp Hội viên để tham gia nhóm chạy, ghép nhóm tự động và nhiều quyền lợi hấp dẫn khác.
          </Text>
          <Button size="lg" className="mt-3 px-8" onPress={() => router.push('/(runner)/profile')}>
            <Text>Đăng ký Hội viên — 39.000đ/tháng</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const filtered = groups.filter(
    (g) =>
      g.meetingPoint.name.toLowerCase().includes(search.toLowerCase()) ||
      g.timeSlot.includes(search),
  );

  const handleAutoMatch = () => {
    toast.promise(fetchGroups(), {
      loading: 'Đang tìm nhóm phù hợp...',
      success: () => 'Đã tìm thấy nhóm phù hợp quanh bạn!',
      error: 'Không thể ghép nhóm lúc này',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 gap-3">
        <Text className="text-white text-2xl font-bold">Nhóm chạy</Text>

        {/* Search */}
        <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-12 border border-border">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Input
            className="flex-1 border-0 bg-transparent px-2 h-full text-sm shadow-none"
            placeholder="Tìm theo địa điểm, giờ..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* CTA Buttons */}
        <View className="flex-row gap-3">
          <Button className="flex-1" onPress={() => router.push('/(runner)/groups/create')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
            <Text>Tự lập nhóm</Text>
          </Button>
          <Button variant="accent" className="flex-1" onPress={handleAutoMatch}>
            <Ionicons name="shuffle-outline" size={20} color={colors.white} />
            <Text>Ghép tự động</Text>
          </Button>
        </View>
      </View>

      {/* Group List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="px-4 gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </View>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <GroupCard
                startTime={item.timeSlot}
                meetingPointName={item.meetingPoint.name}
                distance={item.distanceKm}
                memberCount={item.members.length}
                maxMembers={item.maxMembers}
                rankRange={RANK_RANGE_LABELS[item.rankRange] ?? item.rankRange}
                onPress={() => router.push(`/(runner)/groups/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <EmptyState type="groups" message="Không tìm thấy nhóm nào phù hợp" />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
