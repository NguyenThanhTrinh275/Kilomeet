import { Image, type ImageStyle } from 'react-native';

const SIZES = { sm: 32, md: 48, lg: 80 } as const;

type Props = {
  size?: 'sm' | 'md' | 'lg';
  style?: ImageStyle;
};

export function AppLogo({ size = 'md', style }: Props) {
  const px = SIZES[size];
  return (
    <Image
      source={require('../../../assets/images/app_icon.jpg')}
      style={[{ width: px, height: px, borderRadius: px / 5 }, style]}
      resizeMode="contain"
    />
  );
}
