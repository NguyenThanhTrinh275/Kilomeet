import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Text, View, type GestureResponderEvent, type ViewProps } from 'react-native';
import { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

const OVERLAY_ENTERING = FadeIn.duration(180)
  .easing(Easing.bezier(0.05, 0.7, 0.1, 1))
  .reduceMotion(ReduceMotion.System);
const OVERLAY_EXITING = FadeOut.duration(100)
  .easing(Easing.bezier(0.3, 0, 0.8, 0.15))
  .reduceMotion(ReduceMotion.System);
const CONTENT_ENTERING = FadeIn.duration(180)
  .easing(Easing.bezier(0.05, 0.7, 0.1, 1))
  .reduceMotion(ReduceMotion.System);
const CONTENT_EXITING = FadeOut.duration(100)
  .easing(Easing.bezier(0.3, 0, 0.8, 0.15))
  .reduceMotion(ReduceMotion.System);

function DialogOverlay({
  className,
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: React.ReactNode;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/75 p-4',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
          }),
          className
        )}
        {...props}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={Platform.OS !== 'web'}>
        <NativeOnlyAnimatedView
          entering={OVERLAY_ENTERING}
          exiting={OVERLAY_EXITING}
          as="Pressable">
          <NativeOnlyAnimatedView entering={CONTENT_ENTERING} exiting={CONTENT_EXITING}>
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

function DialogContent({
  className,
  portalHost,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
}) {
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay>
        <DialogPrimitive.Content
          className={cn(
            'bg-card border-border z-50 mx-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl border p-6 shadow-xl shadow-black/25',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-150',
            }),
            className
          )}
          {...props}>
          <>{children}</>
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 rounded-full p-1 opacity-70 active:opacity-100',
              Platform.select({
                web: 'ring-offset-background focus:ring-ring transition-opacity hover:opacity-100 focus:outline-none focus:ring-2',
              })
            )}
            hitSlop={12}>
            <Icon as={X} className="text-muted-foreground size-4 shrink-0" />
            <Text className="sr-only">Close</Text>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function DialogFooter({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-row gap-3 justify-end', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-xl font-bold leading-none', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm leading-5', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
