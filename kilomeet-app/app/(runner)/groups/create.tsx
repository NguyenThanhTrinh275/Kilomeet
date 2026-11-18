import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { GameMap } from '../../../src/components/game/GameMap';
import { toast } from 'sonner-native';
import { Check, Flag, Flame, Info, Minus, Plus, Sparkles, Users } from 'lucide-react-native';
import { GROUP_TIME_SLOTS, RANKS, type RankRange, type Runner } from '../../../src/api/types';
import { useGroupStore, type MeetingPoint } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import { C, DEPTH } from '../../../src/theme/game';
import {
  Banner,
  Body,
  Card,
  Chip,
  GButton,
  GInput,
  GText,
  MapPin,
  RankChip,
  Row,
  Screen,
  Segmented,
  TopBar,
} from '../../../src/components/game';

const DISTANCES = [3, 5, 7, 10] as const;
const HCMUT = { latitude: 10.7722, longitude: 106.6596 };

/** 'YYYY-MM-DD' theo giờ VN, cộng thêm `addDays` ngày. */
function vnDate(addDays: number) {
  return new Date(Date.now() + 7 * 3600_000 + addDays * 86_400_000).toISOString().slice(0, 10);
}
const WD = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const DAY_OPTIONS = [0, 1, 2].map((d) => {
  const v = vnDate(d);
  return { value: v, label: d === 0 ? 'Hôm nay' : d === 1 ? 'Ngày mai' : WD[new Date(`${v}T00:00:00Z`).getUTCDay()]!, sub: `${v.slice(8, 10)}/${v.slice(5, 7)}` };
});
const slotInFuture = (date: string, slot: string) => new Date(`${date}T${slot}:00+07:00`).getTime() > Date.now();
const RANGE_STEPS: Record<RankRange, number> = { same: 0, within1: 1, within2: 2, any: 5 };

