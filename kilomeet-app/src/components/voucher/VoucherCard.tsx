import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

type Props = {
  id: string;
  storeName: string;
  title: string;
  originalPrice: number;
  discountedPrice?: number;
  questDescription?: string;
  questCompleted?: boolean;
  minRank?: string;
  onPress: () => void;
};

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch kim', kim_cương: 'Kim cương', cao_thủ: 'Cao thủ',
};

export function VoucherCard({
  storeName, title, originalPrice, discountedPrice,
  questDescription, questCompleted, minRank, onPress,
}: Props) {
  const hasDiscount = Boolean(questCompleted && discountedPrice != null && discountedPrice < originalPrice);

  return (
    <TouchableOpacity
      className="bg-km-bg-secondary rounded-2xl overflow-hidden mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Accent top bar */}
      <View className="h-1 bg-km-accent" />

      <View className="p-4">
        {/* Store + Title */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-slate-400 text-xs mb-1">{storeName}</Text>
            <Text className="text-white text-base font-semibold">{title}</Text>
          </View>
          {minRank && (
            <View
              className="px-2 py-1 rounded-md"
              style={{ backgroundColor: (colors.rank[minRank as keyof typeof colors.rank] || colors.textMuted) + '20' }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.rank[minRank as keyof typeof colors.rank] || colors.textMuted }}
              >
                {RANK_LABELS[minRank] || minRank}+
              </Text>
            </View>
          )}
        </View>

        {/* Quest info */}
        {questDescription && (
          <View className={`flex-row items-center mb-3 rounded-lg p-2.5 ${questCompleted ? 'bg-km-primary/10 border border-km-primary/30' : 'bg-km-surface/40'}`}>
            <Ionicons
              name={questCompleted ? 'checkmark-circle' : 'flag-outline'}
              size={16}
              color={questCompleted ? colors.primary : colors.textMuted}
            />
            <Text className={`text-xs ml-2 flex-1 ${questCompleted ? 'text-km-primary font-semibold' : 'text-slate-400'}`}>
              {questCompleted ? `✓ Đã hoàn thành: ${questDescription}` : questDescription}
            </Text>
          </View>
        )}
        {/* Price */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="pricetag" size={16} color={colors.accent} />
            {hasDiscount ? (
              <View className="flex-row items-center ml-2">
                <Text className="text-slate-500 text-sm line-through mr-2">{originalPrice}</Text>
                <Text className="text-km-accent text-lg font-bold">{discountedPrice}</Text>
                <Text className="text-slate-400 text-xs ml-1">token</Text>
              </View>
            ) : (
              <View className="flex-row items-center ml-2">
                <Text className="text-white text-lg font-bold">{originalPrice}</Text>
                <Text className="text-slate-400 text-xs ml-1">token</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
