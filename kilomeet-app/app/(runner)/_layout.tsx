import { Stack } from 'expo-router';

export default function RunnerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFF5E1' },
        animation: 'ios_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="badges" options={{ headerShown: false }} />
      <Stack.Screen name="voucher/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="groups/create" options={{ headerShown: false }} />
      <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="store/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="season-result" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}
