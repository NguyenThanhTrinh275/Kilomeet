import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { GameMap } from '../../../src/components/game/GameMap';
import * as Location from 'expo-location';
import { toast } from 'sonner-native';
import { Check, ChevronLeft, Flag, Info, MapPin as PinIcon, Navigation, Users, X } from 'lucide-react-native';
import { useGroupStore, type MemberLocation } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import type { GroupRun } from '../../../src/api/types';
import { C, DEPTH } from '../../../src/theme/game';
import { avatarColor, initials } from '../../../src/lib/format';
import {
  Avatar,
  Banner,
  Card,
  GameDialog,
  GButton,
  GText,
  IconButton,
  Loading,
  MapPin,
  Pill,
  type PillTone,
  RankEmblem,
  Row,
  SectionHeader,
} from '../../../src/components/game';

const RANK_RANGE_LABELS: Record<string, string> = { same: 'Cùng hạng', within1: '±1 hạng', within2: '±2 hạng', any: 'Mọi hạng' };
const MILESTONES: [string, string][] = [
  ['T-2h', 'Xác nhận'],
  ['T-1h', 'Nhắc 1'],
  ['T-30m', 'Vị trí'],
  ['T-10m', 'Nhắc 2'],
  ['T', 'Check-in'],
  ['T+10m', 'Bắt đầu'],
];
const MILESTONE_ORDER = ['', 'T-2h', 'T-1h', 'T-30m', 'T-10m', 'T', 'T+10m', 'end'];
const STATUS_LABEL: Record<string, string> = {
  open: 'Xuất phát sau',
  confirmed: 'Xuất phát sau',
  in_progress: 'Nhóm đang chạy',
  completed: 'Buổi chạy đã kết thúc',
  cancelled: 'Đã huỷ — không đủ người xác nhận',
};

