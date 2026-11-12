import { View, Text, Platform } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
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

const RIPPLE_CONFIG = { color: 'rgba(15, 23, 42, 0.06)', foreground: true };

export function GroupCard({
  startTime, meetingPointName, distance, memberCount, maxMembers, rankRange, onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={RIPPLE_CONFIG}
      style={({ pressed }) => [
        { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
        Platform.OS === 'ios' && pressed ? { opacity: 0.78 } : undefined,
      ]}>
      <View className="bg-km-bg-secondary border border-border rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-km-primary/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View>
              <Text className="text-foreground font-semibold">{startTime}</Text>
              <Text className="text-slate-500 text-xs">{meetingPointName}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-slate-500 text-xs">{memberCount}/{maxMembers} người</Text>
            <Text className="text-slate-500 text-xs">{distance} km</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center bg-km-surface rounded-lg px-2 py-1">
            <Ionicons name="trophy-outline" size={14} color={colors.textMuted} />
            <Text className="text-slate-500 text-xs ml-1">{rankRange}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}
