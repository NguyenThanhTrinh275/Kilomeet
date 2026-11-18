import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, Share, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { AlertCircle, Check, ChevronLeft, Clock, Coffee, Footprints, Link2, Navigation, Route, ShieldCheck, ShoppingBag, Sparkles, Store, UtensilsCrossed } from 'lucide-react-native';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import type { StoreProfile } from '../../../src/api/types';
import { C, DEPTH, GAME_MAP_STYLE, TONE, type Tone } from '../../../src/theme/game';
import { discountLabel, fmtInt, fmtVnd } from '../../../src/lib/format';
import { isOpenNow, loadStoreProfile } from '../../../src/lib/storeProfile';
import { haversine, getCurrentPosition, type LatLng } from '../../../src/services/location';
import {
  Card,
  Coin,
  EmptyState,
  GButton,
  GText,
  IconButton,
  IconTile,
  Loading,
  MapPin,
  Pill,
  Row,
  SectionHeader,
  StickyBar,
  StoreCover,
  VoucherTicket,
} from '../../../src/components/game';

const HL_TONES: Tone[] = ['orange', 'coin', 'green'];
const HL_ICONS = [Coffee, Sparkles, UtensilsCrossed];

export default function StoreProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templates = useVoucherStore((s) => s.templates);
  const fetchTemplates = useVoucherStore((s) => s.fetchTemplates);
  const runs = useRunnerStore((s) => s.runs);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [vouchersY, setVouchersY] = useState(0);

  useEffect(() => {
    if (!id) return;
    (templates.length ? Promise.resolve() : fetchTemplates().catch(() => undefined))
      .then(() => loadStoreProfile(id, useVoucherStore.getState().templates))
      .then(setProfile)
      .catch((e) => setError((e as Error).message));
    getCurrentPosition().then(setMe).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vouchers = useMemo(() => templates.filter((t) => t.storeId === id && t.remaining > 0), [templates, id]);
  const passed = runs.some((r) => r.passedStoreIds?.includes(id ?? ''));

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ padding: 16 }}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} />
        </View>
        <EmptyState icon={AlertCircle} title="Không tải được trang quán" text={error} />
      </SafeAreaView>
    );
  }
  if (!profile) return <Loading />;

  const open = isOpenNow(profile);
  const distanceM = me ? Math.round(haversine(me, profile) * 1000) : null;
  const minPrice = vouchers.length ? Math.min(...vouchers.map((v) => v.myPrice ?? v.priceTokens)) : null;
  const questDeal = Math.max(0, ...vouchers.filter((v) => v.questDescription).map((v) => v.questDiscountPercent));
  const vnDow = new Date(Date.now() + 7 * 3600_000).getUTCDay();

  const openDirections = () => {
    const q = `${profile.latitude},${profile.longitude}`;
    const url = Platform.OS === 'ios' ? `maps://?daddr=${q}&dirflg=w` : `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=walking`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <StoreCover theme={profile.coverTheme} height={240} style={{ borderBottomWidth: 3, borderColor: C.ink900 }} />

        <View style={{ paddingHorizontal: 24, gap: 18, marginTop: -44 }}>
          {/* Identity */}
          <Row gap={14} center={false} style={{ alignItems: 'flex-end' }}>
            <View style={[{ width: 84, height: 84, borderRadius: 24, backgroundColor: C.orange500, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.chunky]}>
              <Store size={44} color={C.ink900} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: 4 }}>
              <Pill tone={open.open ? 'green' : 'red'} label={open.open ? (open.until ? `Đang mở · đến ${open.until}` : 'Đang mở') : 'Đã đóng cửa'} />
              {profile.verified ? (
                <Row gap={4}>
                  <ShieldCheck size={14} color={C.sky700} strokeWidth={2.5} />
                  <GText v="bodyS" color={C.sky700}>
                    Đối tác đã xác minh
                  </GText>
                </Row>
              ) : null}
            </View>
          </Row>
          <View style={{ gap: 4 }}>
            <GText v="displayL">{profile.storeName}</GText>
            {profile.tagline ? (
              <GText v="bodyL" color={C.ink700}>
                {profile.tagline}
              </GText>
            ) : null}
            <Row gap={6}>
              <Navigation size={16} color={C.orange700} strokeWidth={2.5} />
              <GText v="bodyMStrong" color={C.ink700} style={{ flex: 1 }}>
                {[profile.address, distanceM != null ? `cách bạn ${distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1).replace('.', ',')} km` : `${distanceM} m`}` : null].filter(Boolean).join(' · ')}
              </GText>
            </Row>
          </View>

          {/* Stats */}
          <Row gap={10} center={false}>
            {[
              [Check, fmtInt(profile.totalUsages), 'lượt đổi voucher', C.green300],
              [Footprints, `${profile.runnerSharePercent}%`, 'khách từ chạy bộ', C.sky300],
              [ShoppingBag, String(vouchers.length), 'voucher đang bán', C.orange300],
            ].map(([I, v, l, tile]) => (
              <Card key={l as string} pad={[12, 8]} gap={4} center style={{ flex: 1 }}>
                <IconTile icon={I as typeof Check} size={32} iconSize={18} fill={tile as string} radius={10} />
                <GText v="numM">{v as string}</GText>
                <GText v="bodyS" color={C.ink500} align="center">
                  {l as string}
                </GText>
              </Card>
            ))}
          </Row>

          {/* About */}
          <Card gap={12}>
            <GText v="caps" color={C.orange700}>
              Giới thiệu
            </GText>
            <GText v="bodyM" color={C.ink700}>
              {profile.description}
            </GText>
            {profile.tags.length ? (
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {profile.tags.map((t) => (
                  <View key={t} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.sunken, borderWidth: 1.5, borderColor: C.ink900 }}>
                    <GText v="bodyS">{t}</GText>
                  </View>
                ))}
              </Row>
            ) : null}
          </Card>

          {/* Highlights */}
          {profile.highlights.length ? (
            <>
              <SectionHeader title="Món nổi bật" link="Giá tại quầy" linkColor={C.ink500} />
              <Row gap={12} center={false}>
                {profile.highlights.slice(0, 3).map((h, i) => {
                  const tone = HL_TONES[i % 3]!;
                  const Icon = HL_ICONS[i % 3]!;
                  return (
                    <Card key={h.name} pad={10} gap={6} style={{ flex: 1 }}>
                      <View style={{ height: 72, borderRadius: 14, backgroundColor: TONE[tone][300], borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={32} color={TONE[tone][700]} strokeWidth={2.5} />
                      </View>
                      <GText v="bodyMStrong" numberOfLines={2}>
                        {h.name}
                      </GText>
                      <GText v="numS" color={C.ink700}>
                        {fmtVnd(h.priceVnd)}
                      </GText>
                    </Card>
                  );
                })}
              </Row>
            </>
          ) : null}

          {/* Hours */}
          {profile.openingHours.length ? (
            <Card pad={[6, 16]} gap={0}>
              <Row gap={6} style={{ paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: C.ink300 }}>
                <Clock size={18} color={C.ink700} strokeWidth={2.5} />
                <GText v="bodyMStrong" style={{ flex: 1 }}>
                  Giờ mở cửa
                </GText>
                <Pill tone={open.open ? 'green' : 'red'} label={open.open ? 'Đang mở' : 'Đã đóng'} />
              </Row>
              {profile.openingHours.map((h, i) => {
                const today = vnDow === 0 ? /chủ nhật|cn/i.test(h.label) : vnDow === 6 ? /thứ 7|t7/i.test(h.label) : /t2|thứ 2/i.test(h.label);
                return (
                  <Row key={h.label} between style={{ paddingVertical: 10, borderBottomWidth: i < profile.openingHours.length - 1 ? 1.5 : 0, borderBottomColor: C.ink300 }}>
                    <GText v={today ? 'bodyMStrong' : 'bodyM'} color={today ? C.ink900 : C.ink500}>
                      {h.label}
                    </GText>
                    <GText v="numS" color={!h.enabled ? C.red700 : today ? C.green700 : C.ink700}>
                      {h.enabled ? `${h.open} – ${h.close}` : 'Nghỉ'}
                    </GText>
                  </Row>
                );
              })}
            </Card>
          ) : null}

          {/* Location & quest */}
          <SectionHeader title="Vị trí & nhiệm vụ" />
          <Card pad={10} gap={10}>
            <View style={{ height: 170, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden' }}>
              <MapView
                style={StyleSheet.absoluteFill}
                customMapStyle={GAME_MAP_STYLE}
                initialRegion={{ latitude: profile.latitude, longitude: profile.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}>
                <Circle center={profile} radius={50} strokeColor={C.grape700} strokeWidth={2.5} fillColor="rgba(155,107,255,0.2)" lineDashPattern={[6, 5]} />
                <Marker coordinate={profile} anchor={{ x: 0.5, y: 1 }}>
                  <MapPin kind="store" />
                </Marker>
              </MapView>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: passed ? C.green300 : C.grape300, borderWidth: 1.5, borderColor: C.ink900 }}>
              {passed ? <Check size={20} color={C.green700} strokeWidth={2.5} /> : <Route size={20} color={C.grape700} strokeWidth={2.5} />}
              <GText v="bodyMStrong" style={{ flex: 1 }}>
                {passed
                  ? 'Bạn đã chạy ngang quán này — ưu đãi nhiệm vụ đã mở trong 7 ngày.'
                  : `Chạy ngang trong vòng 50 m để mở giảm${questDeal ? ` ${questDeal}%` : ''} giá token cho voucher của quán.`}
              </GText>
            </View>
            <Row gap={10}>
              <GButton label="Chỉ đường" type="secondary" size="M" icon={Navigation} onPress={openDirections} flex />
              <GButton
                label="Chia sẻ"
                type="secondary"
                size="M"
                icon={Link2}
                onPress={() => void Share.share({ message: `${profile.storeName} — ${profile.tagline}. Chạy ngang quán để được giảm giá voucher trên KILOMeet!` })}
                flex
              />
            </Row>
          </Card>

          {/* Vouchers */}
          <View onLayout={(e) => setVouchersY(e.nativeEvent.layout.y)}>
            <SectionHeader title="Voucher của quán" link={`${vouchers.length} đang bán`} linkColor={C.ink500} />
          </View>
          {vouchers.length === 0 ? (
            <Card row>
              <IconTile icon={ShoppingBag} fill={C.sunken} />
              <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
                Quán chưa có voucher đang bán.
              </GText>
            </Card>
          ) : (
            vouchers.map((t) => {
              const deal = (t.myQuestEligible ?? passed) && t.questDiscountPercent > 0;
              return (
                <VoucherTicket
                  key={t.id}
                  discount={discountLabel(t.discountPercent)}
                  store={profile.storeName}
                  title={t.title}
                  price={t.priceTokens}
                  dealPrice={deal ? (t.myPrice ?? Math.round(t.priceTokens * (1 - t.questDiscountPercent / 100))) : undefined}
                  rank={t.minRank}
                  leftLabel={t.pausedForFee ? 'Tạm hết' : `Còn ${t.remaining}`}
                  dim={!!t.pausedForFee}
                  stamp={t.pausedForFee ? 'TẠM HẾT' : undefined}
                  questLabel={deal ? `Đã chạy ngang quán · -${t.questDiscountPercent}%` : undefined}
                  onPress={() => router.push(`/(runner)/voucher/${t.id}`)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 0, right: 0, top: 0 }} pointerEvents="box-none">
        <Row between style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} />
          <IconButton icon={Link2} onPress={() => void Share.share({ message: `${profile.storeName} trên KILOMeet` })} />
        </Row>
      </SafeAreaView>

      {vouchers.length ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <StickyBar>
            <View>
              <GText v="bodyS" color={C.ink500}>
                Voucher từ
              </GText>
              <Row gap={4}>
                <Coin size={18} />
                <GText v="numM">{minPrice}</GText>
              </Row>
            </View>
            <GButton label="Xem voucher" type="coin" icon={ShoppingBag} onPress={() => scrollRef.current?.scrollTo({ y: vouchersY + 200, animated: true })} flex />
          </StickyBar>
        </View>
      ) : null}
    </View>
  );
}
