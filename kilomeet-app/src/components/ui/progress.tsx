import { cn } from '@/lib/utils';
import * as ProgressPrimitive from '@rn-primitives/progress';
import { Platform, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

function Progress({
  className,
  value,
  indicatorClassName,
  indicatorColor,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  indicatorColor?: string;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn('bg-secondary relative h-2 w-full overflow-hidden rounded-full', className)}
      value={value}
      {...props}>
      <Indicator value={value} className={indicatorClassName} color={indicatorColor} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

const Indicator = Platform.select({
  web: WebIndicator,
  native: NativeIndicator,
  default: NullIndicator,
});

type IndicatorProps = {
  value: number | undefined | null;
  className?: string;
  color?: string;
};

function WebIndicator({ value, className, color }: IndicatorProps) {
  if (Platform.OS !== 'web') return null;

  return (
    <View
      className={cn('bg-primary h-full w-full flex-1 transition-all', className)}
      style={{
        transform: `translateX(-${100 - (value ?? 0)}%)`,
        ...(color ? { backgroundColor: color } : undefined),
      }}>
      <ProgressPrimitive.Indicator className={cn('h-full w-full', className)} />
    </View>
  );
}

function NativeIndicator({ value, className, color }: IndicatorProps) {
  const progress = useDerivedValue(() => value ?? 0);

  const indicator = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: withSpring(
          interpolate(progress.value, [0, 100], [0, 1], Extrapolation.CLAMP),
          {
            duration: 220,
            dampingRatio: 1,
            reduceMotion: ReduceMotion.System,
          }
        ),
      },
    ],
  }), [value]);

  if (Platform.OS === 'web') return null;

  return (
    <ProgressPrimitive.Indicator asChild>
      <Animated.View
        style={[
          { transformOrigin: 'left' },
          indicator,
          color ? { backgroundColor: color } : undefined,
        ]}
        className={cn('bg-primary h-full w-full rounded-full', className)}
      />
    </ProgressPrimitive.Indicator>
  );
}

function NullIndicator(_props: IndicatorProps) {
  return null;
}
