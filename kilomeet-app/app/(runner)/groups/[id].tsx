import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import type { GroupRun, GroupMember, Rank } from '../../../src/api/types';
import { useGroupStore, type MemberLocation } from '../../../src/stores/group';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
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
      <Text className="text-foreground text-xs font-medium" numberOfLines={1}>
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

/** Giờ xuất phát tuyệt đối: ưu tiên startsAt của BE, không thì date + slot theo giờ VN. */
const startsAtOf = (g: GroupRun) => new Date(g.startsAt ?? `${g.date}T${g.timeSlot}:00+07:00`);

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState('');
  const t = target.getTime();

  useEffect(() => {
    const update = () => {
      const diff = t - Date.now();
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
  }, [t]);

  return remaining;
}

const MILESTONE_ORDER = ['', 'T-2h', 'T-1h', 'T-30m', 'T-10m', 'T', 'T+10m', 'end'];
const STATUS_LABEL: Record<string, string> = {
  open: 'Đang nhận người',
  confirmed: 'Đã chốt nhóm',
  in_progress: 'Đang chạy',
  completed: 'Đã kết thúc',
  cancelled: 'Đã huỷ (không đủ người xác nhận)',
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { currentGroup, isLoading, fetchGroupDetail } = useGroupStore();

  useEffect(() => {
    if (!id) return;
    fetchGroupDetail(id).catch((e) => toast.error('Không tải được nhóm', { description: (e as Error).message }));
    // Làm mới trạng thái nhóm mỗi 15 giây (mốc giờ, người đã tới).
    const t = setInterval(() => fetchGroupDetail(id, true).catch(() => undefined), 15_000);
    return () => clearInterval(t);
  }, [id, fetchGroupDetail]);

  if ((isLoading && !currentGroup) || !currentGroup || currentGroup.id !== id) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return <GroupDetailContent group={currentGroup} userId={user?.id ?? ''} />;
}

