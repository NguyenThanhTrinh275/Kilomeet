import { Tabs } from 'expo-router';
import { GameTabBar } from '../../../src/components/game';
import { C } from '../../../src/theme/game';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GameTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Sảnh' }} />
      <Tabs.Screen name="vouchers" options={{ title: 'Cửa hàng' }} />
      <Tabs.Screen name="run" options={{ title: 'Chạy' }} />
      <Tabs.Screen name="groups" options={{ title: 'Nhóm' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
