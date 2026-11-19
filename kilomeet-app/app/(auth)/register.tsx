import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { GameMap } from '../../src/components/game/GameMap';
import { AlertCircle, Check, Clock, Crosshair, Footprints, Info, Lock, Mail, MapPin as MapPinIcon, Sparkles, Store, User, Wallet } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth';
import { C, TONE } from '../../src/theme/game';
import {
  Banner,
  Body,
  Card,
  GButton,
  GFormInput,
  GText,
  IconTile,
  MapPin,
  Row,
  Screen,
  Toggle,
  TopBar,
} from '../../src/components/game';

type Role = 'runner' | 'store';
const HCMUT = { latitude: 10.7722, longitude: 106.6596 };

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nhập tối thiểu 2 ký tự'),
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  storeName: z.string().trim().optional(),
  storeAddress: z.string().trim().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

function ClassCard({ on, tone, icon, title, desc, onPress }: { on: boolean; tone: 'green' | 'orange'; icon: typeof Store; title: string; desc: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} pad={14} gap={8} fill={on ? TONE[tone][300] : C.surface} style={{ flex: 1 }}>
      <Row between>
        <IconTile icon={icon} size={48} iconSize={26} fill={on ? TONE[tone][500] : C.sunken} radius={14} sw={2.5} depth="small" />
        <View style={{ width: 24, height: 24, borderRadius: 24, borderWidth: 2, borderColor: C.ink900, backgroundColor: on ? C.ink900 : C.surface, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <Check size={14} color={C.white} strokeWidth={3} /> : null}
        </View>
      </Row>
      <GText v="titleS">{title}</GText>
      <GText v="bodyS" color={C.ink500}>
        {desc}
      </GText>
    </Card>
  );
}

export default function RegisterScreen() {
  const [role, setRole] = useState<Role>('runner');
  const [storePos, setStorePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [allowLocation, setAllowLocation] = useState(true);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const { control, handleSubmit, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', storeName: '', storeAddress: '' },
  });
  // Sửa form (vd. đổi email sau khi báo "Email đã được sử dụng") → ẩn lỗi cũ.
  useEffect(() => {
    const sub = watch(() => {
      setLocalError(null);
      if (useAuthStore.getState().error) useAuthStore.setState({ error: null });
    });
    return () => sub.unsubscribe();
  }, [watch]);

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

  const onSubmit = handleSubmit(async ({ email, name, password, storeName, storeAddress }) => {
    setLocalError(null);
    if (role === 'store' && (!storeName || !storeAddress || !storePos)) {
      setLocalError('Vui lòng nhập tên quán, địa chỉ và lấy vị trí quán');
      return;
    }
    if (role === 'runner' && allowLocation) {
      Location.requestForegroundPermissionsAsync().catch(() => undefined);
    }
    try {
      await register(email, name, password, role === 'store' ? { role, storeName, storeAddress, ...storePos! } : { role });
    } catch {
      return;
    }
    const user = useAuthStore.getState().user;
    if (user?.role === 'store') router.replace('/(store)');
    else if (user?.role === 'admin') router.replace('/(admin)');
    else router.replace('/(runner)');
  });

  const pos = storePos ?? HCMUT;

  return (
    <Screen>
      <TopBar title="Tạo tài khoản" action={Info} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Body gap={16}>
          <GText v="caps" color={C.ink500}>
            Bạn là ai?
          </GText>
          <Row gap={12} center={false}>
            <ClassCard on={role === 'runner'} tone="green" icon={Footprints} title="Người chạy" desc="Chạy, làm nhiệm vụ, nhận token" onPress={() => setRole('runner')} />
            <ClassCard on={role === 'store'} tone="orange" icon={Store} title="Đối tác" desc="Tạo voucher, đón khách chạy ngang quán" onPress={() => setRole('store')} />
          </Row>

          <GFormInput control={control} name="name" label={role === 'store' ? 'Tên chủ quán' : 'Họ tên'} icon={User} placeholder="Nguyễn Văn A" />
          {role === 'store' ? (
            <>
              <GFormInput control={control} name="storeName" label="Tên cửa hàng" icon={Store} placeholder="VD: Fuji Coffee" />
              <GFormInput control={control} name="storeAddress" label="Địa chỉ" icon={MapPinIcon} placeholder="VD: 268 Lý Thường Kiệt, Q.10" />
            </>
          ) : null}
          <GFormInput control={control} name="email" label="Email" icon={Mail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <GFormInput control={control} name="password" label="Mật khẩu" icon={Lock} placeholder="Tối thiểu 6 ký tự" secureTextEntry />

          {role === 'store' ? (
            <>
              <Card pad={10} gap={10}>
                <View style={{ height: 150, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden' }}>
                  <GameMap
                    style={{ flex: 1 }}
                    region={{ ...pos, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}>
                    {storePos ? (
                      <Marker coordinate={storePos} anchor={{ x: 0.5, y: 1 }}>
                        <MapPin kind="store" />
                      </Marker>
                    ) : null}
                  </GameMap>
                </View>
                <Row gap={8} style={{ paddingHorizontal: 4 }}>
                  <Crosshair size={18} color={storePos ? C.green700 : C.ink500} strokeWidth={2.5} />
                  <GText v="bodyMStrong" style={{ flex: 1 }}>
                    {storePos ? `${storePos.latitude.toFixed(4)}, ${storePos.longitude.toFixed(4)}` : 'Chưa có vị trí quán'}
                  </GText>
                </Row>
                <GButton label="Lấy vị trí hiện tại" type="secondary" size="M" icon={Crosshair} loading={locating} onPress={() => void pickStoreLocation()} block />
              </Card>
              <Banner icon={Clock} tone="coin" iconColor={C.ink900} text="Sau khi đăng ký, quán sẽ chờ quản trị duyệt trước khi tạo voucher." />
            </>
          ) : (
            <>
              <Banner icon={Wallet} tone="sky" title="Ví Avalanche tự tạo" text="Token & voucher của bạn nằm trên chuỗi Fuji." />
              <Card row pad={12} gap={10} depth="none" sw={2} radius={14}>
                <MapPinIcon size={22} color={C.green700} strokeWidth={2.5} />
                <GText v="bodyMStrong" style={{ flex: 1 }}>
                  Cho phép dùng vị trí khi chạy
                </GText>
                <Toggle value={allowLocation} onChange={setAllowLocation} />
              </Card>
            </>
          )}

          {localError || error ? <Banner icon={AlertCircle} tone="red" text={localError ?? error ?? ''} /> : null}

          <GButton label="Tạo tài khoản" type="accent" icon={Sparkles} loading={isLoading} onPress={() => void onSubmit()} block />
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}
