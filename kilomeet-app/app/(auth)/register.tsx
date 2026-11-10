import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/stores/auth';
type Role = 'runner' | 'store';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('runner');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    try {
      await register(email, name, password);
    } catch {
      return;
    }
    const user = useAuthStore.getState().user;
    if (user?.role === 'store') router.replace('/(store)');
    else if (user?.role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
          {/* Header */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Đăng ký</Text>
          </View>

          {/* Role Selector */}
          <View className="mb-6">
            <Text className="text-slate-400 text-sm mb-3">Bạn là</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 h-16 rounded-xl items-center justify-center border ${
                  role === 'runner'
                    ? 'bg-km-primary/10 border-km-primary'
                    : 'bg-km-bg-secondary border-km-surface-light'
                }`}
                onPress={() => setRole('runner')}
              >
                <Ionicons
                  name="footsteps"
                  size={20}
                  color={role === 'runner' ? colors.primary : colors.textMuted}
                />
                <Text className={`text-sm mt-1 ${role === 'runner' ? 'text-km-primary font-semibold' : 'text-slate-400'}`}>
                  Người chạy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 h-16 rounded-xl items-center justify-center border ${
                  role === 'store'
                    ? 'bg-km-accent/10 border-km-accent'
                    : 'bg-km-bg-secondary border-km-surface-light'
                }`}
                onPress={() => setRole('store')}
              >
                <Ionicons
                  name="storefront"
                  size={20}
                  color={role === 'store' ? colors.accent : colors.textMuted}
                />
                <Text className={`text-sm mt-1 ${role === 'store' ? 'text-km-accent font-semibold' : 'text-slate-400'}`}>
                  Cửa hàng
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-slate-400 text-sm mb-2">Họ tên</Text>
              <View className="flex-row items-center bg-km-bg-secondary rounded-xl px-4 h-14 border border-km-surface-light">
                <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                <TextInput
                  className="flex-1 text-white text-base ml-3"
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

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
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              className={`h-14 rounded-xl items-center justify-center mt-2 ${
                loading ? 'bg-km-primary-dark' : 'bg-km-primary'
              }`}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text className="text-white text-lg font-semibold">
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Text>
            </TouchableOpacity>

            {/* Wallet note */}
            <View className="flex-row items-center bg-km-bg-secondary rounded-xl p-4 mt-2">
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              <Text className="text-slate-400 text-xs ml-3 flex-1">
                Ví Avalanche sẽ được tạo tự động khi đăng ký. Bạn không cần chuẩn bị gì thêm.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
