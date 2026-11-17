import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Calendar, Check, Footprints, Store } from 'lucide-react-native';
import { useRunnerStore } from '../../src/stores/runner';
import { DAILY_QUEST_KM, type Run } from '../../src/api/types';
import { C } from '../../src/theme/game';
import { fmtDayMonth, fmtKm, fmtMinutes, fmtPace, fmtTime, fmtWeekday } from '../../src/lib/format';
import { Body, Card, EmptyState, GText, Pill, RouteThumb, Row, Screen, SectionHeader, TopBar } from '../../src/components/game';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Thứ Hai 00:00 giờ VN của tuần hiện tại (ms). */
function weekStartVN(now = Date.now()) {
  const vn = new Date(now + 7 * 3600_000);
  const dow = (vn.getUTCDay() + 6) % 7; // 0 = T2
  return Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() - dow) - 7 * 3600_000;
}

function RunCard({ run, i }: { run: Run; i: number }) {
  const quest = run.distanceKm >= DAILY_QUEST_KM;
  const stores = run.passedStoreIds?.length ?? 0;
  return (
    <Card row pad={12} gap={12}>
      <RouteThumb seed={i} />
      <View style={{ flex: 1, gap: 2 }}>
        <GText v="bodyS" color={C.ink500}>
          {fmtWeekday(run.startedAt)} · {fmtTime(run.startedAt)}
        </GText>
        <GText v="numM">{fmtKm(run.distanceKm, 2)} km</GText>
        <GText v="bodyS" color={C.ink700}>
          {fmtMinutes(run.durationMinutes)} · {fmtPace(run.avgPaceMinPerKm)}/km
        </GText>
        {stores ? (
          <Row gap={4}>
            <Store size={12} color={C.grape700} strokeWidth={2.5} />
            <GText v="bodyS" color={C.grape700}>
              Qua {stores} quán
            </GText>
          </Row>
        ) : null}
      </View>
      {quest ? <Pill tone="green" label="NV ngày" icon={Check} /> : <Pill tone="coin" label="Chưa đủ 2 km" />}
    </Card>
  );
}

export default function HistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { runs, fetchRuns } = useRunnerStore();

  useEffect(() => {
    fetchRuns().catch(() => undefined);
  }, [fetchRuns]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRuns().catch(() => undefined);
    setRefreshing(false);
  }, [fetchRuns]);

  const sorted = useMemo(() => [...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)), [runs]);
  const start = weekStartVN();
  const week = sorted.filter((r) => Date.parse(r.startedAt) >= start);
  const perDay = DAYS.map((_, d) => week.filter((r) => Math.floor((Date.parse(r.startedAt) - start) / 86_400_000) === d).reduce((s, r) => s + r.distanceKm, 0));
  const weekKm = perDay.reduce((a, b) => a + b, 0);
  const weekMin = week.reduce((s, r) => s + r.durationMinutes, 0);
  const max = Math.max(5, ...perDay);
  const todayIdx = Math.floor((Date.now() - start) / 86_400_000);

  return (
    <Screen>
      <TopBar title="Lịch sử chạy" action={Calendar} />
      <Body refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        <Card fill={C.sky300} gap={12}>
          <Row between>
            <GText v="caps" color={C.sky700}>
              Tuần này
            </GText>
            <Pill tone="ink" label={`${fmtDayMonth(new Date(start).toISOString())} – ${fmtDayMonth(new Date(start + 6 * 86_400_000).toISOString())}`} />
          </Row>
          <Row gap={8}>
            {[
              [fmtKm(weekKm), 'km'],
              [String(week.length), 'buổi'],
              [weekKm > 0 ? fmtPace(weekMin / weekKm) : `--'--"`, 'pace TB'],
            ].map(([v, l]) => (
              <View key={l} style={{ flex: 1 }}>
                <GText v="numL">{v}</GText>
                <GText v="bodyS" color={C.ink700}>
                  {l}
                </GText>
              </View>
            ))}
          </Row>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 10, paddingHorizontal: 4 }}>
            {perDay.map((km, d) => (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 26,
                    height: Math.max(6, (km / max) * 84),
                    borderRadius: 8,
                    backgroundColor: km <= 0 ? C.sunken : km === Math.max(...perDay) ? C.coin500 : C.sky500,
                    borderWidth: 2,
                    borderColor: C.ink900,
                  }}
                />
                <GText v="caps" color={d === todayIdx ? C.ink900 : C.ink700} style={{ fontSize: 10 }}>
                  {DAYS[d]}
                </GText>
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader title="Các buổi chạy" link={`${runs.length} buổi`} linkColor={C.ink500} />
        {sorted.length === 0 ? (
          <EmptyState icon={Footprints} title="Chưa có buổi chạy nào" text="Bấm nút CHẠY ở giữa thanh tab để bắt đầu." tone={C.green300} />
        ) : (
          sorted.map((r, i) => <RunCard key={r.id} run={r} i={i} />)
        )}
      </Body>
    </Screen>
  );
}
