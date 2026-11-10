import { Image, type ImageSourcePropType, type ImageStyle } from 'react-native';
import type { Rank } from '../../api/types';

const BADGE_IMAGES: Record<Rank, ImageSourcePropType> = {
  đồng: require('../../../assets/images/rank_dong.jpg'),
  bạc: require('../../../assets/images/rank_bac.jpg'),
  vàng: require('../../../assets/images/rank_vang.jpg'),
  bạch_kim: require('../../../assets/images/rank_bach_kim.jpg'),
  kim_cương: require('../../../assets/images/rank_kim_cuong.jpg'),
  cao_thủ: require('../../../assets/images/rank_cao_thu.jpg'),
};

const SIZES = { sm: 32, md: 48, lg: 80 } as const;

type Props = {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  style?: ImageStyle;
};

export function RankBadge({ rank, size = 'md', style }: Props) {
  const px = SIZES[size];
  return (
    <Image
      source={BADGE_IMAGES[rank]}
      style={[{ width: px, height: px, borderRadius: px / 6 }, style]}
      resizeMode="contain"
    />
  );
}
