import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-card flex h-11 flex-row items-center rounded-xl p-1 border border-border/60',
        Platform.select({ web: 'inline-flex w-fit' }),
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  const active = props.value === value;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-semibold',
        active ? 'text-primary-foreground' : 'text-muted-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex h-full flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
          Platform.select({
            web: 'cursor-pointer whitespace-nowrap transition-[color,background-color]',
          }),
          props.disabled && 'opacity-50',
          active && 'bg-primary',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
