import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../../../src/theme/colors';
import {
  LatLng,
  totalDistance,
  formatDuration,
  requestLocationPermission,
} from '../../../src/services/location';
import { useRunnerStore, type PassedStore } from '../../../src/stores/runner';
import { useAuthStore } from '../../../src/stores/auth';
import { DEMO_ENABLED, DEMO_ROUTES } from '../../../src/demo/routes';
import type { GpsPoint } from '../../../src/api/types';
import { toast } from 'sonner-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type RunState = 'idle' | 'running' | 'paused' | 'finished';
/** Điểm GPS kèm thời điểm thật (BE dùng để lọc đoạn đi xe > 25 km/h). */
type TrackPoint = LatLng & { timestamp: string };

export default function RunScreen() {
  const [state, setState] = useState<RunState>('idle');
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [questReward, setQuestReward] = useState<number | null>(null);
  const [passedStores, setPassedStores] = useState<PassedStore[]>([]);
  const [claimedStoreId, setClaimedStoreId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [finalRunId, setFinalRunId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const runIdRef = useRef<string | null>(null);

  const { startRun: storeStartRun, endRun, fetchQuests, fetchPassedStores, claimStore } = useRunnerStore();
  const refreshMe = useAuthStore((s) => s.refreshMe);

  useEffect(() => {
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentPos(pos);
    })();
    return () => {
      watchRef.current?.remove();
      clearInterval(timerRef.current ?? undefined);
    };
  }, []);

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
        mapRef.current?.animateToRegion({
          ...pos,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      },
    );
  }, []);

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
    setFinalRunId(null);
    const run = await storeStartRun();
    runIdRef.current = run.id;
    await startTracking();
    timerRef.current = setInterval(() => {
      setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current));
    }, 1000);
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
    timerRef.current = setInterval(() => {
      setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current));
    }, 1000);
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
        // Token vừa nhận = tổng thưởng các nhiệm vụ chuyển từ active → completed.
        const reward = after
          .filter((q) => q.status === 'completed' && before.find((b) => b.id === q.id)?.status !== 'completed')
          .reduce((sum, q) => sum + q.rewardTokens, 0);
        setQuestReward(reward > 0 ? reward : null);
        if (run.passedStoreIds.length > 0) {
          setPassedStores(await fetchPassedStores(run.id));
          setClaimedStoreId(run.claimedStoreId ?? null);
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
      setState('finished');
      mapRef.current?.fitToCoordinates(gps, { edgePadding: { top: 80, right: 40, bottom: 320, left: 40 }, animated: true });
      const run = await storeStartRun();
      await submitRun(run.id, gps, Math.round(ms / 60000));
    },
    [storeStartRun, submitRun],
  );

  const chooseStore = useCallback(
    async (storeId: string) => {
      if (!finalRunId) return;
      setClaiming(true);
      try {
        await claimStore(finalRunId, storeId);
        setClaimedStoreId(storeId);
        toast.success('Đã nhận giảm giá', { description: 'Dùng trong 7 ngày cho voucher của quán này.' });
      } catch (e) {
        toast.error('Không chọn được quán', { description: (e as Error).message });
      } finally {
        setClaiming(false);
      }
    },
    [finalRunId, claimStore],
  );

  const pace = elapsed > 0 && distance > 0
    ? (() => {
        const minPerKm = elapsed / 60000 / distance;
        const mins = Math.floor(minPerKm);
        const secs = Math.round((minPerKm - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      })()
    : '--:--';

  const handleBack = () => {
    if (state === 'running' || state === 'paused') {
      setExitOpen(true);
    } else {
      router.back();
    }
  };

  const confirmExit = () => {
    setExitOpen(false);
    watchRef.current?.remove();
    clearInterval(timerRef.current ?? undefined);
    router.back();
  };

  return (
    <View className="flex-1 bg-km-bg">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={
          currentPos
            ? { ...currentPos, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : { latitude: 10.773, longitude: 106.66, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        showsUserLocation
        showsMyLocationButton={false}>
        {route.length > 1 && <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />}
        {route.length > 0 && <Marker coordinate={route[0]} pinColor={colors.primary} title="Xuất phát" />}
      </MapView>

      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity
            className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          {state !== 'idle' && (
            <View className="bg-black/50 rounded-full px-4 py-2">
              <Text className="text-white font-mono text-lg font-bold">{formatDuration(elapsed)}</Text>
            </View>
          )}
          <View className="w-10" />
        </View>

        <View className="mt-auto">
          {state !== 'idle' && (
            <Card className="mx-5 mb-4 bg-km-bg-secondary/95 p-5 flex-row justify-around">
              <View className="items-center">
                <Text className="text-foreground text-2xl font-bold">{distance.toFixed(2)}</Text>
                <Text className="text-muted-foreground text-xs">km</Text>
              </View>
              <View className="items-center">
                <Text className="text-foreground text-2xl font-bold">{pace}</Text>
                <Text className="text-muted-foreground text-xs">min/km</Text>
              </View>
              <View className="items-center">
                <Text className="text-foreground text-2xl font-bold">{formatDuration(elapsed)}</Text>
                <Text className="text-muted-foreground text-xs">thời gian</Text>
              </View>
            </Card>
          )}

          <View className="mx-5 mb-8">
            {state === 'idle' && (
              <View className="gap-2">
                <Button size="lg" className="h-16 rounded-2xl" onPress={startRun}>
                  <Ionicons name="play" size={26} color={colors.textInverse} />
                  <Text className="text-lg">Bắt đầu chạy</Text>
                </Button>
                {DEMO_ENABLED &&
                  (Object.keys(DEMO_ROUTES) as (keyof typeof DEMO_ROUTES)[]).map((name) => (
                    <Button key={name} variant="outline" onPress={() => replayDemo(name)}>
                      <Text>Phát buổi chạy mẫu · {name}</Text>
                    </Button>
                  ))}
              </View>
            )}

            {state === 'running' && (
              <View className="flex-row gap-3">
                <Button variant="secondary" className="flex-1 h-16 rounded-2xl" onPress={pauseRun}>
                  <Ionicons name="pause" size={22} color="white" />
                  <Text>Tạm dừng</Text>
                </Button>
                <Button variant="destructive" className="h-16 w-16 rounded-2xl" onPress={finishRun}>
                  <Ionicons name="stop" size={22} color="white" />
                </Button>
              </View>
            )}

            {state === 'paused' && (
              <View className="flex-row gap-3">
                <Button className="flex-1 h-16 rounded-2xl" onPress={resumeRun}>
                  <Ionicons name="play" size={22} color={colors.textInverse} />
                  <Text>Tiếp tục</Text>
                </Button>
                <Button variant="destructive" className="h-16 w-16 rounded-2xl" onPress={finishRun}>
                  <Ionicons name="stop" size={22} color="white" />
                </Button>
              </View>
            )}

            {state === 'finished' && (
              <View className="gap-4">
                <Card className="p-5 gap-3">
                  <Text className="text-km-primary text-lg font-bold text-center">
                    🎉 Buổi chạy hoàn thành!
                  </Text>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-foreground text-xl font-bold">{distance.toFixed(2)} km</Text>
                      <Text className="text-muted-foreground text-xs">Quãng đường</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-foreground text-xl font-bold">{formatDuration(elapsed)}</Text>
                      <Text className="text-muted-foreground text-xs">Thời gian</Text>
                    </View>
                  </View>
                  {saving && (
                    <Text className="text-muted-foreground text-center text-sm">Đang lưu buổi chạy…</Text>
                  )}
                  {questReward != null && (
                    <View className="bg-km-primary/10 rounded-xl p-3 border border-km-primary/30">
                      <Text className="text-km-primary text-center font-semibold text-sm">
                        ✓ Hoàn thành nhiệm vụ — +{questReward} token
                      </Text>
                    </View>
                  )}
                  {passedStores.length > 0 && (
                    <View className="bg-km-accent/15 rounded-xl p-3.5 border border-km-accent/40 gap-2">
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="storefront" size={18} color={colors.accent} />
                        <Text className="text-km-accent font-bold text-sm ml-2">
                          {claimedStoreId
                            ? `Đã nhận giảm giá ở ${passedStores.find((p) => p.storeId === claimedStoreId)?.storeName ?? ''}`
                            : `Chạy ngang qua ${passedStores.length} quán — chọn 1 quán nhận giảm giá`}
                        </Text>
                      </View>
                      {!claimedStoreId &&
                        passedStores.map((p) => (
                          <Button
                            key={p.storeId}
                            variant="outline"
                            disabled={claiming}
                            onPress={() => chooseStore(p.storeId)}>
                            <Text>{p.storeName}</Text>
                          </Button>
                        ))}
                      <Text className="text-slate-600 text-xs text-center">
                        Mỗi buổi chạy chỉ nhận giảm giá cho 1 quán, dùng trong 7 ngày.
                      </Text>
                    </View>
                  )}
                </Card>
                <Button size="lg" className="rounded-2xl" onPress={() => router.back()}>
                  <Text>Về trang chủ</Text>
                </Button>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dừng buổi chạy?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang trong buổi chạy. Thoát ra sẽ không lưu dữ liệu quãng đường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1">
              <Text>Tiếp tục chạy</Text>
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="flex-1" onPress={confirmExit}>
              <Text>Dừng & Thoát</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

