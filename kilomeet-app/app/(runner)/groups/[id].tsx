import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import type { GroupRun, GroupMember, Rank } from '../../../src/api/types';
import { useGroupStore } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
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

const RANK_RANGE_LABELS: Record<string, string> = {
  same: 'Cùng hạng',
  within1: 'Chênh 1 hạng',
  within2: 'Chênh 2 hạng',
  any: 'Mọi hạng',
};

const STATUS_TIMELINE = [
  { offset: '2h trước', label: 'Xác nhận tham gia', icon: 'checkmark-circle' as const },
  { offset: '1h trước', label: 'Nhắc nhở', icon: 'notifications' as const },
  { offset: '30 phút', label: 'Chia sẻ vị trí', icon: 'location' as const },
  { offset: '10 phút', label: 'Nhắc nhở cuối', icon: 'alert-circle' as const },
  { offset: 'Bắt đầu', label: 'Check-in', icon: 'flag' as const },
];

function MemberAvatar({ member }: { member: GroupMember }) {
  const rankColor = colors.rank[member.rank as Rank] ?? colors.textMuted;
  return (
    <View className="items-center mr-4 mb-3">
      <View
        className="w-12 h-12 rounded-full items-center justify-center mb-1"
        style={{ backgroundColor: rankColor + '30', borderColor: rankColor, borderWidth: 2 }}>
        <Text style={{ color: rankColor }} className="font-bold text-base">
          {member.userName.charAt(0)}
        </Text>
      </View>
      <Text className="text-white text-xs font-medium" numberOfLines={1}>
        {member.userName}
      </Text>
      <Text className="text-muted-foreground text-[10px]">{member.punctuality}% đúng giờ</Text>
      {member.confirmed && (
        <View className="absolute -top-0.5 -right-0.5">
          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

function useCountdown(targetTime: string, targetDate: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const [h, m] = targetTime.split(':').map(Number);
      const target = new Date(targetDate);
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Đã bắt đầu');
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1_000);
      setRemaining(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      );
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [targetTime, targetDate]);

  return remaining;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { currentGroup, isLoading, fetchGroupDetail, joinGroup } = useGroupStore();

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id);
    }
  }, [id, fetchGroupDetail]);

  if (isLoading || !currentGroup) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <GroupDetailContent
      group={currentGroup}
      userId={user?.id ?? ''}
      joinGroup={joinGroup}
    />
  );
}

function GroupDetailContent({
  group,
  userId,
  joinGroup,
}: {
  group: GroupRun;
  userId: string;
  joinGroup: (groupId: string) => Promise<void>;
}) {
  const router = useRouter();
  const countdown = useCountdown(group.timeSlot, group.date);
  const currentMember = group.members.find((m) => m.userId === userId);
  const hasConfirmed = currentMember?.confirmed ?? false;
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleJoin = async () => {
    try {
      await joinGroup(group.id);
      toast.success('Đã xác nhận tham gia nhóm');
    } catch (e) {
      toast.error('Không thể tham gia', { description: (e as Error).message });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Chi tiết nhóm</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <Card className="mx-4 items-center mb-4 gap-1">
          <Text className="text-muted-foreground text-sm">Bắt đầu sau</Text>
          <Text className="text-white text-4xl font-bold tracking-widest">{countdown}</Text>
          <Text className="text-muted-foreground text-xs">
            {group.timeSlot} · {group.date}
          </Text>
        </Card>

        <Card className="mx-4 mb-4 gap-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-km-primary/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="location" size={16} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{group.meetingPoint.name}</Text>
              <Text className="text-muted-foreground text-xs">Bán kính check-in: 50m</Text>
            </View>
          </View>
          <View className="flex-row">
            <View className="flex-1 flex-row items-center">
              <Ionicons name="walk-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-300 text-sm ml-1">{group.distanceKm} km</Text>
            </View>
            <View className="flex-1 flex-row items-center">
              <Ionicons name="trophy-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-300 text-sm ml-1">
                {RANK_RANGE_LABELS[group.rankRange]}
              </Text>
            </View>
            <View className="flex-1 flex-row items-center">
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-300 text-sm ml-1">
                {group.members.length}/{group.maxMembers}
              </Text>
            </View>
          </View>
        </Card>

        <Card className="mx-4 p-0 overflow-hidden mb-4">
          {/* ponytail: swap for MapView with meeting point marker + 50m radius circle + member markers */}
          <View className="h-48 bg-km-surface items-center justify-center">
            <Ionicons name="map" size={48} color={colors.textMuted} />
            <Text className="text-slate-500 text-xs mt-2">Bản đồ theo dõi trực tiếp</Text>
            <View className="absolute bottom-3 right-3 bg-km-primary/20 rounded-lg px-2 py-1 flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-km-primary mr-1" />
              <Text className="text-km-primary text-[10px] font-medium">50m</Text>
            </View>
          </View>
        </Card>

        <View className="mx-4 mb-4">
          <Text className="text-white font-semibold text-base mb-3">
            Thành viên ({group.members.length}/{group.maxMembers})
          </Text>
          <View className="flex-row flex-wrap">
            {group.members.map((m) => (
              <MemberAvatar key={m.userId} member={m} />
            ))}
          </View>
        </View>

        <Card className="mx-4 mb-4 gap-0">
          <Text className="text-white font-semibold text-base mb-3">Lịch trình</Text>
          {STATUS_TIMELINE.map((step, i) => {
            const isLast = i === STATUS_TIMELINE.length - 1;
            // ponytail: derive active state from real time delta
            const isActive = i <= 1;
            return (
              <View key={i} className="flex-row">
                <View className="items-center mr-3" style={{ width: 24 }}>
                  <Ionicons
                    name={step.icon}
                    size={18}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  {!isLast && (
                    <View
                      className="w-0.5 flex-1 my-1"
                      style={{ backgroundColor: isActive ? colors.primary : colors.surfaceBorder }}
                    />
                  )}
                </View>
                <View className="pb-4">
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </Text>
                  <Text className="text-slate-500 text-xs">{step.offset}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <View className="mx-4 flex-row gap-3">
          {!hasConfirmed ? (
            <Button size="lg" className="flex-1" onPress={handleJoin}>
              <Text>Xác nhận tham gia</Text>
            </Button>
          ) : (
            <>
              <Button size="lg" className="flex-1" disabled>
                <Text>Đã xác nhận ✓</Text>
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
                onPress={() => setCancelOpen(true)}>
                <Text>Huỷ</Text>
              </Button>
            </>
          )}
        </View>
      </ScrollView>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ tham gia</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn huỷ tham gia nhóm chạy này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1">
              <Text>Không</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1"
              onPress={() => {
                setCancelOpen(false);
                router.back();
              }}>
              <Text>Huỷ tham gia</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