function GroupDetailContent({ group, userId }: { group: GroupRun; userId: string }) {
  const router = useRouter();
  const { joinGroup, leaveGroup, fetchLocations, shareLocation, fetchGroups } = useGroupStore();
  const startsAt = startsAtOf(group);
  const countdown = useCountdown(startsAt);
  const currentMember = group.members.find((m) => m.userId === userId);
  const hasConfirmed = currentMember?.confirmed ?? false;
  const active = group.status !== 'cancelled' && group.status !== 'completed';
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const milestoneIdx = MILESTONE_ORDER.indexOf(group.milestone ?? '');

  // Bản đồ thành viên: poll vị trí mỗi 5 giây khi mình trong nhóm.
  useEffect(() => {
    if (!currentMember || !active) return;
    let alive = true;
    const load = () => fetchLocations(group.id).then((l) => alive && setLocations(l)).catch(() => undefined);
    load();
    const t = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [group.id, currentMember, active, fetchLocations]);

  // Chia sẻ vị trí của mình (BE chỉ nhận từ T−30'; trước đó lỗi được bỏ qua).
  useEffect(() => {
    if (!hasConfirmed || !active) return;
    let sub: Location.LocationSubscription | null = null;
    let last = 0;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5_000 },
        (loc) => {
          if (Date.now() - last < 8_000) return;
          last = Date.now();
          shareLocation(group.id, loc.coords.latitude, loc.coords.longitude)
            .then((r) => r.arrived && !currentMember?.arrived && toast.success('Đã check-in tại điểm hội tụ ✓'))
            .catch(() => undefined);
        },
      );
    })();
    return () => sub?.remove();
  }, [group.id, hasConfirmed, active, shareLocation, currentMember?.arrived]);

  const handleJoin = async () => {
    setBusy(true);
    try {
      await joinGroup(group.id);
      toast.success('Đã xác nhận tham gia nhóm');
    } catch (e) {
      toast.error('Không thể tham gia', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setCancelOpen(false);
    setBusy(true);
    try {
      await leaveGroup(group.id);
      fetchGroups().catch(() => undefined);
      toast.success('Đã huỷ tham gia nhóm');
      router.back();
    } catch (e) {
      toast.error('Không thể huỷ', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const meeting = { latitude: group.meetingPoint.latitude, longitude: group.meetingPoint.longitude };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold flex-1">Chi tiết nhóm</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <Card className="mx-4 items-center mb-4 gap-1">
          <Text className="text-muted-foreground text-sm">{STATUS_LABEL[group.status] ?? 'Bắt đầu sau'}</Text>
          {active && <Text className="text-foreground text-4xl font-bold tracking-widest">{countdown}</Text>}
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
              <Text className="text-foreground font-medium">{group.meetingPoint.name}</Text>
              <Text className="text-muted-foreground text-xs">Bán kính check-in: 50m</Text>
            </View>
          </View>
          <View className="flex-row">
            <View className="flex-1 flex-row items-center">
              <Ionicons name="walk-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-600 text-sm ml-1">{group.distanceKm} km</Text>
            </View>
            <View className="flex-1 flex-row items-center">
              <Ionicons name="trophy-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-600 text-sm ml-1">
                {RANK_RANGE_LABELS[group.rankRange]}
              </Text>
            </View>
            <View className="flex-1 flex-row items-center">
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text className="text-slate-600 text-sm ml-1">
                {group.members.length}/{group.maxMembers}
              </Text>
            </View>
          </View>
        </Card>

        <Card className="mx-4 p-0 overflow-hidden mb-4">
          <MapView
            style={{ height: 220 }}
            initialRegion={{ ...meeting, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
            <Circle center={meeting} radius={50} strokeColor={colors.primary} fillColor={colors.primary + '30'} />
            <Marker coordinate={meeting} title={group.meetingPoint.name} pinColor={colors.primary} />
            {locations.map((l) => (
              <Marker
                key={l.userId}
                coordinate={{ latitude: l.latitude, longitude: l.longitude }}
                title={l.userName}
                description={l.arrived ? 'Đã tới' : `~${l.etaMinutes} phút nữa tới`}
                pinColor={l.arrived ? colors.primary : colors.accent}
              />
            ))}
          </MapView>
          <View className="px-4 py-2">
            {locations.length === 0 ? (
              <Text className="text-slate-500 text-xs">Vị trí thành viên hiện từ 30 phút trước giờ xuất phát.</Text>
            ) : (
              locations.map((l) => (
                <Text key={l.userId} className="text-slate-600 text-xs">
                  {l.userName}: {l.arrived ? 'đã tới ✓' : `còn ~${l.etaMinutes} phút`}
                </Text>
              ))
            )}
          </View>
        </Card>

        <View className="mx-4 mb-4">
          <Text className="text-foreground font-semibold text-base mb-3">
            Thành viên ({group.members.length}/{group.maxMembers})
          </Text>
          <View className="flex-row flex-wrap">
            {group.members.map((m) => (
              <MemberAvatar key={m.userId} member={m} />
            ))}
          </View>
        </View>

        <Card className="mx-4 mb-4 gap-0">
          <Text className="text-foreground font-semibold text-base mb-3">Lịch trình</Text>
          {STATUS_TIMELINE.map((step, i) => {
            const isLast = i === STATUS_TIMELINE.length - 1;
            const isActive = milestoneIdx >= i + 1;
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
                  <Text className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-slate-500'}`}>
                    {step.label}
                  </Text>
                  <Text className="text-slate-500 text-xs">{step.offset}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {active && (
          <View className="mx-4 flex-row gap-3">
            {!hasConfirmed ? (
              <Button size="lg" className="flex-1" onPress={handleJoin} disabled={busy}>
                <Text>{currentMember ? 'Xác nhận tham gia' : 'Tham gia & xác nhận'}</Text>
              </Button>
            ) : (
              <>
                <Button size="lg" className="flex-1" disabled>
                  <Text>{currentMember?.arrived ? 'Đã check-in ✓' : 'Đã xác nhận ✓'}</Text>
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  disabled={busy}
                  onPress={() => setCancelOpen(true)}>
                  <Text>Huỷ</Text>
                </Button>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ tham gia</AlertDialogTitle>
            <AlertDialogDescription>
              Huỷ trước 2 tiếng so với giờ xuất phát thì không bị tính vắng. Sau mốc đó sẽ bị ghi vắng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1">
              <Text>Không</Text>
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="flex-1" onPress={() => void handleLeave()}>
              <Text>Huỷ tham gia</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
