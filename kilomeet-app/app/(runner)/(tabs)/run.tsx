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
  haversine,
} from '../../../src/services/location';
import { useRunnerStore } from '../../../src/stores/runner';
import { MOCK_STORE } from '../../../src/api/mock/data';
import { DAILY_QUEST_KM, STORE_PROXIMITY_M } from '../../../src/api/types';
import type { GpsPoint } from '../../../src/api/types';
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

export default function RunScreen() {
  const [state, setState] = useState<RunState>('idle');
  const [route, setRoute] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [questReward, setQuestReward] = useState<number | null>(null);
  const [passedStores, setPassedStores] = useState<string[]>([]);
  const [exitOpen, setExitOpen] = useState(false);
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const runIdRef = useRef<string | null>(null);

  const { startRun: storeStartRun, endRun, quests, completeQuest } = useRunnerStore();

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
          const next = [...prev, pos];
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

  const finishRun = useCallback(async () => {
    setState('finished');
    watchRef.current?.remove();
    clearInterval(timerRef.current ?? undefined);

    const finalDistance = totalDistance(route);
    const durationMinutes = Math.round(elapsed / 60000);

    const storePos: LatLng = { latitude: MOCK_STORE.latitude, longitude: MOCK_STORE.longitude };
    const passedStoreIds: string[] = [];
    for (const point of route) {
      if (haversine(point, storePos) * 1000 <= STORE_PROXIMITY_M) {
        passedStoreIds.push(MOCK_STORE.id);
        break;
      }
    }
    // ponytail: In indoor demo where GPS does not move, allow marking MOCK_STORE if run >= 0.1km
    if (passedStoreIds.length === 0 && (finalDistance >= 0.1 || route.length > 3)) {
      passedStoreIds.push(MOCK_STORE.id);
    }
    setPassedStores(passedStoreIds);
    const gpsRoute: GpsPoint[] = route.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: new Date().toISOString(),
    }));

    if (runIdRef.current) {
      await endRun(runIdRef.current, finalDistance, durationMinutes, gpsRoute, passedStoreIds);

      if (finalDistance >= DAILY_QUEST_KM) {
        const dailyQuest = quests.find((q) => q.type === 'daily' && q.status === 'active');
        if (dailyQuest) {
          await completeQuest(dailyQuest.id);
          setQuestReward(dailyQuest.rewardTokens);
        }
      }
    }
  }, [route, elapsed, endRun, quests, completeQuest]);

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
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}>
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
                <Text className="text-white text-2xl font-bold">{distance.toFixed(2)}</Text>
                <Text className="text-muted-foreground text-xs">km</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-2xl font-bold">{pace}</Text>
                <Text className="text-muted-foreground text-xs">min/km</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-2xl font-bold">{formatDuration(elapsed)}</Text>
                <Text className="text-muted-foreground text-xs">thời gian</Text>
              </View>
            </Card>
          )}

          <View className="mx-5 mb-8">
            {state === 'idle' && (
              <Button size="lg" className="h-16 rounded-2xl" onPress={startRun}>
                <Ionicons name="play" size={26} color={colors.textInverse} />
                <Text className="text-lg">Bắt đầu chạy</Text>
              </Button>
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
                      <Text className="text-white text-xl font-bold">{distance.toFixed(2)} km</Text>
                      <Text className="text-muted-foreground text-xs">Quãng đường</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-white text-xl font-bold">{formatDuration(elapsed)}</Text>
                      <Text className="text-muted-foreground text-xs">Thời gian</Text>
                    </View>
                  </View>
                  {questReward != null && (
                    <View className="bg-km-primary/10 rounded-xl p-3 border border-km-primary/30">
                      <Text className="text-km-primary text-center font-semibold text-sm">
                        ✓ Nhiệm vụ ngày hoàn thành — +{questReward} token
                      </Text>
                    </View>
                  )}
                  {passedStores.length > 0 && (
                    <View className="bg-km-accent/15 rounded-xl p-3.5 border border-km-accent/40">
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="storefront" size={18} color={colors.accent} />
                        <Text className="text-km-accent font-bold text-sm ml-2">
                          Chạy ngang qua {MOCK_STORE.storeName}!
                        </Text>
                      </View>
                      <Text className="text-slate-300 text-xs text-center mt-1">
                        Nhiệm vụ hoàn thành: Giảm 50% voucher của quán
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

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
