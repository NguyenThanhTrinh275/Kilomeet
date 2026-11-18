import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { toast } from 'sonner-native';
import { Check, ChevronRight, Clock, Crosshair, Flame, Gauge, Gift, Home, Link2, Navigation, Pause, Play, Sparkles, Square, Star, Store, Target, Timer, Trophy, X } from 'lucide-react-native';
import { useRunnerStore, type PassedStore } from '../../../src/stores/runner';
import { useAuthStore } from '../../../src/stores/auth';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useUiStore } from '../../../src/stores/ui';
import { formatDuration, haversine, requestLocationPermission, totalDistance, type LatLng } from '../../../src/services/location';
import { DEMO_ENABLED, DEMO_ROUTES } from '../../../src/demo/routes';
import type { GpsPoint } from '../../../src/api/types';
import { C, DEPTH, GAME_MAP_STYLE, NIGHT_DEEP_GRADIENT, NIGHT_GRADIENT } from '../../../src/theme/game';
import { fmtInt, fmtKm } from '../../../src/lib/format';
import {
  Banner,
  Card,
  Coin,
  GameDialog,
  GButton,
  GText,
  IconButton,
  IconTile,
  MapPin,
  Pill,
  RadioDot,
  Rays,
  RoundButton,
  Row,
  StarField,
  TAB_BAR_SPACE,
  XPBar,
} from '../../../src/components/game';

type RunState = 'idle' | 'running' | 'paused' | 'finished';
/** Điểm GPS kèm thời điểm thật (BE dùng để lọc đoạn đi xe > 25 km/h). */
type TrackPoint = LatLng & { timestamp: string };

const HCMUT = { latitude: 10.773, longitude: 106.66 };

