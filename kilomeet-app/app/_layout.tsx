import '../global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { enableFreeze } from 'react-native-screens';
import { Toaster } from 'sonner-native';

enableFreeze(true);
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
        <BottomSheetModalProvider>
          <View className="flex-1 bg-km-bg" style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
            <StatusBar style="dark" />
            <Slot />
            <PortalHost />
            <Toaster position="top-center" theme="light" richColors />
          </View>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
