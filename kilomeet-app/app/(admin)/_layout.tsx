import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F4F6F9' },
        animation: 'ios_from_right',
      }}
    />
  );
}
