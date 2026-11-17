import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { toast } from 'sonner-native';
import { Camera, Check, Coffee, Dumbbell, Eye, Info, Phone, Plus, ShieldCheck, Sparkles, Store as StoreIcon, Trophy, X } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import type { Store, StoreCoverTheme, StoreHighlight, StoreOpeningHours, StoreProfile, StoreProfileUpdate } from '../../src/api/types';
import { C, DEPTH, FONT, GAME_MAP_STYLE, TONE, type Tone } from '../../src/theme/game';
import { fmtVnd } from '../../src/lib/format';
import { profileCompleteness } from '../../src/lib/storeProfile';
import {
  Body,
  Card,
  Chip,
  GButton,
  GInput,
  GText,
  IconTile,
  Loading,
  MapPin,
  Row,
  Screen,
  StickyBar,
  StoreCover,
  Toggle,
  TopBar,
  XPBar,
} from '../../src/components/game';

const PRESET_TAGS = ['Cà phê', 'Trà', 'Wifi', 'Gửi xe', 'Ngồi ngoài trời', 'Nước free cho runner', 'Bánh ngọt', 'Máy lạnh', 'Phòng thay đồ', 'Mang đi'];
const MAX_TAGS = 6;
const THEMES: { value: StoreCoverTheme; label: string; tone: Tone; icon: typeof Coffee }[] = [
  { value: 'coffee', label: 'Cà phê', tone: 'orange', icon: Coffee },
  { value: 'tea', label: 'Trà', tone: 'green', icon: StoreIcon },
  { value: 'gym', label: 'Thể thao', tone: 'sky', icon: Dumbbell },
];
const HL_TONES: Tone[] = ['orange', 'coin', 'green'];
const DEFAULT_HOURS: StoreOpeningHours[] = [
  { label: 'T2 – T6', open: '06:00', close: '22:00', enabled: true },
  { label: 'Thứ 7', open: '06:30', close: '23:00', enabled: true },
  { label: 'Chủ nhật', open: '06:30', close: '23:00', enabled: true },
];

function TimeBox({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/[^\d:]/g, '').slice(0, 5))}
      editable={!disabled}
      keyboardType="numbers-and-punctuation"
      style={{
        width: 62,
        textAlign: 'center',
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: C.sunken,
        borderWidth: 1.5,
        borderColor: C.ink900,
        fontFamily: FONT.num,
        fontSize: 14,
        color: disabled ? C.ink300 : C.ink900,
      }}
    />
  );
}

