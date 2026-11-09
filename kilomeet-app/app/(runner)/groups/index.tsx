import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { GroupCard } from '../../../src/components/group/GroupCard';
import type { GroupRun, GroupMember } from '../../../src/api/types';

const MOCK_GROUPS: GroupRun[] = [
  {
    id: 'g1',
    creatorId: 'u1',
    date: '2026-11-11',
    timeSlot: '05:30',
    meetingPoint: { name: 'Công viên Gia Định', latitude: 10.8125, longitude: 106.6789 },
    distanceKm: 5,
    rankRange: 'same',
    status: 'open',
    maxMembers: 6,
    members: [
      { userId: 'u1', userName: 'Minh Anh', rank: 'bạc', confirmed: true, arrived: false, punctuality: 92 },
      { userId: 'u2', userName: 'Thanh Tùng', rank: 'bạc', confirmed: true, arrived: false, punctuality: 88 },
    ],
  },
  {
    id: 'g2',
    creatorId: 'u3',
    date: '2026-11-11',
    timeSlot: '06:00',
    meetingPoint: { name: 'Hồ Con Rùa', latitude: 10.7815, longitude: 106.6952 },
    distanceKm: 3,
    rankRange: 'within1',
    status: 'open',
    maxMembers: 4,
    members: [
      { userId: 'u3', userName: 'Hồng Nhung', rank: 'vàng', confirmed: true, arrived: false, punctuality: 95 },
    ],
  },
  {
    id: 'g3',
    creatorId: 'u5',
    date: '2026-11-11',
    timeSlot: '17:30',
    meetingPoint: { name: 'Thảo Cầm Viên', latitude: 10.7875, longitude: 106.7053 },
    distanceKm: 7,
    rankRange: 'any',
    status: 'open',
    maxMembers: 6,
    members: [
      { userId: 'u5', userName: 'Quốc Bảo', rank: 'kim_cương', confirmed: true, arrived: false, punctuality: 97 },
      { userId: 'u6', userName: 'Phương Linh', rank: 'đồng', confirmed: false, arrived: false, punctuality: 78 },
      { userId: 'u7', userName: 'Đức Huy', rank: 'vàng', confirmed: true, arrived: false, punctuality: 90 },
    ],
  },
  {
    id: 'g4',
    creatorId: 'u8',
    date: '2026-11-11',
    timeSlot: '19:00',
    meetingPoint: { name: 'Landmark 81 Park', latitude: 10.7952, longitude: 106.7219 },
    distanceKm: 10,
    rankRange: 'within2',
    status: 'open',
    maxMembers: 6,
    members: [
      { userId: 'u8', userName: 'Khánh Vy', rank: 'bạch_kim', confirmed: true, arrived: false, punctuality: 94 },
      { userId: 'u9', userName: 'Trọng Nhân', rank: 'vàng', confirmed: true, arrived: false, punctuality: 86 },
      { userId: 'u10', userName: 'Mai Linh', rank: 'bạch_kim', confirmed: false, arrived: false, punctuality: 91 },
      { userId: 'u11', userName: 'Hoàng Nam', rank: 'bạc', confirmed: true, arrived: false, punctuality: 83 },
    ],
  },
];

const RANK_RANGE_LABELS: Record<string, string> = {
  same: 'Cùng hạng',
  within1: 'Chênh 1 hạng',
  within2: 'Chênh 2 hạng',
  any: 'Mọi hạng',
};

export default function GroupsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = MOCK_GROUPS.filter(
    (g) =>
      g.meetingPoint.name.toLowerCase().includes(search.toLowerCase()) ||
      g.timeSlot.includes(search),
  );

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3">
        <Text className="text-white text-2xl font-bold mb-3">Nhóm chạy</Text>

        {/* Search */}
        <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-3 py-2 mb-4">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            className="flex-1 text-white ml-2 text-sm"
            placeholder="Tìm theo địa điểm, giờ..."
            placeholderTextColor={colors.textMuted}
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
        <View className="flex-row gap-3 mb-2">
          <TouchableOpacity
            className="flex-1 bg-km-primary rounded-xl py-3 items-center flex-row justify-center"
            onPress={() => router.push('/(runner)/groups/create')}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
            <Text className="text-km-bg font-semibold ml-2">Tự lập nhóm</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-km-accent rounded-xl py-3 items-center flex-row justify-center">
            <Ionicons name="shuffle-outline" size={20} color={colors.white} />
            <Text className="text-white font-semibold ml-2">Ghép tự động</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group List */}
      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text className="text-slate-400 text-base mt-4 text-center">
            Không tìm thấy nhóm nào phù hợp
          </Text>
          <Text className="text-slate-500 text-sm mt-1 text-center">
            Thử thay đổi từ khoá hoặc tự tạo nhóm mới
          </Text>
        </View>
      ) : (
        <FlatList
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
        />
      )}
    </SafeAreaView>
  );
}
