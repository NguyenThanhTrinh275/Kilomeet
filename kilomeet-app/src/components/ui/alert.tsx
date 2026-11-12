import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

function Alert({
  className,
  variant = 'default',
  children,
  icon,
  iconClassName,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    icon: LucideIcon;
    variant?: 'default' | 'destructive' | 'warning';
    iconClassName?: string;
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-destructive',
        variant === 'warning' && 'text-amber-700',
        className
      )}>
      <View
        role="alert"
        className={cn(
          'bg-card border-border relative w-full rounded-2xl border px-4 pb-3 pt-3.5',
          variant === 'destructive' && 'bg-destructive/10 border-destructive/30',
          variant === 'warning' && 'bg-amber-500/10 border-amber-500/30',
          className
        )}
        {...props}>
        <View className="absolute left-3.5 top-3.5">
          <Icon
            as={icon}
            size={18}
            className={cn(
              'text-primary',
              variant === 'destructive' && 'text-destructive',
              variant === 'warning' && 'text-amber-700',
              iconClassName
            )}
          />
        </View>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('mb-1 ml-0.5 min-h-4 pl-7 font-bold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'text-muted-foreground ml-0.5 pl-7 text-xs leading-5',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        textClass?.includes('text-amber-700') && 'text-amber-700/90',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
