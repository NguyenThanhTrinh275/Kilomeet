import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/stores/auth';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const getHomeRoute = useAuthStore((s) => s.getHomeRoute);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem('hasSeenOnboarding'), restoreSession()]).then(([v, restored]) => {
      if (user || restored) {
        router.replace(getHomeRoute());
      } else if (v !== 'true') {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(auth)/login');
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F6F9', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return null;
}
