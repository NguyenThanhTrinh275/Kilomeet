import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { GROUP_TIME_SLOTS } from '../../../src/api/types';

const DISTANCES = [3, 5, 7, 10] as const;
const RANK_OPTIONS = [
  { value: 'same', label: 'Cùng hạng' },
  { value: 'within1', label: 'Chênh 1 hạng' },
  { value: 'within2', label: 'Chênh 2 hạng' },
  { value: 'any', label: 'Mọi hạng' },
] as const;

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`rounded-xl px-4 py-2 mr-2 mb-2 ${selected ? 'bg-km-primary' : 'bg-km-bg-secondary'}`}
      onPress={onPress}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-km-bg' : 'text-slate-300'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [meetingPoint, setMeetingPoint] = useState('');

  const canSubmit = selectedTime && selectedDistance && selectedRank && meetingPoint.trim();

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
        {/* Time Slot */}
        <Text className="text-white font-semibold text-base mb-2 mt-2">Chọn giờ chạy</Text>
        <Text className="text-slate-400 text-xs mb-3">Sáng 5:00–7:00 · Chiều 17:00–20:00</Text>
        <View className="flex-row flex-wrap">
          {GROUP_TIME_SLOTS.map((slot) => (
            <Chip
              key={slot}
              label={slot}
              selected={selectedTime === slot}
              onPress={() => setSelectedTime(slot)}
            />
          ))}
        </View>

        {/* Distance */}
        <Text className="text-white font-semibold text-base mb-2 mt-5">Quãng đường</Text>
        <View className="flex-row flex-wrap">
          {DISTANCES.map((d) => (
            <Chip
              key={d}
              label={`${d} km`}
              selected={selectedDistance === d}
              onPress={() => setSelectedDistance(d)}
            />
          ))}
        </View>

        {/* Rank Range */}
        <Text className="text-white font-semibold text-base mb-2 mt-5">Phạm vi hạng</Text>
        <View className="flex-row flex-wrap">
          {RANK_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={selectedRank === opt.value}
              onPress={() => setSelectedRank(opt.value)}
            />
          ))}
        </View>

        {/* Meeting Point */}
        <Text className="text-white font-semibold text-base mb-2 mt-5">Điểm hẹn</Text>
        <View className="bg-km-bg-secondary rounded-xl p-1">
          {/* Map placeholder — ponytail: swap for MapView with draggable marker when react-native-maps added */}
          <View className="h-40 bg-km-surface rounded-xl items-center justify-center mb-2">
            <Ionicons name="location" size={36} color={colors.primary} />
            <Text className="text-slate-400 text-xs mt-2">Kéo ghim trên bản đồ</Text>
          </View>
          <TextInput
            className="text-white px-3 py-2 text-sm"
            placeholder="Hoặc nhập địa chỉ..."
            placeholderTextColor={colors.textMuted}
            value={meetingPoint}
            onChangeText={setMeetingPoint}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          className={`mt-8 rounded-xl py-4 items-center ${canSubmit ? 'bg-km-primary' : 'bg-km-surface'}`}
          disabled={!canSubmit}
          onPress={() => {
            // ponytail: call API to create group, navigate to detail
            router.back();
          }}
        >
          <Text className={`font-bold text-base ${canSubmit ? 'text-km-bg' : 'text-slate-500'}`}>
            Tạo nhóm
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
