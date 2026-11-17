import { Stack } from 'expo-router';

export default function StoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFF5E1' },
        animation: 'ios_from_right',
      }}
    />
  );
}
