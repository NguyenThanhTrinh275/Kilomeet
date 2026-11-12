import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color?: string;
};

export function StatsCard({ icon, value, label, color = colors.primary }: Props) {
  return (
    <View className="bg-km-bg-secondary border border-border rounded-2xl p-4 flex-1">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={18} color={color} />
        <Text className="text-slate-500 text-xs ml-2">{label}</Text>
      </View>
      <Text className="text-foreground text-xl font-bold">{value}</Text>
    </View>
  );
}
