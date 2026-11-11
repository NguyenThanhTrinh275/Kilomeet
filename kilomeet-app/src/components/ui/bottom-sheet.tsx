import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import { cn } from '@/lib/utils';

type AppBottomSheetProps = Omit<BottomSheetModalProps, 'children'> & {
  ref?: React.Ref<BottomSheetModal>;
  children: React.ReactNode;
  contentClassName?: string;
};

function renderBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />;
}

function AppBottomSheet({
  ref,
  children,
  contentClassName,
  snapPoints,
  enableDynamicSizing = true,
  ...props
}: AppBottomSheetProps) {
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#475569', width: 40 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      {...props}>
      <BottomSheetView className={cn('px-6 pb-8 pt-2', contentClassName)}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export { AppBottomSheet, BottomSheetModal, BottomSheetTextInput };
