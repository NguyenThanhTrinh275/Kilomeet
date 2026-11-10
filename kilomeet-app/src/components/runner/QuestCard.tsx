import { View, Text } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  type: 'daily' | 'weekly';
  title: string;
  requirement: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
};

export function QuestCard({ type, title, requirement, reward, progress, target, completed }: Props) {
  const progressPct = Math.min((progress / target) * 100, 100);
  const typeColor = type === 'daily' ? colors.primary : colors.accent;

  return (
    <View className="bg-km-bg-secondary rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View
            className="px-2 py-1 rounded-md mr-2"
            style={{ backgroundColor: typeColor + '20' }}
          >
            <Text className="text-xs font-semibold" style={{ color: typeColor }}>
              {type === 'daily' ? 'NGÀY' : 'TUẦN'}
            </Text>
          </View>
          <Text className="text-white font-semibold">{title}</Text>
        </View>
        {completed && (
          <View className="bg-km-primary/20 px-2 py-1 rounded-md">
            <Text className="text-km-primary text-xs font-semibold">✓ Hoàn thành</Text>
          </View>
        )}
      </View>

      <Text className="text-slate-400 text-sm mb-3">{requirement}</Text>

      {/* Progress bar */}
      <View className="h-2 bg-km-surface rounded-full overflow-hidden mb-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${progressPct}%`, backgroundColor: typeColor }}
        />
      </View>

      <View className="flex-row justify-between">
        <Text className="text-slate-500 text-xs">
          {progress.toFixed(1)} / {target} km
        </Text>
        <Text className="text-km-accent text-xs font-semibold">+{reward} token</Text>
      </View>
    </View>
  );
}