export default function RunScreen() {
  const [state, setState] = useState<RunState>('idle');
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [questReward, setQuestReward] = useState<number | null>(null);
  const [passedStores, setPassedStores] = useState<PassedStore[]>([]);
  const [claimedStoreId, setClaimedStoreId] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [finalRunId, setFinalRunId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const runIdRef = useRef<string | null>(null);

  const { startRun: storeStartRun, endRun, fetchQuests, fetchPassedStores, claimStore, quests } = useRunnerStore();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const templates = useVoucherStore((s) => s.templates);
  const fetchTemplates = useVoucherStore((s) => s.fetchTemplates);
  const setHideTabBar = useUiStore((s) => s.setHideTabBar);

  useEffect(() => {
    setHideTabBar(state !== 'idle');
  }, [state, setHideTabBar]);
  useEffect(() => () => setHideTabBar(false), [setHideTabBar]);

  useEffect(() => {
    if (templates.length === 0) fetchTemplates().catch(() => undefined);
    fetchQuests().catch(() => undefined);
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })().catch(() => undefined);
    return () => {
      watchRef.current?.remove();
      clearInterval(timerRef.current ?? undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Quán đối tác (mỗi quán 1 ghim, kèm mức giảm nhiệm vụ cao nhất). */
  const stores = useMemo(() => {
    const m = new Map<string, { id: string; name: string; latitude: number; longitude: number; deal: number }>();
    for (const t of templates) {
      const cur = m.get(t.storeId);
      const deal = t.questDescription ? t.questDiscountPercent : 0;
      if (!cur) m.set(t.storeId, { id: t.storeId, name: t.storeName, latitude: t.storeLatitude, longitude: t.storeLongitude, deal });
      else if (deal > cur.deal) cur.deal = deal;
    }
    return [...m.values()];
  }, [templates]);

  /** Quán đã chạy ngang trong buổi này (chỉ để hiển thị — BE tự tính lại). */
  const passedLive = useMemo(() => {
    if (route.length === 0) return [];
    return stores
      .map((s) => ({ ...s, d: Math.min(...route.map((p) => haversine(p, s) * 1000)) }))
      .filter((s) => s.d <= 50);
  }, [route, stores]);

  const startTracking = useCallback(async () => {
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
      (loc) => {
        const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentPos(pos);
        setRoute((prev) => {
          const next = [...prev, { ...pos, timestamp: new Date(loc.timestamp).toISOString() }];
          setDistance(totalDistance(next));
          return next;
        });
        mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      },
    );
  }, []);

  const tick = () => setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current));

  const startRun = useCallback(async () => {
    setState('running');
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setRoute([]);
    setDistance(0);
    setElapsed(0);
    setQuestReward(null);
    setPassedStores([]);
    setClaimedStoreId(null);
    setSelectedStore(null);
    setFinalRunId(null);
    try {
      const run = await storeStartRun();
      runIdRef.current = run.id;
    } catch (e) {
      toast.error('Không bắt đầu được buổi chạy', { description: (e as Error).message });
      setState('idle');
      return;
    }
    await startTracking();
    timerRef.current = setInterval(tick, 1000);
  }, [startTracking, storeStartRun]);

  const pauseRun = useCallback(() => {
    setState('paused');
    watchRef.current?.remove();
    clearInterval(timerRef.current ?? undefined);
    pausedElapsedRef.current += Date.now() - startTimeRef.current;
  }, []);

  const resumeRun = useCallback(async () => {
    setState('running');
    startTimeRef.current = Date.now();
    await startTracking();
    timerRef.current = setInterval(tick, 1000);
  }, [startTracking]);

  /** Gửi buổi chạy lên BE; BE tự tính km, quán đi ngang, chấm nhiệm vụ và phát token. */
  const submitRun = useCallback(
    async (runId: string, gpsRoute: GpsPoint[], durationMinutes: number) => {
      setSaving(true);
      try {
        const before = useRunnerStore.getState().quests;
        const run = await endRun(runId, totalDistance(gpsRoute), durationMinutes, gpsRoute, []);
        setFinalRunId(run.id);
        setDistance(run.distanceKm);
        const [after] = await Promise.all([fetchQuests(), refreshMe().catch(() => undefined)]);
        const reward = after
          .filter((q) => q.status === 'completed' && before.find((b) => b.id === q.id)?.status !== 'completed')
          .reduce((sum, q) => sum + q.rewardTokens, 0);
        setQuestReward(reward > 0 ? reward : null);
        if (run.passedStoreIds.length > 0) {
          const ps = await fetchPassedStores(run.id);
          setPassedStores(ps);
          setClaimedStoreId(run.claimedStoreId ?? null);
          setSelectedStore(run.claimedStoreId ?? ps[0]?.storeId ?? null);
        }
      } catch (e) {
        toast.error('Không lưu được buổi chạy', { description: (e as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [endRun, fetchQuests, refreshMe, fetchPassedStores],
  );

  const finishRun = useCallback(async () => {
    setStopOpen(false);
    setState('finished');
    watchRef.current?.remove();
    clearInterval(timerRef.current ?? undefined);
    if (!runIdRef.current) return;
    await submitRun(runIdRef.current, route, Math.round(elapsed / 60000));
  }, [route, elapsed, submitRun]);

  /** Demo: phát một buổi chạy ghi sẵn (EXPO_PUBLIC_DEMO=true). */
  const replayDemo = useCallback(
    async (name: keyof typeof DEMO_ROUTES) => {
      const gps = DEMO_ROUTES[name](new Date());
      setRoute(gps);
      setDistance(totalDistance(gps));
      const ms = Date.parse(gps[gps.length - 1]!.timestamp) - Date.parse(gps[0]!.timestamp);
      setElapsed(ms);
      setQuestReward(null);
      setPassedStores([]);
      setClaimedStoreId(null);
      setSelectedStore(null);
      setState('finished');
      const run = await storeStartRun();
      await submitRun(run.id, gps, Math.round(ms / 60000));
    },
    [storeStartRun, submitRun],
  );

  const chooseStore = useCallback(async () => {
    if (!finalRunId || !selectedStore) return;
    setClaiming(true);
    try {
      await claimStore(finalRunId, selectedStore);
      setClaimedStoreId(selectedStore);
      toast.success('Đã nhận giảm giá', { description: 'Dùng trong 7 ngày cho voucher của quán này.' });
    } catch (e) {
      toast.error('Không chọn được quán', { description: (e as Error).message });
    } finally {
      setClaiming(false);
    }
  }, [finalRunId, selectedStore, claimStore]);

  const confirmExit = () => {
    setExitOpen(false);
    watchRef.current?.remove();
    clearInterval(timerRef.current ?? undefined);
    setState('idle');
    setRoute([]);
    setDistance(0);
    setElapsed(0);
  };

  const backToLobby = () => {
    setState('idle');
    setRoute([]);
    setDistance(0);
    setElapsed(0);
    router.navigate('/(runner)');
  };

  const paceMin = elapsed > 0 && distance > 0 ? elapsed / 60000 / distance : 0;
  const pace = paceMin ? `${Math.floor(paceMin)}'${String(Math.round((paceMin % 1) * 60)).padStart(2, '0')}"` : `--'--"`;
  const daily = quests.find((q) => q.type === 'daily');
  const weekly = quests.find((q) => q.type === 'weekly');
  const dailyHit = !!daily && daily.status === 'active' && daily.progressKm + distance >= daily.targetKm;

  // ─── IDLE: bản đồ trước khi chạy ──────────────────────────────
  if (state === 'idle') {
    const center = currentPos ?? HCMUT;
    return (
      <View style={{ flex: 1, backgroundColor: C.mapLand }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          customMapStyle={GAME_MAP_STYLE}
          initialRegion={{ ...center, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
          showsUserLocation
          showsMyLocationButton={false}>
          {stores.map((s) => (
            <Marker key={s.id} coordinate={s} anchor={{ x: 0.5, y: 1 }} title={s.name} description={s.deal ? `Chạy ngang quán: -${s.deal}% giá voucher` : undefined}>
              <MapPin kind={s.deal ? 'quest' : 'store'} icon={Store} />
            </Marker>
          ))}
        </MapView>

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }} pointerEvents="box-none">
          <Card row pad={12} gap={10}>
            <IconTile icon={Navigation} size={40} iconSize={20} fill={currentPos ? C.green500 : C.coin500} radius={12} sw={2.5} />
            <View style={{ flex: 1 }}>
              <GText v="caps" color={currentPos ? C.green700 : C.coin700}>
                {currentPos ? 'Sẵn sàng xuất phát' : 'Đang tìm GPS…'}
              </GText>
              <GText v="bodyMStrong">{stores.length > 0 ? `${stores.length} quán đối tác quanh bạn` : 'Bật vị trí để ghi buổi chạy'}</GText>
            </View>
          </Card>
          <View style={{ alignItems: 'flex-end' }}>
            <IconButton icon={Crosshair} onPress={() => currentPos && mapRef.current?.animateToRegion({ ...currentPos, latitudeDelta: 0.008, longitudeDelta: 0.008 })} />
          </View>
        </SafeAreaView>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: C.bg,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 3,
            borderBottomWidth: 0,
            borderColor: C.ink900,
            paddingTop: 12,
            paddingHorizontal: 24,
            paddingBottom: TAB_BAR_SPACE,
            gap: 14,
          }}>
          <View style={{ alignSelf: 'center', width: 48, height: 6, borderRadius: 3, backgroundColor: C.ink300 }} />
          <Row gap={12} center={false}>
            {[daily, weekly].map((q, i) =>
              q ? (
                <Card key={q.id} pad={12} gap={6} depth="small" style={{ flex: 1 }}>
                  <Row between>
                    <Pill tone={i === 0 ? 'orange' : 'sky'} label={i === 0 ? 'Ngày' : 'Tuần'} />
                    <Row gap={3}>
                      <Coin size={16} />
                      <GText v="numS">+{q.rewardTokens}</GText>
                    </Row>
                  </Row>
                  <GText v="titleS">
                    {fmtKm(q.progressKm)} / {fmtKm(q.targetKm, q.targetKm % 1 ? 1 : 0)} km
                  </GText>
                  <XPBar pct={q.progressKm / q.targetKm} tone={q.status === 'completed' ? 'green' : i === 0 ? 'orange' : 'sky'} height={14} />
                </Card>
              ) : null,
            )}
          </Row>
          <GButton label="XUẤT PHÁT" type="accent" icon={Play} filledIcon height={64} onPress={() => void startRun()} block />
          {DEMO_ENABLED
            ? (Object.keys(DEMO_ROUTES) as (keyof typeof DEMO_ROUTES)[]).map((name) => (
                <GButton key={name} label={`Buổi chạy mẫu · ${name}`} type="secondary" size="S" icon={Sparkles} onPress={() => void replayDemo(name)} block />
              ))
            : null}
        </View>
      </View>
    );
  }

  // ─── FINISHED: màn chiến thắng ────────────────────────────────
  if (state === 'finished') {
    const stars = 1 + (questReward ? 1 : 0) + (passedStores.length > 0 ? 1 : 0);
    const weeklyPct = weekly ? weekly.progressKm / weekly.targetKm : 0;
    return (
      <View style={{ flex: 1, backgroundColor: C.night }}>
        <LinearGradient colors={NIGHT_GRADIENT} style={StyleSheet.absoluteFill} />
        <StarField count={26} seed={11} height={360} />
        <View style={{ position: 'absolute', top: 40, alignSelf: 'center' }}>
          <Rays />
        </View>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, gap: 16, alignItems: 'center' }}>
            <View style={[{ width: 132, height: 132, borderRadius: 132, backgroundColor: C.coin500, borderWidth: 4, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.glowCoin]}>
              <Trophy size={72} color={C.ink900} strokeWidth={2.5} />
            </View>
            <View style={[{ paddingVertical: 8, paddingHorizontal: 28, borderRadius: 16, backgroundColor: C.orange500, borderWidth: 3, borderColor: C.ink900 }, DEPTH.button]}>
              <GText v="displayL" color={C.white}>
                HOÀN THÀNH!
              </GText>
            </View>
            <Row gap={8} center={false} style={{ alignItems: 'flex-end' }}>
              {[36, 48, 36].map((sz, i) => {
                const on = i === 1 ? stars >= 1 : i === 0 ? stars >= 2 : stars >= 3;
                return (
                  <View key={i} style={{ width: sz, height: sz, borderRadius: sz, backgroundColor: on ? C.coin500 : C.night2, borderWidth: 2.5, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={sz * 0.55} color={on ? C.ink900 : C.ink500} strokeWidth={2.5} fill={on ? C.ink900 : 'transparent'} />
                  </View>
                );
              })}
            </Row>

            <Card row pad={[14, 8]} gap={0} style={{ alignSelf: 'stretch' }}>
              {[
                [fmtKm(distance, 2), 'km'],
                [formatDuration(elapsed), 'thời gian'],
                [pace, 'phút/km'],
              ].map(([v, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <GText v="numL">{v}</GText>
                  <GText v="bodyS" color={C.ink500}>
                    {l}
                  </GText>
                </View>
              ))}
            </Card>

            {saving ? (
              <Banner icon={Clock} tone="sky" text="Đang lưu buổi chạy và chấm nhiệm vụ…" style={{ alignSelf: 'stretch' }} />
            ) : (
              <>
                <GText v="caps" color={C.coin500} style={{ alignSelf: 'flex-start' }}>
                  Phần thưởng
                </GText>
                <Row gap={12} center={false} style={{ alignSelf: 'stretch' }}>
                  <Card fill={C.coin300} pad={14} gap={6} center style={{ flex: 1 }}>
                    <Coin size={52} />
                    <GText v="numL">+{questReward ?? 0}</GText>
                    <GText v="bodyS" color={C.ink700}>
                      {questReward ? 'Nhiệm vụ hoàn thành' : 'Chưa đạt nhiệm vụ'}
                    </GText>
                  </Card>
                  <Card fill={C.sky300} pad={14} gap={6} center style={{ flex: 1 }}>
                    <IconTile icon={Target} size={52} iconSize={30} fill={C.sky500} radius={16} sw={2.5} />
                    <GText v="numL">+{fmtKm(distance)} km</GText>
                    <GText v="bodyS" color={C.ink700}>
                      Vào km tuần
                    </GText>
                  </Card>
                </Row>
                {questReward ? (
                  <Card row pad={[10, 14]} gap={8} fill={C.green300} depth="small" style={{ alignSelf: 'stretch' }} onPress={() => router.push('/(runner)/wallet')}>
                    <Link2 size={18} color={C.green700} strokeWidth={2.5} />
                    <GText v="bodyMStrong" style={{ flex: 1 }}>
                      +{questReward} RUN ghi lên Avalanche · xem giao dịch
                    </GText>
                    <ChevronRight size={18} color={C.green700} strokeWidth={2.5} />
                  </Card>
                ) : null}
                {weekly ? (
                  <Card pad={14} gap={8} style={{ alignSelf: 'stretch' }}>
                    <Row between>
                      <GText v="bodyMStrong">Tiến độ tuần</GText>
                      <GText v="numS">
                        {fmtKm(weekly.progressKm)} / {fmtKm(weekly.targetKm, 0)} km
                      </GText>
                    </Row>
                    <XPBar pct={weeklyPct} tone={weekly.status === 'completed' ? 'green' : 'sky'} height={18} />
                  </Card>
                ) : null}

                {passedStores.length > 0 ? (
                  <View style={{ alignSelf: 'stretch', gap: 12 }}>
                    <View style={{ gap: 2 }}>
                      <GText v="caps" color={C.coin500}>
                        {claimedStoreId ? 'Đã nhận giảm giá' : 'Chọn 1 quán để nhận giảm giá'}
                      </GText>
                      <GText v="bodyM" color={C.ink300}>
                        Bạn đã chạy ngang {passedStores.length} quán. Mỗi buổi chạy chỉ nhận 1 lượt.
                      </GText>
                    </View>
                    {passedStores.map((p) => {
                      const on = (claimedStoreId ?? selectedStore) === p.storeId;
                      const deal = stores.find((s) => s.id === p.storeId)?.deal;
                      return (
                        <Card key={p.storeId} row pad={14} fill={on ? C.grape300 : C.surface} onPress={claimedStoreId ? undefined : () => setSelectedStore(p.storeId)}>
                          <IconTile icon={Store} size={48} iconSize={24} fill={on ? C.grape500 : C.orange500} color={on ? C.white : C.ink900} radius={14} sw={2.5} />
                          <View style={{ flex: 1 }}>
                            <GText v="titleS">{p.storeName}</GText>
                            <GText v="bodyMStrong" color={C.grape700}>
                              {deal ? `Voucher giảm ${deal}% giá token` : 'Giảm giá voucher của quán'}
                            </GText>
                          </View>
                          {claimedStoreId === p.storeId ? <Pill tone="green" label="Đã nhận" icon={Check} /> : <RadioDot on={on} />}
                        </Card>
                      );
                    })}
                    <Row gap={8} center={false}>
                      <Clock size={16} color={C.ink300} strokeWidth={2.5} />
                      <GText v="bodyS" color={C.ink300} style={{ flex: 1 }}>
                        Giảm giá dùng được trong 7 ngày cho voucher của quán đã chọn.
                      </GText>
                    </Row>
                    {!claimedStoreId ? (
                      <GButton label="Nhận giảm giá" type="coin" icon={Gift} loading={claiming} disabled={!selectedStore} onPress={() => void chooseStore()} block />
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
            <GButton label="Về sảnh" type={passedStores.length > 0 && !claimedStoreId ? 'secondary' : 'coin'} icon={Home} onPress={backToLobby} block disabled={saving} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── RUNNING / PAUSED: HUD tối ────────────────────────────────
  const running = state === 'running';
  const mapCenter = currentPos ?? route[route.length - 1] ?? HCMUT;
  return (
    <View style={{ flex: 1, backgroundColor: C.night }}>
      <LinearGradient colors={NIGHT_DEEP_GRADIENT} style={StyleSheet.absoluteFill} />
      <StarField count={18} seed={7} height={300} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, paddingHorizontal: 24, gap: 14 }}>
        <Row between style={{ paddingTop: 8 }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: running ? C.red500 : C.coin500, borderWidth: 2, borderColor: C.ink900 }, DEPTH.small]}>
            <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: running ? C.white : C.ink900 }} />
            <GText v="caps" color={running ? C.white : C.ink900}>
              {running ? 'Đang chạy' : 'Tạm dừng'}
            </GText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.night2, borderWidth: 2, borderColor: C.ink900 }}>
            <Navigation size={14} color={C.green500} strokeWidth={2.5} />
            <GText v="bodyS" color={C.white}>
              {currentPos ? 'GPS mạnh' : 'Đang dò GPS'}
            </GText>
          </View>
        </Row>

        {dailyHit ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingRight: 14, borderRadius: 18, backgroundColor: C.coin500, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.chunky]}>
            <IconTile icon={Check} size={40} iconSize={22} fill={C.surface} color={C.green700} radius={12} />
            <View style={{ flex: 1 }}>
              <GText v="caps">Nhiệm vụ ngày hoàn thành!</GText>
              <GText v="bodyS" color={C.ink700}>
                Đạt {fmtKm(daily!.targetKm, 0)} km · token cộng khi kết thúc
              </GText>
            </View>
            <Row gap={3}>
              <Coin size={22} />
              <GText v="numM">+{daily!.rewardTokens}</GText>
            </Row>
          </View>
        ) : null}

        <View style={{ alignItems: 'center' }}>
          <GText v="numXL" color={C.white} style={{ fontSize: 104, lineHeight: 110 }}>
            {fmtKm(distance, 2)}
          </GText>
          <GText v="caps" color={C.coin500}>
            Kilômét
          </GText>
        </View>

        <Row gap={12} center={false}>
          {[
            [Timer, formatDuration(elapsed), 'thời gian'],
            [Gauge, pace, 'phút/km'],
            [Flame, fmtInt(distance * 62), 'kcal'],
          ].map(([Icon, v, l]) => {
            const I = Icon as typeof Timer;
            return (
              <View key={l as string} style={{ flex: 1, alignItems: 'center', gap: 2, padding: 12, borderRadius: 18, backgroundColor: C.night2, borderWidth: 2.5, borderColor: C.ink900 }}>
                <I size={20} color={C.coin500} strokeWidth={2.5} />
                <GText v="numM" color={C.white}>
                  {v as string}
                </GText>
                <GText v="bodyS" color={C.ink300}>
                  {l as string}
                </GText>
              </View>
            );
          })}
        </Row>

        <View style={[{ flex: 1, minHeight: 160, borderRadius: 24, borderWidth: 3, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            customMapStyle={GAME_MAP_STYLE}
            initialRegion={{ ...mapCenter, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
            showsUserLocation
            showsMyLocationButton={false}>
            {route.length > 1 ? (
              <>
                <Polyline coordinates={route} strokeColor={C.ink900} strokeWidth={9} />
                <Polyline coordinates={route} strokeColor={C.orange500} strokeWidth={5} />
              </>
            ) : null}
            {stores.map((s) => (
              <Marker key={s.id} coordinate={s} anchor={{ x: 0.5, y: 1 }}>
                <MapPin kind="store" size={36} />
              </Marker>
            ))}
          </MapView>
          {passedLive[0] ? (
            <View style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.grape500, borderWidth: 2, borderColor: C.ink900 }}>
              <Store size={14} color={C.white} strokeWidth={2.5} />
              <GText v="bodyS" color={C.white}>
                Đã qua {passedLive[0].name} · {Math.round(passedLive[0].d)} m
              </GText>
            </View>
          ) : null}
        </View>

        <Row gap={28} style={{ justifyContent: 'center', paddingBottom: 8 }}>
          <RoundButton icon={X} size={60} fill={C.night2} color={C.white} onPress={() => setExitOpen(true)} />
          {running ? (
            <RoundButton icon={Pause} size={96} fill={C.coin500} filledIcon onPress={pauseRun} />
          ) : (
            <RoundButton icon={Play} size={96} fill={C.green500} filledIcon onPress={() => void resumeRun()} />
          )}
          <RoundButton icon={Square} size={60} fill={C.red500} color={C.white} filledIcon onPress={() => setStopOpen(true)} />
        </Row>
      </SafeAreaView>

      <GameDialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        icon={Square}
        title="Dừng buổi chạy?"
        text={`Bạn đã chạy ${fmtKm(distance, 2)} km trong ${formatDuration(elapsed)}. Kết quả sẽ được lưu và chấm nhiệm vụ.`}
        actions={
          <>
            <GButton label="Tiếp tục chạy" icon={Play} filledIcon onPress={() => setStopOpen(false)} block />
            <GButton label="Dừng & lưu" type="danger" icon={Square} filledIcon onPress={() => void finishRun()} block />
          </>
        }>
        {dailyHit || passedLive.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.coin300, borderWidth: 2, borderColor: C.ink900 }}>
            <Coin size={18} />
            <GText v="bodyMStrong">
              {[dailyHit ? `+${daily!.rewardTokens} token` : null, passedLive.length ? `${passedLive.length} quán giảm giá` : null].filter(Boolean).join(' · ')}
            </GText>
          </View>
        ) : null}
      </GameDialog>

      <GameDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        icon={X}
        title="Thoát không lưu?"
        text="Buổi chạy đang diễn ra sẽ bị huỷ, quãng đường không được tính."
        actions={
          <>
            <GButton label="Tiếp tục chạy" icon={Play} filledIcon onPress={() => setExitOpen(false)} block />
            <GButton label="Thoát" type="danger" icon={X} onPress={confirmExit} block />
          </>
        }
      />
    </View>
  );
}