/** Giờ xuất phát tuyệt đối: ưu tiên startsAt của BE, không thì date + slot theo giờ VN. */
const startsAtOf = (g: GroupRun) => new Date(g.startsAt ?? `${g.date}T${g.timeSlot}:00+07:00`);

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState('');
  const t = target.getTime();
  useEffect(() => {
    const update = () => {
      const diff = t - Date.now();
      if (diff <= 0) return setRemaining('00:00:00');
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [t]);
  return remaining;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { currentGroup, isLoading, fetchGroupDetail } = useGroupStore();

  useEffect(() => {
    if (!id) return;
    fetchGroupDetail(id).catch((e) => toast.error('Không tải được nhóm', { description: (e as Error).message }));
    const t = setInterval(() => fetchGroupDetail(id, true).catch(() => undefined), 15_000);
    return () => clearInterval(t);
  }, [id, fetchGroupDetail]);

  if ((isLoading && !currentGroup) || !currentGroup || currentGroup.id !== id) return <Loading />;
  return <GroupLobby group={currentGroup} userId={user?.id ?? ''} />;
}

function GroupLobby({ group, userId }: { group: GroupRun; userId: string }) {
  const { joinGroup, leaveGroup, fetchLocations, shareLocation, fetchGroups } = useGroupStore();
  const startsAt = startsAtOf(group);
  const countdown = useCountdown(startsAt);
  const me = group.members.find((m) => m.userId === userId);
  const confirmed = me?.confirmed ?? false;
  const active = group.status !== 'cancelled' && group.status !== 'completed';
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const milestoneIdx = MILESTONE_ORDER.indexOf(group.milestone ?? '');
  const sharing = milestoneIdx >= 3 && active;
  const meeting = { latitude: group.meetingPoint.latitude, longitude: group.meetingPoint.longitude };

  useEffect(() => {
    if (!me || !active) return;
    let alive = true;
    const load = () => fetchLocations(group.id).then((l) => alive && setLocations(l)).catch(() => undefined);
    load();
    const t = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [group.id, me, active, fetchLocations]);

  // Chia sẻ vị trí của mình (BE chỉ nhận từ T−30'; trước đó lỗi được bỏ qua).
  useEffect(() => {
    if (!confirmed || !active) return;
    let sub: Location.LocationSubscription | null = null;
    let last = 0;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5_000 }, (loc) => {
        if (Date.now() - last < 8_000) return;
        last = Date.now();
        shareLocation(group.id, loc.coords.latitude, loc.coords.longitude)
          .then((r) => r.arrived && !me?.arrived && toast.success('Đã check-in tại điểm hội tụ ✓'))
          .catch(() => undefined);
      });
    })();
    return () => sub?.remove();
  }, [group.id, confirmed, active, shareLocation, me?.arrived]);

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

  const memberStatus = (uid: string, confirmedM: boolean, arrived: boolean): [string, PillTone, string] => {
    const loc = locations.find((l) => l.userId === uid);
    if (arrived || loc?.arrived) return ['Đã tới', 'green', 'Đã tới điểm hẹn'];
    if (loc) return ['Đang tới', 'coin', `Còn ~${loc.etaMinutes} phút`];
    if (confirmedM) return ['Đã xác nhận', 'sky', 'Chờ tới giờ chia sẻ vị trí'];
    return ['Chưa xác nhận', 'red', 'Cần xác nhận trước giờ chạy 2 tiếng'];
  };
  const confirmedCount = group.members.filter((m) => m.confirmed).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 400, borderBottomWidth: 3, borderColor: C.ink900 }}>
          <GameMap style={StyleSheet.absoluteFill} initialRegion={{ ...meeting, latitudeDelta: 0.012, longitudeDelta: 0.012 }}>
            <Circle center={meeting} radius={50} strokeColor={C.green700} strokeWidth={2.5} fillColor="rgba(43,212,106,0.2)" lineDashPattern={[6, 5]} />
            <Marker coordinate={meeting} anchor={{ x: 0.5, y: 1 }} title={group.meetingPoint.name}>
              <MapPin kind="meet" size={56} />
            </Marker>
            {locations.map((l) => (
              <Marker key={l.userId} coordinate={{ latitude: l.latitude, longitude: l.longitude }} anchor={{ x: 0.5, y: 0.7 }}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Pill tone={l.arrived ? 'green' : 'coin'} label={l.arrived ? 'Đã tới ✓' : `${l.etaMinutes} phút`} />
                  <Avatar initials={initials(l.userName)} fill={avatarColor(l.userName)} size={40} />
                </View>
              </Marker>
            ))}
          </GameMap>
          <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
            <Row gap={12} style={{ paddingHorizontal: 16, paddingTop: 6 }}>
              <IconButton icon={ChevronLeft} onPress={() => router.back()} />
              <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.surface, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.small]}>
                <Flag size={16} color={C.green700} strokeWidth={2.5} />
                <GText v="titleS" numberOfLines={1} style={{ flex: 1 }}>
                  {group.meetingPoint.name} · {group.timeSlot}
                </GText>
              </View>
            </Row>
          </SafeAreaView>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16, marginTop: -28 }}>
          <Card row fill={C.ink900} pad={16} gap={12}>
            <View style={{ flex: 1, gap: 2 }}>
              <GText v="caps" color={C.coin500}>
                {STATUS_LABEL[group.status] ?? 'Xuất phát sau'}
              </GText>
              <GText v="numL" color={C.white}>
                {active && group.status !== 'in_progress' ? countdown : group.status === 'in_progress' ? 'Đang chạy' : '—'}
              </GText>
              <GText v="bodyS" color={C.ink300}>
                {group.distanceKm} km · {RANK_RANGE_LABELS[group.rankRange]} · nhóm chờ tối đa 10 phút
              </GText>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 56, backgroundColor: sharing ? C.green500 : C.night2, borderWidth: 3, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={26} color={sharing ? C.ink900 : C.ink300} strokeWidth={2.5} />
              </View>
              <GText v="caps" color={sharing ? C.green500 : C.ink300} style={{ fontSize: 9 }}>
                {sharing ? 'Đang chia sẻ' : 'Chưa chia sẻ'}
              </GText>
            </View>
          </Card>

          <Card gap={10} pad={[14, 12]}>
            <GText v="caps" color={C.ink500}>
              Lịch trình
            </GText>
            <View style={{ flexDirection: 'row' }}>
              {MILESTONES.map(([t, l], i) => {
                const now = milestoneIdx === i + 1;
                const passed = milestoneIdx > i + 1;
                const size = now ? 30 : 24;
                return (
                  <View key={t} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: passed ? C.green500 : now ? C.coin500 : C.sunken, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                      {passed ? <Check size={14} color={C.ink900} strokeWidth={3} /> : now ? <Navigation size={14} color={C.ink900} strokeWidth={2.5} /> : null}
                    </View>
                    <GText v="caps" color={passed || now ? C.ink900 : C.ink500} style={{ fontSize: 9, letterSpacing: 0.2 }}>
                      {t}
                    </GText>
                    <GText v="bodyS" color={C.ink500} style={{ fontSize: 10 }}>
                      {l}
                    </GText>
                  </View>
                );
              })}
            </View>
          </Card>

          <SectionHeader title="Đồng đội" link={`${group.members.length} / ${group.maxMembers} · đã xác nhận ${confirmedCount}`} linkColor={C.ink500} />
          <Card pad={[4, 14]} gap={0}>
            {group.members.map((m, i) => {
              const [label, tone, sub] = memberStatus(m.userId, m.confirmed, m.arrived);
              return (
                <Row key={m.userId} gap={10} style={{ paddingVertical: 10, borderBottomWidth: i < group.members.length - 1 ? 1.5 : 0, borderBottomColor: C.ink300 }}>
                  <Avatar initials={initials(m.userName)} fill={avatarColor(m.userName)} size={40} />
                  {/* Nhãn trạng thái nằm dưới tên (không chung hàng) để tên và mô tả không bị ép hẹp. */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <GText v="bodyMStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {m.userName}
                        {m.userId === userId ? ' (bạn)' : ''}
                      </GText>
                      <RankEmblem rank={m.rank} size={18} style={{ marginLeft: 6 }} />
                    </View>
                    <Pill tone={tone} label={label} />
                    <GText v="bodyS" color={C.ink500}>
                      {sub} · đúng hẹn {m.punctuality}%
                    </GText>
                  </View>
                </Row>
              );
            })}
          </Card>

          {active ? (
            !confirmed ? (
              <GButton label={me ? 'Xác nhận tham gia' : 'Tham gia & xác nhận'} icon={Users} loading={busy} onPress={() => void handleJoin()} block />
            ) : (
              <>
                <GButton label={me?.arrived ? 'Đã check-in ✓' : 'Đã xác nhận ✓'} icon={PinIcon} disabled block />
                <Row gap={8} style={{ justifyContent: 'center' }}>
                  <Info size={14} color={C.ink500} strokeWidth={2.5} />
                  <GText v="bodyS" color={C.ink500}>
                    Tự động "đã tới" khi trong bán kính 50 m
                  </GText>
                </Row>
                <GButton label="Huỷ tham gia" type="secondary" size="M" icon={X} disabled={busy} onPress={() => setCancelOpen(true)} block />
              </>
            )
          ) : (
            <Banner icon={Info} tone={group.status === 'cancelled' ? 'red' : 'green'} text={STATUS_LABEL[group.status] ?? ''} />
          )}
        </View>
      </ScrollView>

      <GameDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        icon={X}
        title="Huỷ tham gia?"
        text="Huỷ trước 2 tiếng so với giờ xuất phát thì không bị tính vắng. Sau mốc đó sẽ bị ghi vắng."
        actions={
          <>
            <GButton label="Không, giữ chỗ" onPress={() => setCancelOpen(false)} block />
            <GButton label="Huỷ tham gia" type="danger" icon={X} onPress={() => void handleLeave()} block />
          </>
        }
      />
    </View>
  );
}
