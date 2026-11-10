import '../global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-km-bg">
        <StatusBar style="light" />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}
