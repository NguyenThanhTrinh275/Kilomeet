import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

type Props = {
  startTime: string;
  meetingPointName: string;
  distance: number;
  memberCount: number;
  maxMembers: number;
  rankRange: string;
  onPress: () => void;
};

export function GroupCard({
  startTime, meetingPointName, distance, memberCount, maxMembers, rankRange, onPress,
}: Props) {
  return (
    <TouchableOpacity
      className="bg-km-bg-secondary rounded-2xl p-4 mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-km-primary/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <View>
            <Text className="text-white font-semibold">{startTime}</Text>
            <Text className="text-slate-400 text-xs">{meetingPointName}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-slate-400 text-xs">{memberCount}/{maxMembers} người</Text>
          <Text className="text-slate-500 text-xs">{distance} km</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center bg-km-surface rounded-lg px-2 py-1">
          <Ionicons name="trophy-outline" size={14} color={colors.textMuted} />
          <Text className="text-slate-400 text-xs ml-1">{rankRange}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}
