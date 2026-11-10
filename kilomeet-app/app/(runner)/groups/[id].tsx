import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import type { GroupMember, Rank } from '../../../src/api/types';
import { useGroupStore } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';

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

// ─── Components ─────────────────────────────────────────────────

function MemberAvatar({ member }: { member: GroupMember }) {
  const rankColor = colors.rank[member.rank as Rank] ?? colors.textMuted;
  return (
    <View className="items-center mr-4 mb-3">
      <View
        className="w-12 h-12 rounded-full items-center justify-center mb-1"
        style={{ backgroundColor: rankColor + '30', borderColor: rankColor, borderWidth: 2 }}
      >
        <Text style={{ color: rankColor }} className="font-bold text-base">
          {member.userName.charAt(0)}
        </Text>
      </View>
      <Text className="text-white text-xs font-medium" numberOfLines={1}>
        {member.userName}
      </Text>
      <Text className="text-slate-400 text-[10px]">{member.punctuality}% đúng giờ</Text>
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
      setRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [targetTime, targetDate]);

  return remaining;
}

// ─── Screen ─────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const router = useRouter();
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

  const group = currentGroup;

  return <GroupDetailContent group={group} userId={user?.id ?? ''} joinGroup={joinGroup} router={router} />;
}

function GroupDetailContent({
  group,
  userId,
  joinGroup,
  router,
}: {
  group: NonNullable<ReturnType<typeof useGroupStore.getState>['currentGroup']>;
  userId: string;
  joinGroup: (groupId: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const countdown = useCountdown(group.timeSlot, group.date);
  const currentMember = group.members.find((m) => m.userId === userId);
  const hasConfirmed = currentMember?.confirmed ?? false;

  const handleJoin = async () => {
    try {
      await joinGroup(group.id);
    } catch (e) {
      Alert.alert('Lỗi', (e as Error).message);
    }
  };

  const handleCancel = () => {
    Alert.alert('Huỷ tham gia', 'Bạn có chắc muốn huỷ tham gia nhóm chạy này?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Chi tiết nhóm</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Countdown */}
        <View className="mx-4 bg-km-bg-secondary rounded-2xl p-4 items-center mb-4">
          <Text className="text-slate-400 text-sm mb-1">Bắt đầu sau</Text>
          <Text className="text-white text-4xl font-bold tracking-widest">{countdown}</Text>
          <Text className="text-slate-400 text-xs mt-1">
            {group.timeSlot} · {group.date}
          </Text>
        </View>

        {/* Group Info */}
        <View className="mx-4 bg-km-bg-secondary rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-km-primary/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="location" size={16} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{group.meetingPoint.name}</Text>
              <Text className="text-slate-400 text-xs">Bán kính check-in: 50m</Text>
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
        </View>

        {/* Map placeholder */}
        <View className="mx-4 bg-km-bg-secondary rounded-2xl overflow-hidden mb-4">
          {/* ponytail: swap for MapView with meeting point marker + 50m radius circle + member markers */}
          <View className="h-48 bg-km-surface items-center justify-center">
            <Ionicons name="map" size={48} color={colors.textMuted} />
            <Text className="text-slate-500 text-xs mt-2">Bản đồ theo dõi trực tiếp</Text>
            <View className="absolute bottom-3 right-3 bg-km-primary/20 rounded-lg px-2 py-1 flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-km-primary mr-1" />
              <Text className="text-km-primary text-[10px] font-medium">50m</Text>
            </View>
          </View>
        </View>

        {/* Members */}
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

        {/* Status Timeline */}
        <View className="mx-4 bg-km-bg-secondary rounded-2xl p-4 mb-4">
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
                <View className={`pb-4 ${isLast ? '' : ''}`}>
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </Text>
                  <Text className="text-slate-500 text-xs">{step.offset}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View className="mx-4 flex-row gap-3">
          {!hasConfirmed ? (
            <TouchableOpacity
              className="flex-1 bg-km-primary rounded-xl py-4 items-center"
              onPress={handleJoin}
            >
              <Text className="text-km-bg font-bold text-base">Xác nhận tham gia</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity className="flex-1 bg-km-primary rounded-xl py-4 items-center">
                <Text className="text-km-bg font-bold text-base">Đã xác nhận ✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-km-surface rounded-xl py-4 items-center"
                onPress={handleCancel}
              >
                <Text className="text-red-400 font-bold text-base">Huỷ</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
