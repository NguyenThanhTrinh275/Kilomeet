import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/stores/auth';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Role = 'runner' | 'store';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nhập tối thiểu 2 ký tự'),
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  storeName: z.string().trim().optional(),
  storeAddress: z.string().trim().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [role, setRole] = useState<Role>('runner');
  const [storePos, setStorePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const pickStoreLocation = async () => {
    setLocating(true);
    setLocalError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Cần quyền vị trí để lấy toạ độ quán');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStorePos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', storeName: '', storeAddress: '' },
  });

  const onSubmit = handleSubmit(async ({ email, name, password, storeName, storeAddress }) => {
    setLocalError(null);
    if (role === 'store' && (!storeName || !storeAddress || !storePos)) {
      setLocalError('Vui lòng nhập tên quán, địa chỉ và lấy vị trí quán');
      return;
    }
    try {
      await register(
        email,
        name,
        password,
        role === 'store' ? { role, storeName, storeAddress, ...storePos! } : { role },
      );
    } catch {
      return;
    }
    const user = useAuthStore.getState().user;
    if (user?.role === 'store') router.replace('/(store)');
    else if (user?.role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  });

  return (
    <SafeAreaView className="flex-1 bg-km-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
          {/* Header */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text className="text-foreground text-2xl font-bold">Đăng ký</Text>
          </View>

          {/* Role Selector */}
          <View className="mb-6">
            <Text className="text-muted-foreground text-sm mb-3">Bạn là</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 h-16 rounded-xl items-center justify-center border ${
                  role === 'runner'
                    ? 'bg-km-primary/10 border-km-primary'
                    : 'bg-km-bg-secondary border-km-surface-light'
                }`}
                onPress={() => setRole('runner')}>
                <Ionicons
                  name="footsteps"
                  size={20}
                  color={role === 'runner' ? colors.primary : colors.textMuted}
                />
                <Text className={`text-sm mt-1 ${role === 'runner' ? 'text-km-primary font-semibold' : 'text-slate-500'}`}>
                  Người chạy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 h-16 rounded-xl items-center justify-center border ${
                  role === 'store'
                    ? 'bg-km-accent/10 border-km-accent'
                    : 'bg-km-bg-secondary border-km-surface-light'
                }`}
                onPress={() => setRole('store')}>
                <Ionicons
                  name="storefront"
                  size={20}
                  color={role === 'store' ? colors.accent : colors.textMuted}
                />
                <Text className={`text-sm mt-1 ${role === 'store' ? 'text-km-accent font-semibold' : 'text-slate-500'}`}>
                  Cửa hàng
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View className="gap-4">
            <FormInput
              control={control}
              name="name"
              label="Họ tên"
              placeholder="Nguyễn Văn A"
              inputClassName="h-14"
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.textMuted} />}
            />

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
              placeholder="Tối thiểu 6 ký tự"
              secureTextEntry
              inputClassName="h-14"
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
            />

            {role === 'store' && (
              <>
                <FormInput
                  control={control}
                  name="storeName"
                  label="Tên cửa hàng"
                  placeholder="VD: Fuji Coffee"
                  inputClassName="h-14"
                  leftIcon={<Ionicons name="storefront-outline" size={20} color={colors.textMuted} />}
                />
                <FormInput
                  control={control}
                  name="storeAddress"
                  label="Địa chỉ"
                  placeholder="VD: 268 Lý Thường Kiệt, Q.10"
                  inputClassName="h-14"
                  leftIcon={<Ionicons name="location-outline" size={20} color={colors.textMuted} />}
                />
                <Button variant="outline" onPress={() => void pickStoreLocation()} disabled={locating}>
                  <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                  <Text>
                    {locating
                      ? 'Đang lấy vị trí...'
                      : storePos
                        ? `Vị trí quán: ${storePos.latitude.toFixed(5)}, ${storePos.longitude.toFixed(5)}`
                        : 'Lấy vị trí quán (đứng tại quán)'}
                  </Text>
                </Button>
                <Text className="text-slate-500 text-xs">
                  Cửa hàng mới cần quản trị viên duyệt trước khi tạo voucher. Vị trí dùng để xác minh nhiệm vụ "chạy ngang qua quán" (50 m).
                </Text>
              </>
            )}

            {localError || error ? (
              <Alert icon={AlertCircle} variant="destructive">
                <AlertDescription>{localError ?? error}</AlertDescription>
              </Alert>
            ) : null}

            <Button size="lg" className="mt-2" onPress={() => void onSubmit()} disabled={isLoading}>
              <Text>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</Text>
            </Button>

            {/* Wallet note */}
            <View className="flex-row items-center bg-km-bg-secondary border border-border rounded-xl p-4 mt-2">
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              <Text className="text-muted-foreground text-xs ml-3 flex-1">
                Ví Avalanche sẽ được tạo tự động khi đăng ký. Bạn không cần chuẩn bị gì thêm.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
