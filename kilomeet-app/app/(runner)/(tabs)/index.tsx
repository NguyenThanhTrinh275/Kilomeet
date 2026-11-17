import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { toast } from 'sonner-native';
import { AlertTriangle, Bell, ChevronRight, Flame, Footprints, Play, Route, Target, Trophy, Wallet } from 'lucide-react-native';
import { useAuthStore } from '../../../src/stores/auth';
import { useRunnerStore } from '../../../src/stores/runner';
import { RANKS, RANK_KM_THRESHOLD, RANK_TOKEN_RETENTION } from '../../../src/api/types';
import type { Runner } from '../../../src/api/types';
import { C, DEPTH, NIGHT_GRADIENT, RANK_COLOR, RANK_LABEL } from '../../../src/theme/game';
import { avatarColor, fmtDayMonth, fmtInt, fmtKm, initials } from '../../../src/lib/format';
import {
  Avatar,
  Banner,
  Body,
  Card,
  CoinChip,
  GButton,
  GText,
  IconButton,
  IconTile,
  Pill,
  QuestCard,
  RankEmblem,
  RankLadder,
  Row,
  Screen,
  SectionHeader,
  StatTile,
  TAB_BAR_SPACE,
  XPBar,
} from '../../../src/components/game';

/** Thời gian còn lại tới 00:00 giờ VN (nhiệm vụ ngày làm mới). */
function useDailyReset() {
  const calc = () => {
    const now = Date.now();
    const vn = new Date(now + 7 * 3600_000);
    const next = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 1) - 7 * 3600_000;
    const s = Math.max(0, Math.floor((next - now) / 1000));
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export default function RunnerHome() {
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user) as Runner | null;
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const { tokenBalance, rank, kmThisWeek, quests, runs, season, syncFromUser, fetchQuests, fetchRuns, fetchSeason } = useRunnerStore();
  const resetIn = useDailyReset();

  useEffect(() => {
    if (user) {
      syncFromUser(user);
      fetchQuests().catch(() => undefined);
      fetchRuns().catch(() => undefined);
      fetchSeason().catch(() => undefined);
    }
  }, [user, syncFromUser, fetchQuests, fetchRuns, fetchSeason]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchQuests(), fetchRuns(), fetchSeason(), refreshMe()]).catch(() => undefined);
    setRefreshing(false);
  }, [fetchQuests, fetchRuns, fetchSeason, refreshMe]);

  // Mùa
  const seasonPct = season
    ? Math.min(1, Math.max(0, (Date.now() - Date.parse(season.startDate)) / (Date.parse(season.endDate) - Date.parse(season.startDate))))
    : 0;
  const retentionCap = RANK_TOKEN_RETENTION[rank];
  const burnWarning = tokenBalance > retentionCap;

  // Hạng: giữ hạng hiện tại, hoặc (Đồng) hướng tới Bạc
  const threshold = RANK_KM_THRESHOLD[rank];
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  const target = threshold > 0 ? threshold : RANK_KM_THRESHOLD[nextRank ?? 'bạc'];
  const missing = Math.max(0, target - kmThisWeek);
  const keepMsg =
    threshold > 0
      ? missing > 0
        ? `Còn ${fmtKm(missing)} km để giữ hạng · chốt CN 23:59`
        : nextRank && kmThisWeek < RANK_KM_THRESHOLD[nextRank]
          ? `Đã giữ hạng! Còn ${fmtKm(RANK_KM_THRESHOLD[nextRank] - kmThisWeek)} km để lên ${RANK_LABEL[nextRank]}`
          : 'Đã đạt mức tuần này! Chốt CN 23:59'
      : missing > 0
        ? `Còn ${fmtKm(missing)} km để lên Bạc · chốt CN 23:59`
        : 'Đủ km lên Bạc! Chốt CN 23:59';

  const sortedQuests = [...quests].sort((a, b) => (a.type === b.type ? 0 : a.type === 'daily' ? -1 : 1));

  return (
    <Screen>
      <Body
        padTop={4}
        padBottom={TAB_BAR_SPACE + 16}
        gap={18}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        {/* HUD */}
        <Row gap={10}>
          <View>
            <Avatar initials={initials(user?.name ?? 'R')} fill={avatarColor(user?.name ?? '')} size={52} />
            {user?.isMember ? (
              <View style={{ position: 'absolute', left: 22, top: 36, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: C.ink900 }}>
                <GText v="caps" color={C.coin500} style={{ fontSize: 9 }}>
                  VIP
                </GText>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <GText v="bodyS" color={C.ink500}>
              Xin chào,
            </GText>
            <GText v="titleM" numberOfLines={1}>
              {user?.name ?? 'Runner'}
            </GText>
          </View>
          <CoinChip amount={fmtInt(tokenBalance)} />
          <IconButton icon={Bell} badge onPress={() => toast.info('Chưa có thông báo mới')} />
        </Row>

        {/* Season banner */}
        <View style={[{ borderRadius: 22, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
          <LinearGradient colors={NIGHT_GRADIENT} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <GText v="caps" color={C.coin500}>
                {season?.name ?? 'Chưa mở mùa'}
              </GText>
              <GText v="displayL" color={C.white}>
                {season ? `Còn ${season.daysLeft} ngày` : 'Chờ mùa mới'}
              </GText>
              <XPBar pct={seasonPct} tone="coin" height={16} />
              <GText v="bodyS" color={C.ink300}>
                {season ? `Reset ${fmtDayMonth(season.endDate)} · ${RANK_LABEL[rank]} giữ tối đa ${fmtInt(retentionCap)} token` : 'Quản trị sẽ sớm mở mùa chạy mới'}
              </GText>
            </View>
            <View style={[{ width: 72, height: 72, borderRadius: 72, backgroundColor: C.coin500, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.glowCoin]}>
              <Trophy size={38} color={C.ink900} strokeWidth={2.5} />
            </View>
          </LinearGradient>
        </View>

        {burnWarning ? (
          <Banner
            icon={AlertTriangle}
            tone="red"
            title="Tiêu token trước khi hết mùa!"
            text={`Bạn có ${fmtInt(tokenBalance)} token — hạng ${RANK_LABEL[rank]} chỉ giữ tối đa ${fmtInt(retentionCap)} khi reset.`}
          />
        ) : null}

        {/* Rank card */}
        <Card gap={14} pad={18}>
          <Row gap={14}>
            <RankEmblem rank={rank} size={76} />
            <View style={{ flex: 1, gap: 2 }}>
              <GText v="caps" color={C.ink500}>
                Hạng hiện tại
              </GText>
              <GText v="displayL" color={rank === 'vàng' || rank === 'bạc' ? C.ink900 : RANK_COLOR[rank]}>
                {RANK_LABEL[rank]}
              </GText>
              <Pill tone="red" label={threshold > 0 ? `Cần ${threshold} km / tuần` : 'Không yêu cầu km'} />
            </View>
          </Row>
          <Row gap={6} center={false} style={{ alignItems: 'baseline' }}>
            <GText v="numXL">{fmtKm(kmThisWeek)}</GText>
            <GText v="titleS" color={C.ink500}>
              / {target} km tuần này
            </GText>
          </Row>
          <XPBar pct={target > 0 ? kmThisWeek / target : 1} tone="green" height={22} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: missing > 0 ? C.orange300 : C.green300, borderWidth: 2, borderColor: C.ink900 }}>
            <Flame size={18} color={missing > 0 ? C.orange700 : C.green700} strokeWidth={2.5} />
            <GText v="bodyMStrong" style={{ flex: 1 }}>
              {keepMsg}
            </GText>
          </View>
          <RankLadder rank={rank} />
        </Card>

        <GButton label="BẮT ĐẦU CHẠY" icon={Play} filledIcon height={64} onPress={() => router.push('/(runner)/run')} block />

        <Row gap={12} center={false}>
          <StatTile value={fmtKm(kmThisWeek)} label="km tuần này" icon={Flame} tile={C.orange300} />
          <StatTile value={String(runs.length)} label="buổi chạy" icon={Footprints} tile={C.sky300} onPress={() => router.push('/(runner)/history')} />
          <StatTile value={fmtInt(tokenBalance)} label="token" icon={Wallet} tile={C.coin300} />
        </Row>

        <SectionHeader title="Nhiệm vụ" link={`Làm mới ${resetIn}`} linkColor={C.ink500} />
        {sortedQuests.length === 0 ? (
          <Card row>
            <IconTile icon={Target} fill={C.sky300} />
            <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
              Nhiệm vụ sẽ xuất hiện khi mùa chạy mở.
            </GText>
          </Card>
        ) : (
          sortedQuests.map((q) => {
            const done = q.status === 'completed';
            const daily = q.type === 'daily';
            const left = Math.max(0, q.targetKm - q.progressKm);
            return (
              <QuestCard
                key={q.id}
                done={done}
                tag={daily ? 'Nhiệm vụ ngày' : 'Nhiệm vụ tuần'}
                tagTone={daily ? 'orange' : 'sky'}
                tone={daily ? 'orange' : 'sky'}
                icon={daily ? Flame : Target}
                title={daily ? `Chạy ${fmtKm(q.targetKm, q.targetKm % 1 ? 1 : 0)} km hôm nay` : `Chạy ${fmtKm(q.targetKm, q.targetKm % 1 ? 1 : 0)} km tuần này`}
                progress={
                  done
                    ? `${fmtKm(q.progressKm)} / ${fmtKm(q.targetKm)} km · Đã nhận thưởng`
                    : q.status === 'expired'
                      ? 'Đã hết hạn'
                      : `${fmtKm(q.progressKm)} / ${fmtKm(q.targetKm)} km · còn ${fmtKm(left)} km`
                }
                reward={`+${q.rewardTokens}`}
                pct={q.targetKm > 0 ? q.progressKm / q.targetKm : 0}
              />
            );
          })
        )}

        <Card row fill={C.grape300} pad={14} onPress={() => router.push('/(runner)/vouchers')}>
          <IconTile icon={Route} fill={C.grape500} color={C.white} size={44} iconSize={24} sw={2.5} />
          <View style={{ flex: 1, gap: 2 }}>
            <GText v="caps" color={C.grape700}>
              Nhiệm vụ voucher
            </GText>
            <GText v="bodyMStrong">Chạy ngang quán đối tác (≤50 m) để giảm tới 50% giá voucher</GText>
          </View>
          <ChevronRight size={20} color={C.ink900} strokeWidth={2.5} />
        </Card>
      </Body>
    </Screen>
  );
}
