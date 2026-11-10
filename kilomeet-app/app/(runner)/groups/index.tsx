import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { GroupCard } from '../../../src/components/group/GroupCard';
import { useGroupStore } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import type { Runner } from '../../../src/api/types';

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

  // Non-member paywall
  if (!isMember) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="lock-closed-outline" size={64} color={colors.primary} />
          <Text className="text-white text-xl font-bold mt-4 text-center">
            Tính năng dành cho Hội viên
          </Text>
          <Text className="text-slate-400 text-sm mt-2 text-center">
            Nâng cấp Hội viên để tham gia nhóm chạy, ghép nhóm tự động và nhiều quyền lợi hấp dẫn khác.
          </Text>
          <TouchableOpacity
            className="bg-km-primary rounded-xl py-4 px-8 mt-6"
            onPress={() => router.push('/(runner)/profile')}
          >
            <Text className="text-km-bg font-bold text-base">
              Đăng ký Hội viên — 39.000đ/tháng
            </Text>
          </TouchableOpacity>
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
    Alert.alert('Ghép tự động', 'Đang tìm nhóm phù hợp...', [
      {
        text: 'OK',
        onPress: () => fetchGroups(),
      },
    ]);
  };

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
          <TouchableOpacity
            className="flex-1 bg-km-accent rounded-xl py-3 items-center flex-row justify-center"
            onPress={handleAutoMatch}
          >
            <Ionicons name="shuffle-outline" size={20} color={colors.white} />
            <Text className="text-white font-semibold ml-2">Ghép tự động</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
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
