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
import { useFonts } from 'expo-font';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { C, FONT } from '../src/theme/game';
import { Loading } from '../src/components/game';

enableFreeze(true);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    LilitaOne_400Regular,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={{ flex: 1, backgroundColor: C.bg }}>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar style="dark" />
            {fontsLoaded || fontError ? <Slot /> : <Loading />}
            <PortalHost />
            <Toaster
              position="top-center"
              theme="light"
              richColors
              toastOptions={{
                style: { borderWidth: 2.5, borderColor: C.ink900, borderRadius: 18, boxShadow: `0px 4px 0px ${C.ink900}` },
                titleStyle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink900 },
                descriptionStyle: { fontFamily: FONT.body, fontSize: 13, color: C.ink700 },
              }}
            />
          </View>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
