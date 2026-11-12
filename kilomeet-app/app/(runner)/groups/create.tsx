import { useEffect, useState } from 'react';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import { GROUP_TIME_SLOTS } from '../../../src/api/types';
import { useGroupStore, type MeetingPoint } from '../../../src/stores/group';
import type { RankRange } from '../../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const DISTANCES = [3, 5, 7, 10] as const;
const HCMUT = { latitude: 10.7722, longitude: 106.6596 };

/** 'YYYY-MM-DD' theo giờ VN, cộng thêm `addDays` ngày. */
function vnDate(addDays: number) {
  return new Date(Date.now() + 7 * 3600_000 + addDays * 86_400_000).toISOString().slice(0, 10);
}
const DAY_OPTIONS = [0, 1, 2, 3].map((d) => ({
  value: vnDate(d),
  label: d === 0 ? 'Hôm nay' : d === 1 ? 'Ngày mai' : vnDate(d).slice(8, 10) + '/' + vnDate(d).slice(5, 7),
}));
const slotInFuture = (date: string, slot: string) => new Date(`${date}T${slot}:00+07:00`).getTime() > Date.now();
const RANK_OPTIONS = [
  { value: 'same' as const, label: 'Cùng hạng' },
  { value: 'within1' as const, label: 'Chênh 1 hạng' },
  { value: 'within2' as const, label: 'Chênh 2 hạng' },
  { value: 'any' as const, label: 'Mọi hạng' },
] as const;

export default function CreateGroupScreen() {
  const router = useRouter();
  const createGroup = useGroupStore((s) => s.createGroup);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [selectedRank, setSelectedRank] = useState<RankRange | null>(null);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(DAY_OPTIONS[1]!.value);
  const [pin, setPin] = useState(HCMUT);
  const [points, setPoints] = useState<MeetingPoint[]>([]);
  const fetchMeetingPoints = useGroupStore((s) => s.fetchMeetingPoints);

  useEffect(() => {
    fetchMeetingPoints().then(setPoints).catch(() => setPoints([]));
  }, [fetchMeetingPoints]);

  const choosePoint = (p: MeetingPoint) => {
    setPin({ latitude: p.latitude, longitude: p.longitude });
    setMeetingPoint(p.name);
  };

  const canSubmit = selectedTime && selectedDistance && selectedRank && meetingPoint.trim() && !submitting;

  const handleSubmit = async () => {
    if (!selectedTime || !selectedDistance || !selectedRank || !meetingPoint.trim()) return;
    setSubmitting(true);
    try {
      const group = await createGroup({
        date,
        timeSlot: selectedTime,
        meetingPoint: { name: meetingPoint.trim(), ...pin },
        distanceKm: selectedDistance,
        rankRange: selectedRank,
      });
      toast.success('Đã tạo nhóm chạy mới');
      router.replace(`/(runner)/groups/${group.id}`);
    } catch (e) {
      toast.error('Không thể tạo nhóm', { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold">Tạo nhóm mới</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-foreground font-semibold text-base mb-2 mt-2">Ngày chạy</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d.value}
              variant={date === d.value ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onPress={() => setDate(d.value)}>
              <Text>{d.label}</Text>
            </Button>
          ))}
        </View>

        <Text className="text-foreground font-semibold text-base mb-1">Chọn giờ chạy</Text>
        <Text className="text-muted-foreground text-xs mb-3">Sáng 5:00–7:00 · Chiều 17:00–20:00</Text>
        <View className="flex-row flex-wrap gap-2">
          {GROUP_TIME_SLOTS.map((slot) => (
            <Button
              key={slot}
              variant={selectedTime === slot ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              disabled={!slotInFuture(date, slot)}
              onPress={() => setSelectedTime(slot)}>
              <Text>{slot}</Text>
            </Button>
          ))}
        </View>

        <Text className="text-foreground font-semibold text-base mb-2 mt-5">Quãng đường</Text>
        <View className="flex-row flex-wrap gap-2">
          {DISTANCES.map((d) => (
            <Button
              key={d}
              variant={selectedDistance === d ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onPress={() => setSelectedDistance(d)}>
              <Text>{d} km</Text>
            </Button>
          ))}
        </View>

        <Text className="text-foreground font-semibold text-base mb-2 mt-5">Phạm vi hạng</Text>
        <View className="flex-row flex-wrap gap-2">
          {RANK_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={selectedRank === opt.value ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onPress={() => setSelectedRank(opt.value)}>
              <Text>{opt.label}</Text>
            </Button>
          ))}
        </View>

        <Text className="text-foreground font-semibold text-base mb-2 mt-5">Điểm hẹn</Text>
        <Card className="p-2 gap-2">
          <MapView
            style={{ height: 180, borderRadius: 12 }}
            initialRegion={{ ...HCMUT, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
            onPress={(e: MapPressEvent) => setPin(e.nativeEvent.coordinate)}>
            <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} pinColor={colors.primary} />
            {points.map((p) => (
              <Marker
                key={p.name}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.name}
                pinColor={p.type === 'store' ? colors.accent : colors.info}
                onPress={() => choosePoint(p)}
              />
            ))}
          </MapView>
          <Text className="text-muted-foreground text-xs px-1">Chạm bản đồ / kéo ghim, hoặc chọn điểm có sẵn:</Text>
          <View className="flex-row flex-wrap gap-2 px-1">
            {points.map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant={meetingPoint === p.name ? 'default' : 'outline'}
                className="rounded-full"
                onPress={() => choosePoint(p)}>
                <Text>{p.name}</Text>
              </Button>
            ))}
          </View>
          <Input
            placeholder="Tên điểm hẹn..."
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            className="border-0 bg-transparent"
          />
        </Card>

        <Button size="lg" className="mt-8" disabled={!canSubmit} onPress={handleSubmit}>
          <Text>{submitting ? 'Đang tạo...' : 'Tạo nhóm'}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
