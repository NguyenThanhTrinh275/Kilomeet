import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { AppLogo } from '../../src/components/common/AppLogo';
import { useAuthStore } from '../../src/stores/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const user = useAuthStore((s) => s.user);
  const getHomeRoute = useAuthStore((s) => s.getHomeRoute);

  const navigateByRole = () => {
    const role = user?.role;
    if (role === 'store') router.replace('/(store)');
    else if (role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  };

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email || 'lan@demo.com';
    const p = loginPassword || password || 'demo123';
    try {
      await login(e, p);
    } catch {
      // error is set in store, displayed below
      return;
    }
    // Route based on user role from store (checked after login resolves)
    const store = useAuthStore.getState();
    const role = store.user?.role;
    if (role === 'store') router.replace('/(store)');
    else if (role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  };

  const quickLogin = (demoEmail: string) => {
    handleLogin(demoEmail, 'demo123');
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
        style={{ flex: 1, justifyContent: 'center' }}
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <AppLogo size="lg" style={{ marginBottom: 16 }} />
          <Text className="text-white text-3xl font-bold">KILOMeet</Text>
          <Text className="text-slate-400 text-base mt-1">Chạy bộ theo mùa</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="text-slate-400 text-sm mb-2">Email</Text>
            <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-14 border border-km-surface-light">
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              <TextInput
                className="flex-1 text-white text-base ml-3"
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View>
            <Text className="text-slate-400 text-sm mb-2">Mật khẩu</Text>
            <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-14 border border-km-surface-light">
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <TextInput
                className="flex-1 text-white text-base ml-3"
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error display */}
          {error ? (
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`h-14 rounded-xl items-center justify-center mt-2 ${isLoading ? 'bg-km-primary-dark' : 'bg-km-primary'}`}
            onPress={() => handleLogin()}
            disabled={isLoading}
          >
            <Text className="text-white text-lg font-semibold">
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-2"
            onPress={() => router.push('/(auth)/register')}
          >
            <Text className="text-slate-400">
              Chưa có tài khoản? <Text className="text-km-primary font-semibold">Đăng ký</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Quick Login */}
        <View className="mt-8 pt-6 border-t border-km-surface">
          <Text className="text-slate-500 text-xs text-center mb-3">DEMO — Đăng nhập nhanh</Text>
          <View className="flex-row flex-wrap gap-2 justify-center">
            {[
              { label: '🏃 Người chạy', email: 'lan@demo.com' },
              { label: '⭐ Hội viên', email: 'minh@demo.com' },
              { label: '🏪 Cửa hàng', email: 'quanfuji@demo.com' },
              { label: '⚙️ Quản trị', email: 'admin@demo.com' },
            ].map((acc) => (
              <TouchableOpacity
                key={acc.email}
                className="bg-km-surface px-3 py-2 rounded-lg"
                onPress={() => quickLogin(acc.email)}
              >
                <Text className="text-slate-300 text-xs">{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
