import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: TabIcon }[] = [
  { name: 'index', title: 'Trang chủ', icon: 'home' },
  { name: 'run', title: 'Chạy', icon: 'footsteps' },
  { name: 'vouchers', title: 'Voucher', icon: 'pricetag' },
  { name: 'groups/index', title: 'Nhóm', icon: 'people' },
  { name: 'profile', title: 'Tôi', icon: 'person' },
];

export default function RunnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.surfaceBorder,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={typeof color === 'string' ? color : colors.textMuted} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