export default function StoreProfileEditor() {
  const user = useAuthStore((s) => s.user) as Store | null;
  const [p, setP] = useState<StoreProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; price: string } | null>(null);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    api
      .get<StoreProfile>('/store/profile')
      .then(setP)
      .catch(() =>
        setP({
          storeId: user?.id ?? '',
          storeName: user?.storeName ?? '',
          tagline: '',
          description: '',
          address: user?.storeAddress ?? '',
          latitude: user?.latitude ?? 10.773,
          longitude: user?.longitude ?? 106.66,
          coverTheme: 'coffee',
          tags: [],
          openingHours: DEFAULT_HOURS,
          highlights: [],
          phone: '',
          verified: user?.approved ?? false,
          totalUsages: user?.totalUsages ?? 0,
          runnerSharePercent: 0,
        }),
      );
  }, [user]);

  const comp = useMemo(() => profileCompleteness(p), [p]);
  if (!p) return <Loading />;

  const set = <K extends keyof StoreProfile>(k: K, v: StoreProfile[K]) => setP((cur) => (cur ? { ...cur, [k]: v } : cur));
  const toggleTag = (t: string) => {
    if (p.tags.includes(t)) set('tags', p.tags.filter((x) => x !== t));
    else if (p.tags.length >= MAX_TAGS) toast.warning(`Chọn tối đa ${MAX_TAGS} tiện ích`);
    else set('tags', [...p.tags, t]);
  };
  const setHour = (i: number, patch: Partial<StoreOpeningHours>) => set('openingHours', p.openingHours.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const addHighlight = () => {
    if (!newItem) return setNewItem({ name: '', price: '' });
    const price = Number(newItem.price.replace(/\D/g, ''));
    if (!newItem.name.trim() || !price) return toast.warning('Nhập tên món và giá');
    set('highlights', [...p.highlights, { name: newItem.name.trim(), priceVnd: price } as StoreHighlight].slice(0, 3));
    setNewItem(null);
  };

  const save = async () => {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (p.openingHours.some((h) => h.enabled && (!hhmm.test(h.open) || !hhmm.test(h.close)))) {
      toast.warning('Giờ mở cửa phải theo dạng HH:mm');
      return;
    }
    setSaving(true);
    try {
      const body: StoreProfileUpdate = {
        storeName: p.storeName.trim(),
        tagline: p.tagline.trim(),
        description: p.description.trim(),
        coverTheme: p.coverTheme,
        tags: p.tags,
        openingHours: p.openingHours,
        highlights: p.highlights,
        phone: p.phone.trim(),
      };
      setP(await api.post<StoreProfile>('/store/profile', body));
      toast.success('Đã lưu hồ sơ quán', { description: 'Người chạy sẽ thấy giới thiệu mới ngay.' });
    } catch (e) {
      toast.error('Không lưu được hồ sơ', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar title="Hồ sơ quán" action={Eye} onAction={() => router.push(`/(runner)/store/${p.storeId}`)} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Body gap={16} padBottom={140}>
          {/* Nhiệm vụ của quán */}
          <Card fill={C.coin300} gap={10}>
            <Row gap={10}>
              <IconTile icon={Trophy} size={44} iconSize={24} fill={C.coin500} radius={14} sw={2.5} depth="small" />
              <View style={{ flex: 1 }}>
                <GText v="caps" color={C.orange700}>
                  Nhiệm vụ của quán
                </GText>
                <GText v="titleS">Hoàn thiện hồ sơ {Math.round((comp.done / comp.total) * 100)}%</GText>
              </View>
              <GText v="numM">
                {comp.done}/{comp.total}
              </GText>
            </Row>
            <XPBar pct={comp.done / comp.total} tone="orange" height={16} />
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {comp.items.map(([t, ok]) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: ok ? C.green300 : C.surface, borderWidth: 1.5, borderColor: C.ink900 }}>
                  {ok ? <Check size={12} color={C.green700} strokeWidth={3} /> : <Plus size={12} color={C.ink500} strokeWidth={3} />}
                  <GText v="bodyS" color={ok ? C.ink900 : C.ink500}>
                    {t}
                  </GText>
                </View>
              ))}
            </Row>
            <GText v="bodyS" color={C.ink700}>
              Người chạy đọc phần giới thiệu này trước khi mua voucher của quán.
            </GText>
          </Card>

          {/* Ảnh bìa */}
          <GText v="caps" color={C.ink500}>
            Ảnh bìa & logo
          </GText>
          <View>
            <View style={[{ borderRadius: 20, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
              <StoreCover theme={p.coverTheme} height={180} />
            </View>
            <View style={[{ position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900 }, DEPTH.small]}>
              <Camera size={16} color={C.ink900} strokeWidth={2.5} />
              <GText v="bodyMStrong">Ảnh minh hoạ</GText>
            </View>
            <View style={[{ position: 'absolute', left: 16, bottom: -24, width: 72, height: 72, borderRadius: 22, backgroundColor: C.orange500, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.chunky]}>
              <StoreIcon size={38} color={C.ink900} strokeWidth={2.5} />
            </View>
          </View>
          <Row gap={6} style={{ marginLeft: 100, flexWrap: 'wrap' }}>
            {THEMES.map((t) => (
              <Chip key={t.value} label={t.label} icon={t.icon} selected={p.coverTheme === t.value} tone={t.tone} onPress={() => set('coverTheme', t.value)} />
            ))}
          </Row>

          <GInput label="Tên quán" icon={StoreIcon} value={p.storeName} onChangeText={(v) => set('storeName', v)} />
          <GInput label="Câu giới thiệu ngắn (hiện trên thẻ quán)" icon={Sparkles} value={p.tagline} onChangeText={(v) => set('tagline', v)} maxLength={60} counter placeholder="VD: Cà phê rang xay cạnh HCMUT" />
          <GInput
            label="Giới thiệu chi tiết"
            multiline
            value={p.description}
            onChangeText={(v) => set('description', v)}
            maxLength={500}
            counter
            hint="Mẹo: nói vì sao quán hợp với người chạy"
            placeholder="Quán có gì đặc biệt? Giờ nào đông? Có chỗ gửi xe, nước miễn phí cho runner không?"
          />

          {/* Tiện ích */}
          <Row between>
            <GText v="caps" color={C.ink500}>
              Tiện ích của quán
            </GText>
            <GText v="bodyS" color={C.ink500}>
              {p.tags.length}/{MAX_TAGS}
            </GText>
          </Row>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {[...new Set([...PRESET_TAGS, ...p.tags])].map((t) => (
              <Chip key={t} label={t} icon={p.tags.includes(t) ? Check : undefined} selected={p.tags.includes(t)} tone="orange" onPress={() => toggleTag(t)} />
            ))}
          </Row>
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <GInput placeholder="Thêm tiện ích khác..." value={customTag} onChangeText={setCustomTag} icon={Plus} />
            </View>
            <GButton
              label="Thêm"
              size="M"
              type="secondary"
              onPress={() => {
                const t = customTag.trim();
                if (t) {
                  toggleTag(t);
                  setCustomTag('');
                }
              }}
            />
          </Row>

          {/* Giờ mở cửa */}
          <GText v="caps" color={C.ink500}>
            Giờ mở cửa
          </GText>
          <Card pad={[4, 14]} gap={0} depth="small">
            {p.openingHours.map((h, i) => (
              <Row key={h.label} gap={8} style={{ paddingVertical: 10, borderBottomWidth: i < p.openingHours.length - 1 ? 1.5 : 0, borderBottomColor: C.ink300 }}>
                <GText v="bodyMStrong" style={{ flex: 1 }} color={h.enabled ? C.ink900 : C.ink500}>
                  {h.label}
                </GText>
                <TimeBox value={h.open} onChange={(v) => setHour(i, { open: v })} disabled={!h.enabled} />
                <TimeBox value={h.close} onChange={(v) => setHour(i, { close: v })} disabled={!h.enabled} />
                <Toggle size="s" value={h.enabled} onChange={(v) => setHour(i, { enabled: v })} />
              </Row>
            ))}
          </Card>

          {/* Món nổi bật */}
          <Row between>
            <GText v="caps" color={C.ink500}>
              Món nổi bật
            </GText>
            <GText v="bodyS" color={C.ink500}>
              {p.highlights.length}/3
            </GText>
          </Row>
          {p.highlights.map((h, i) => {
            const tone = HL_TONES[i % 3]!;
            return (
              <Card key={`${h.name}-${i}`} row pad={10} gap={12} depth="small">
                <IconTile icon={i === 0 ? Coffee : Sparkles} size={52} iconSize={24} fill={TONE[tone][300]} color={TONE[tone][700]} radius={14} />
                <View style={{ flex: 1 }}>
                  <GText v="bodyMStrong">{h.name}</GText>
                  <GText v="numS" color={C.ink700}>
                    {fmtVnd(h.priceVnd)}
                  </GText>
                </View>
                <Pressable onPress={() => set('highlights', p.highlights.filter((_, j) => j !== i))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.sunken, borderWidth: 1.5, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color={C.ink700} strokeWidth={2.5} />
                </Pressable>
              </Card>
            );
          })}
          {p.highlights.length < 3 ? (
            newItem ? (
              <Card gap={10} pad={12} depth="small">
                <GInput placeholder="Tên món" value={newItem.name} onChangeText={(name) => setNewItem({ ...newItem, name })} />
                <GInput placeholder="Giá (VND)" keyboardType="number-pad" value={newItem.price} onChangeText={(price) => setNewItem({ ...newItem, price })} />
                <Row gap={10}>
                  <GButton label="Huỷ" type="secondary" size="M" onPress={() => setNewItem(null)} flex />
                  <GButton label="Thêm món" size="M" icon={Check} onPress={addHighlight} flex />
                </Row>
              </Card>
            ) : (
              <Pressable onPress={addHighlight} style={{ height: 72, borderRadius: 20, borderWidth: 2, borderColor: C.ink500, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Plus size={20} color={C.ink500} strokeWidth={2.5} />
                <GText v="bodyMStrong" color={C.ink500}>
                  Thêm món (tên, giá)
                </GText>
              </Pressable>
            )
          ) : null}

          <GInput label="Số điện thoại" icon={Phone} keyboardType="phone-pad" value={p.phone} onChangeText={(v) => set('phone', v)} placeholder="0909 123 456" />

          {/* Vị trí */}
          <GText v="caps" color={C.ink500}>
            Vị trí quán
          </GText>
          <Card row pad={10} gap={12} depth="small">
            <View style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden' }}>
              <MapView
                style={{ flex: 1 }}
                customMapStyle={GAME_MAP_STYLE}
                initialRegion={{ latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}>
                <Marker coordinate={{ latitude: p.latitude, longitude: p.longitude }} anchor={{ x: 0.5, y: 1 }}>
                  <MapPin kind="store" size={28} />
                </Marker>
              </MapView>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <GText v="bodyMStrong">{p.address || `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}</GText>
              <Row gap={4}>
                <ShieldCheck size={14} color={p.verified ? C.green700 : C.coin700} strokeWidth={2.5} />
                <GText v="bodyS" color={p.verified ? C.green700 : C.coin700}>
                  {p.verified ? 'Đã xác minh' : 'Chờ xác minh'}
                </GText>
              </Row>
              <GText v="bodyS" color={C.ink500}>
                Đổi vị trí cần quản trị duyệt lại
              </GText>
            </View>
          </Card>
          <Row gap={6}>
            <Info size={14} color={C.ink500} strokeWidth={2.5} />
            <GText v="bodyS" color={C.ink500} style={{ flex: 1 }}>
              Vị trí dùng để xác minh nhiệm vụ "chạy ngang qua quán" trong bán kính 50 m.
            </GText>
          </Row>
        </Body>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <StickyBar>
          <GButton label="Xem trước" type="secondary" icon={Eye} onPress={() => router.push(`/(runner)/store/${p.storeId}`)} flex />
          <GButton label="Lưu hồ sơ" icon={Check} loading={saving} onPress={() => void save()} flex />
        </StickyBar>
      </View>
    </Screen>
  );
}
