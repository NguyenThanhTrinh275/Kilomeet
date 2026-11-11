import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-6 w-11 shrink-0 flex-row items-center rounded-full border border-transparent px-0.5',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.checked ? 'bg-primary' : 'bg-secondary',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          'size-5 rounded-full bg-white shadow-sm',
          Platform.select({
            web: 'pointer-events-none block ring-0 transition-transform',
          }),
          props.checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
