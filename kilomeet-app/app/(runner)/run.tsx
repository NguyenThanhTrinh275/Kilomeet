import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../../src/theme/colors';
import {
  LatLng,
  totalDistance,
  formatDuration,
  requestLocationPermission,
} from '../../src/services/location';

type RunState = 'idle' | 'running' | 'paused' | 'finished';

export default function RunScreen() {
  const [state, setState] = useState<RunState>('idle');
  const [route, setRoute] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  // Request permission + get initial position
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
      clearInterval(timerRef.current);
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
    await startTracking();
    timerRef.current = setInterval(() => {
      setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current));
    }, 1000);
  }, [startTracking]);

  const pauseRun = useCallback(() => {
    setState('paused');
    watchRef.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);
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

  const finishRun = useCallback(() => {
    setState('finished');
    watchRef.current?.remove();
    clearInterval(timerRef.current);
  }, []);

  const pace = elapsed > 0 && distance > 0
    ? (() => {
        const minPerKm = (elapsed / 60000) / distance;
        const m = Math.floor(minPerKm);
        const s = Math.round((minPerKm - m) * 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      })()
    : '--:--';

  return (
    <View className="flex-1 bg-km-bg">
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={
          currentPos
            ? { ...currentPos, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : { latitude: 10.773, longitude: 106.66, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        )}
        {route.length > 0 && (
          <Marker coordinate={route[0]} pinColor={colors.primary} title="Xuất phát" />
        )}
      </MapView>

      {/* Stats overlay */}
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity
            className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          {state !== 'idle' && (
            <View className="bg-black/50 rounded-full px-4 py-2">
              <Text className="text-white font-mono text-lg font-bold">
                {formatDuration(elapsed)}
              </Text>
            </View>
          )}
          <View className="w-10" />
        </View>

        {/* Bottom stats + controls */}
        <View className="mt-auto">
          {state !== 'idle' && (
            <View className="mx-5 mb-4 bg-km-bg-secondary/95 rounded-2xl p-5 flex-row justify-around">
              <View className="items-center">
                <Text className="text-white text-2xl font-bold">{distance.toFixed(2)}</Text>
                <Text className="text-slate-400 text-xs">km</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-2xl font-bold">{pace}</Text>
                <Text className="text-slate-400 text-xs">min/km</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-2xl font-bold">
                  {formatDuration(elapsed)}
                </Text>
                <Text className="text-slate-400 text-xs">thời gian</Text>
              </View>
            </View>
          )}

          {/* Controls */}
          <View className="mx-5 mb-8">
            {state === 'idle' && (
              <TouchableOpacity
                className="h-16 bg-km-primary rounded-2xl items-center justify-center flex-row"
                onPress={startRun}
              >
                <Ionicons name="play" size={28} color="white" />
                <Text className="text-white text-lg font-bold ml-2">Bắt đầu chạy</Text>
              </TouchableOpacity>
            )}

            {state === 'running' && (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 h-16 bg-km-surface rounded-2xl items-center justify-center flex-row"
                  onPress={pauseRun}
                >
                  <Ionicons name="pause" size={24} color="white" />
                  <Text className="text-white font-semibold ml-2">Tạm dừng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-16 w-16 bg-red-500 rounded-2xl items-center justify-center"
                  onPress={finishRun}
                >
                  <Ionicons name="stop" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {state === 'paused' && (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 h-16 bg-km-primary rounded-2xl items-center justify-center flex-row"
                  onPress={resumeRun}
                >
                  <Ionicons name="play" size={24} color="white" />
                  <Text className="text-white font-semibold ml-2">Tiếp tục</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-16 w-16 bg-red-500 rounded-2xl items-center justify-center"
                  onPress={finishRun}
                >
                  <Ionicons name="stop" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {state === 'finished' && (
              <View>
                <View className="bg-km-bg-secondary rounded-2xl p-5 mb-4">
                  <Text className="text-km-primary text-lg font-bold text-center mb-2">
                    🎉 Buổi chạy hoàn thành!
                  </Text>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-white text-xl font-bold">{distance.toFixed(2)} km</Text>
                      <Text className="text-slate-400 text-xs">Quãng đường</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-white text-xl font-bold">{formatDuration(elapsed)}</Text>
                      <Text className="text-slate-400 text-xs">Thời gian</Text>
                    </View>
                  </View>
                  {distance >= 2 && (
                    <View className="mt-3 bg-km-primary/10 rounded-xl p-3">
                      <Text className="text-km-primary text-center font-semibold">
                        ✓ Nhiệm vụ ngày hoàn thành — +10 token
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  className="h-14 bg-km-primary rounded-2xl items-center justify-center"
                  onPress={() => router.back()}
                >
                  <Text className="text-white text-lg font-semibold">Về trang chủ</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Minimal dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
