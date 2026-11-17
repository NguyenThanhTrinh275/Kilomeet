import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Calendar, Eye, EyeOff, Lock, Mail, Play, Shield, Store } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth';
import { C, type Tone } from '../../src/theme/game';
import type { Rank } from '../../src/api/types';
import {
  Avatar,
  Banner,
  Body,
  Card,
  Coin,
  GButton,
  GFormInput,
  GText,
  Logo,
  Pill,
  RankEmblem,
  Row,
  Screen,
} from '../../src/components/game';

const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO: { name: string; ini: string; fill: string; role: string; tone: Tone; email: string; rank?: Rank; tokens?: string; icon?: typeof Store }[] = [
  { name: 'Lan', ini: 'LN', fill: C.green300, role: 'Người chạy', tone: 'green', email: 'lan@demo.com', rank: 'đồng', tokens: '0' },
  { name: 'Minh', ini: 'MT', fill: C.coin300, role: 'Hội viên', tone: 'coin', email: 'minh@demo.com', rank: 'cao_thủ', tokens: '1.000' },
  { name: 'Fuji Coffee', ini: 'FC', fill: C.orange300, role: 'Cửa hàng', tone: 'orange', email: 'quanfuji@demo.com', icon: Store },
  { name: 'Admin', ini: 'AD', fill: C.sky300, role: 'Quản trị', tone: 'sky', email: 'admin@demo.com', icon: Shield },
];

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const goHome = () => {
    const role = useAuthStore.getState().user?.role;
    if (role === 'store') router.replace('/(store)');
    else if (role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  };

  const performLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      goHome();
    } catch {
      // Lỗi hiện ở banner (auth store)
    }
  };

  const onSubmit = handleSubmit((v) => performLogin(v.email, v.password));

  return (
    <Screen>
      <LinearGradient colors={[C.orange300, C.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Body padTop={28} gap={18} center>
          <Logo size={56} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.ink900 }}>
            <Calendar size={14} color={C.coin500} strokeWidth={2.5} />
            <GText v="caps" color={C.white}>
              Mùa chạy · Avalanche
            </GText>
          </View>
          <GText v="bodyL" color={C.ink500} align="center">
            Chạy bộ theo mùa. Nhận token, leo hạng, đổi voucher.
          </GText>

          <Card pad={20} gap={14} style={{ alignSelf: 'stretch' }}>
            <GFormInput control={control} name="email" label="Email" icon={Mail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <GFormInput
              control={control}
              name="password"
              label="Mật khẩu"
              icon={Lock}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              right={
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                  {showPassword ? <EyeOff size={20} color={C.ink500} strokeWidth={2.5} /> : <Eye size={20} color={C.ink500} strokeWidth={2.5} />}
                </Pressable>
              }
            />
            {error ? <Banner icon={AlertCircle} tone="red" text={error} /> : null}
            <GButton label="Đăng nhập" icon={Play} filledIcon loading={isLoading} onPress={() => void onSubmit()} block />
          </Card>

          <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
            <Row gap={4}>
              <GText v="bodyM" color={C.ink500}>
                Chưa có tài khoản?
              </GText>
              <GText v="bodyMStrong" color={C.orange700}>
                Đăng ký ngay
              </GText>
            </Row>
          </Pressable>

          <Row gap={10} style={{ alignSelf: 'stretch' }}>
            <View style={{ flex: 1, height: 2.5, borderRadius: 2, backgroundColor: C.ink300 }} />
            <GText v="caps" color={C.ink500}>
              Chọn nhân vật demo
            </GText>
            <View style={{ flex: 1, height: 2.5, borderRadius: 2, backgroundColor: C.ink300 }} />
          </Row>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignSelf: 'stretch' }}>
            {DEMO.map((d) => {
              const Icon = d.icon;
              return (
                <Card key={d.email} onPress={() => void performLogin(d.email, 'demo123')} disabled={isLoading} pad={12} gap={8} fill={d.name === 'Minh' ? C.coin300 : C.surface} style={{ width: '47.8%' }}>
                  <Row between>
                    <Avatar initials={d.ini} fill={d.fill} size={40} />
                    {d.rank ? <RankEmblem rank={d.rank} size={30} /> : Icon ? <Icon size={24} color={C.ink500} strokeWidth={2.5} /> : null}
                  </Row>
                  <GText v="titleS">{d.name}</GText>
                  <Pill tone={d.tone} label={d.role} />
                  {d.tokens ? (
                    <Row gap={4}>
                      <Coin size={16} />
                      <GText v="bodyS" color={C.ink700}>
                        {d.tokens} token
                      </GText>
                    </Row>
                  ) : null}
                </Card>
              );
            })}
          </View>
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}