export default function CreateGroupScreen() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user) as Runner | null;
  const createGroup = useGroupStore((s) => s.createGroup);
  const fetchMeetingPoints = useGroupStore((s) => s.fetchMeetingPoints);
  const [date, setDate] = useState(DAY_OPTIONS[1]!.value);
  const [time, setTime] = useState<string | null>(null);
  const [distanceIdx, setDistanceIdx] = useState(1);
  const [range, setRange] = useState<RankRange>('within1');
  const [pointName, setPointName] = useState('');
  const [pin, setPin] = useState(HCMUT);
  const [points, setPoints] = useState<MeetingPoint[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMeetingPoints().then(setPoints).catch(() => setPoints([]));
  }, [fetchMeetingPoints]);

  useEffect(() => {
    if (time && !slotInFuture(date, time)) setTime(null);
  }, [date, time]);

  const choosePoint = (p: MeetingPoint) => {
    setPin({ latitude: p.latitude, longitude: p.longitude });
    setPointName(p.name);
  };

  const myIdx = RANKS.indexOf(me?.rank ?? 'đồng');
  const steps = RANGE_STEPS[range];
  const allowed = RANKS.filter((_, i) => Math.abs(i - myIdx) <= steps);
  const canSubmit = !!time && !!pointName.trim() && !submitting;

  const submit = async () => {
    if (!time || !pointName.trim()) return;
    setSubmitting(true);
    try {
      const group = await createGroup({
        date,
        timeSlot: time,
        meetingPoint: { name: pointName.trim(), ...pin },
        distanceKm: DISTANCES[distanceIdx]!,
        rankRange: range,
      });
      toast.success('Đã tạo nhóm chạy mới');
      router.replace(`/(runner)/groups/${group.id}`);
    } catch (e) {
      toast.error('Không thể tạo nhóm', { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const cap = (t: string, right?: string) => (
    <Row between>
      <GText v="caps" color={C.ink500}>
        {t}
      </GText>
      {right ? (
        <GText v="bodyS" color={C.ink500}>
          {right}
        </GText>
      ) : null}
    </Row>
  );

  return (
    <Screen>
      <TopBar title="Tạo nhóm mới" action={Info} onAction={() => toast.info('Giờ xuất phát cố định 30 phút một mốc. Nhóm tối đa 6 người.')} />
      <Body gap={14}>
        {cap('Ngày chạy')}
        <Row gap={8} center={false}>
          {DAY_OPTIONS.map((d) => {
            const on = date === d.value;
            return (
              <Pressable
                key={d.value}
                onPress={() => setDate(d.value)}
                style={[{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, borderWidth: 2.5, borderColor: C.ink900, backgroundColor: on ? C.coin500 : C.surface }, on ? DEPTH.chunky : DEPTH.small]}>
                <GText v="titleS">{d.label}</GText>
                <GText v="bodyS" color={C.ink700}>
                  {d.sub}
                </GText>
              </Pressable>
            );
          })}
        </Row>

        {cap('Giờ xuất phát', 'Sáng 5:00–7:00 · Tối 17:00–20:00')}
        {[
          ['Sáng', Sparkles, GROUP_TIME_SLOTS.filter((s) => s < '12:00')],
          ['Tối', Flame, GROUP_TIME_SLOTS.filter((s) => s >= '12:00')],
        ].map(([label, I, slots]) => {
          const Icon = I as typeof Flame;
          return (
            <Row key={label as string} gap={8} center style={{ flexWrap: 'wrap' }}>
              <Row gap={4} style={{ width: 56 }}>
                <Icon size={14} color={C.ink500} strokeWidth={2.5} />
                <GText v="bodyMStrong" color={C.ink500}>
                  {label as string}
                </GText>
              </Row>
              {(slots as string[]).map((s) => {
                const on = time === s;
                const ok = slotInFuture(date, s);
                return (
                  <Pressable
                    key={s}
                    disabled={!ok}
                    onPress={() => setTime(s)}
                    style={[{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: C.ink900, backgroundColor: on ? C.green500 : C.surface, opacity: ok ? 1 : 0.35 }, on ? DEPTH.chunky : DEPTH.small]}>
                    <GText v="numS">{s}</GText>
                  </Pressable>
                );
              })}
            </Row>
          );
        })}

        {cap('Quãng đường')}
        <Card row pad={10} gap={12} depth="small">
          <Pressable onPress={() => setDistanceIdx((i) => Math.max(0, i - 1))} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.sunken, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={22} color={C.ink900} strokeWidth={3} />
          </Pressable>
          <Row gap={4} center={false} style={{ flex: 1, justifyContent: 'center', alignItems: 'baseline' }}>
            <GText v="numL">{DISTANCES[distanceIdx]}</GText>
            <GText v="titleS" color={C.ink500}>
              km
            </GText>
          </Row>
          <Pressable onPress={() => setDistanceIdx((i) => Math.min(DISTANCES.length - 1, i + 1))} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.green500, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} color={C.ink900} strokeWidth={3} />
          </Pressable>
        </Card>

        {cap('Phạm vi hạng')}
        <Segmented
          value={range}
          onChange={setRange}
          radius={16}
          activeFill={C.grape500}
          activeText={C.white}
          options={[
            { value: 'same', label: 'Cùng hạng' },
            { value: 'within1', label: '±1 hạng' },
            { value: 'within2', label: '±2 hạng' },
            { value: 'any', label: 'Mọi hạng' },
          ]}
        />
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {allowed.map((r) => (
            <RankChip key={r} rank={r} small />
          ))}
        </Row>

        {cap('Điểm hội tụ')}
        <Card pad={10} gap={10}>
          <View style={{ height: 170, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden' }}>
            <GameMap
              style={{ flex: 1 }}
              initialRegion={{ ...HCMUT, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
              onPress={(e: MapPressEvent) => setPin(e.nativeEvent.coordinate)}>
              <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} anchor={{ x: 0.5, y: 1 }}>
                <MapPin kind="meet" size={48} />
              </Marker>
              {points.map((p) => (
                <Marker key={p.name} coordinate={{ latitude: p.latitude, longitude: p.longitude }} anchor={{ x: 0.5, y: 1 }} onPress={() => choosePoint(p)}>
                  <MapPin kind={p.type === 'store' ? 'store' : 'quest'} size={32} />
                </Marker>
              ))}
            </GameMap>
          </View>
          <GText v="bodyS" color={C.ink500}>
            Chạm bản đồ / kéo ghim, hoặc chọn điểm có sẵn:
          </GText>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {points.map((p) => (
              <Chip key={p.name} label={p.name} icon={pointName === p.name ? Check : Flag} selected={pointName === p.name} tone="green" onPress={() => choosePoint(p)} />
            ))}
          </Row>
          <GInput placeholder="Tên điểm hẹn..." icon={Flag} value={pointName} onChangeText={setPointName} />
        </Card>

        <Banner icon={Users} tone="sky" text="Tối đa 6 người · App mời hội viên phù hợp ở gần điểm hẹn." />
        <GButton label="Tạo nhóm & mời" icon={Users} loading={submitting} disabled={!canSubmit} onPress={() => void submit()} block />
      </Body>
    </Screen>
  );
}
