import { View } from 'react-native';
import { colors } from '../../theme/colors';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Progress } from '@/components/ui/progress';

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
    <Card className="mb-3 gap-2.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Badge variant={type === 'daily' ? 'default' : 'accent'}>
            <Text>{type === 'daily' ? 'NGÀY' : 'TUẦN'}</Text>
          </Badge>
          <Text className="text-white font-semibold">{title}</Text>
        </View>
        {completed && (
          <Badge variant="default">
            <Text>✓ Hoàn thành</Text>
          </Badge>
        )}
      </View>

      <Text className="text-muted-foreground text-sm">{requirement}</Text>

      <Progress value={progressPct} indicatorColor={typeColor} />

      <View className="flex-row justify-between">
        <Text className="text-slate-500 text-xs">
          {progress.toFixed(1)} / {target} km
        </Text>
        <Text className="text-km-accent text-xs font-semibold">+{reward} token</Text>
      </View>
    </Card>
  );
}
