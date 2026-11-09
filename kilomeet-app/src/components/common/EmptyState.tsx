import { View, Image, Text, type ImageSourcePropType } from 'react-native';

const ILLUSTRATIONS: Record<EmptyStateType, ImageSourcePropType> = {
  runs: require('../../../assets/images/empty_runs.png'),
  vouchers: require('../../../assets/images/empty_vouchers.png'),
  groups: require('../../../assets/images/empty_groups.png'),
};

type EmptyStateType = 'runs' | 'vouchers' | 'groups';

type Props = {
  type: EmptyStateType;
  message: string;
};

export function EmptyState({ type, message }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <Image
        source={ILLUSTRATIONS[type]}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />
      <Text className="text-slate-400 text-base text-center mt-4">
        {message}
      </Text>
    </View>
  );
}
