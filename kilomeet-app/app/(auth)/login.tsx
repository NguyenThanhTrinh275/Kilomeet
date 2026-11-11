import { View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { AppLogo } from '../../src/components/common/AppLogo';
import { useAuthStore } from '../../src/stores/auth';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const navigateByStoreRole = () => {
    const role = useAuthStore.getState().user?.role;
    if (role === 'store') router.replace('/(store)');
    else if (role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  };

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    try {
      await login(loginEmail, loginPassword);
      navigateByStoreRole();
    } catch {
      // Error surfaced via auth store error banner
    }
  };

  const onSubmit = handleSubmit((values) => performLogin(values.email, values.password));

  return (
    <SafeAreaView className="flex-1 bg-km-bg" style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
        style={{ flex: 1, justifyContent: 'center' }}>
        {/* Logo */}
        <View className="items-center mb-10">
          <AppLogo size="lg" style={{ marginBottom: 16 }} />
          <Text className="text-white text-3xl font-bold">KILOMeet</Text>
          <Text className="text-muted-foreground text-base mt-1">Chạy bộ theo mùa</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            inputClassName="h-14"
            leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
          />

          <FormInput
            control={control}
            name="password"
            label="Mật khẩu"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            inputClassName="h-14"
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          {error ? (
            <Alert icon={AlertCircle} variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button size="lg" className="mt-2" onPress={() => void onSubmit()} disabled={isLoading}>
            <Text>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </Button>

          <Button variant="link" onPress={() => router.push('/(auth)/register')}>
            <Text className="text-muted-foreground font-normal">
              Chưa có tài khoản? <Text className="text-primary font-semibold">Đăng ký</Text>
            </Text>
          </Button>
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
              <Button
                key={acc.email}
                variant="secondary"
                size="sm"
                onPress={() => performLogin(acc.email, 'demo123')}>
                <Text className="text-slate-200 font-normal">{acc.label}</Text>
              </Button>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
