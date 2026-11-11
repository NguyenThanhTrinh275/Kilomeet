import { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import { GROUP_TIME_SLOTS } from '../../../src/api/types';
import { useGroupStore } from '../../../src/stores/group';
import type { RankRange } from '../../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const DISTANCES = [3, 5, 7, 10] as const;
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

  const canSubmit = selectedTime && selectedDistance && selectedRank && meetingPoint.trim() && !submitting;

  const handleSubmit = async () => {
    if (!selectedTime || !selectedDistance || !selectedRank || !meetingPoint.trim()) return;
    setSubmitting(true);
    try {
      const group = await createGroup({
        date: new Date().toISOString().slice(0, 10),
        timeSlot: selectedTime,
        meetingPoint: {
          name: meetingPoint.trim(),
          latitude: 10.773,
          longitude: 106.660,
        },
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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Tạo nhóm mới</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-white font-semibold text-base mb-1 mt-2">Chọn giờ chạy</Text>
        <Text className="text-muted-foreground text-xs mb-3">Sáng 5:00–7:00 · Chiều 17:00–20:00</Text>
        <View className="flex-row flex-wrap gap-2">
          {GROUP_TIME_SLOTS.map((slot) => (
            <Button
              key={slot}
              variant={selectedTime === slot ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onPress={() => setSelectedTime(slot)}>
              <Text>{slot}</Text>
            </Button>
          ))}
        </View>

        <Text className="text-white font-semibold text-base mb-2 mt-5">Quãng đường</Text>
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

        <Text className="text-white font-semibold text-base mb-2 mt-5">Phạm vi hạng</Text>
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

        <Text className="text-white font-semibold text-base mb-2 mt-5">Điểm hẹn</Text>
        <Card className="p-2 gap-2">
          {/* ponytail: swap for MapView with draggable marker when interactive picker is added */}
          <View className="h-40 bg-km-surface rounded-xl items-center justify-center">
            <Ionicons name="location" size={36} color={colors.primary} />
            <Text className="text-muted-foreground text-xs mt-2">Kéo ghim trên bản đồ</Text>
          </View>
          <Input
            placeholder="Hoặc nhập địa chỉ..."
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
