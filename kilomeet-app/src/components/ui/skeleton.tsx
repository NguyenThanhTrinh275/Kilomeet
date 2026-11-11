import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('bg-secondary/70 animate-pulse rounded-xl', className)} {...props} />;
}

export { Skeleton };
