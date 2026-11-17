import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Clock, Flame, Info, Lock, Trophy, Users } from 'lucide-react-native';
import { toast } from 'sonner-native';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import { useRunnerStore } from '../../src/stores/runner';
import type { Rank, Runner } from '../../src/api/types';
import { C, RANK_LABEL } from '../../src/theme/game';
import { Body, Card, GText, IconTile, Pill, RankEmblem, Row, Screen, SectionHeader, TopBar, XPBar } from '../../src/components/game';

/** GET /me/badges */
export interface ApiBadge {
  seasonId: string;
  seasonName: string;
  highestRank: Rank;
  txHash: string | null;
  current: boolean;
}

const EXPLORER = 'https://testnet.snowtrace.io/tx/';

export default function BadgesScreen() {
  const user = useAuthStore((s) => s.user);
  const season = useRunnerStore((s) => s.season);
  const isRunner = user?.role === 'runner' || user?.role === 'member';
  const runner = isRunner ? (user as Runner) : null;
  const [badges, setBadges] = useState<ApiBadge[]>([]);

  useEffect(() => {
    if (!isRunner) return;
    api.get<ApiBadge[]>('/me/badges').then(setBadges).catch(() => setBadges([]));
  }, [isRunner]);

  const current = badges.find((b) => b.current);
  const currentBadge = current?.highestRank ?? runner?.seasonBadge ?? null;
  const past = badges.filter((b) => !b.current);
  const slots = Math.max(3, Math.ceil(past.length / 3) * 3);
  const seasonPct = season ? Math.min(1, (Date.now() - Date.parse(season.startDate)) / (Date.parse(season.endDate) - Date.parse(season.startDate))) : 0;

  return (
    <Screen>
      <TopBar title="Huy hiệu mùa" action={Info} onAction={() => toast.info('Huy hiệu là NFT không chuyển được, ghi hạng cao nhất mỗi mùa.')} />
      <Body>
        <Card row fill={C.coin300} gap={14} pad={16}>
          {currentBadge ? <RankEmblem rank={currentBadge} size={72} /> : <IconTile icon={Trophy} size={72} iconSize={36} fill={C.sunken} radius={22} />}
          <View style={{ flex: 1, gap: 4 }}>
            <Pill tone="ink" label="Mùa hiện tại" />
            <GText v="titleM">{current?.seasonName ?? season?.name ?? 'Mùa hiện tại'}</GText>
            <GText v="bodyS" color={C.ink700}>
              {currentBadge ? `Cao nhất mùa này: ${RANK_LABEL[currentBadge]}` : 'Chưa đạt huy hiệu mùa này'}
            </GText>
            <XPBar pct={seasonPct} tone="coin" height={14} />
            {season ? (
              <GText v="bodyS" color={C.ink500}>
                Còn {season.daysLeft} ngày để giữ huy hiệu
              </GText>
            ) : null}
          </View>
        </Card>

        <SectionHeader title="Kệ cúp" link={`${past.length} mùa`} linkColor={C.ink500} />
        <Card fill={C.sunken} pad={[16, 12]} gap={0}>
          {Array.from({ length: slots / 3 }).map((_, rowIdx) => (
            <View key={rowIdx} style={{ gap: 0 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: rowIdx ? 16 : 0 }}>
                {Array.from({ length: 3 }).map((__, col) => {
                  const b = past[rowIdx * 3 + col];
                  return (
                    <View key={col} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      {b ? (
                        <>
                          <View style={{ width: 90, height: 84, alignItems: 'center' }}>
                            <View style={{ position: 'absolute', bottom: 0, width: 80, height: 20, borderRadius: 40, backgroundColor: C.ink300, borderWidth: 2, borderColor: C.ink900 }} />
                            <RankEmblem rank={b.highestRank} size={64} />
                          </View>
                          <GText v="titleS" align="center">
                            {RANK_LABEL[b.highestRank]}
                          </GText>
                          <GText v="bodyS" color={C.ink500} align="center" numberOfLines={1}>
                            {b.seasonName}
                          </GText>
                          {b.txHash ? (
                            <GText v="bodyS" color={C.sky700} onPress={() => Linking.openURL(EXPLORER + b.txHash)}>
                              NFT ↗
                            </GText>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: C.surface, borderWidth: 2.5, borderColor: C.ink300, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={26} color={C.ink300} strokeWidth={2.5} />
                          </View>
                          <GText v="bodyS" color={C.ink500}>
                            Chưa mở
                          </GText>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 12, marginTop: 12, borderRadius: 6, backgroundColor: C.orange700, borderWidth: 2, borderColor: C.ink900 }} />
            </View>
          ))}
        </Card>

        {past.length > 0 ? (
          <Card row pad={14} onPress={() => router.push('/(runner)/season-result')}>
            <IconTile icon={Trophy} fill={C.grape500} color={C.white} />
            <View style={{ flex: 1 }}>
              <GText v="titleS">Tổng kết {past[past.length - 1]!.seasonName}</GText>
              <GText v="bodyS" color={C.ink500}>
                Xem huy hiệu, hạng và token sau reset
              </GText>
            </View>
            <ChevronRight size={20} color={C.ink500} strokeWidth={2.5} />
          </Card>
        ) : null}

        {runner?.isMember ? (
          <>
            <SectionHeader title="Thành tích" link="Hội viên" linkColor={C.ink500} />
            <Row gap={12} center={false}>
              {[
                [Users, C.green500, 'Đội', 'Chạy chung'],
                [Clock, C.sky500, `${runner.punctuality}%`, 'Đúng hẹn'],
                [Flame, C.orange500, RANK_LABEL[runner.rank], 'Hạng hiện tại'],
              ].map(([I, fill, v, l]) => (
                <Card key={l as string} pad={12} gap={6} center style={{ flex: 1 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 52, backgroundColor: fill as string, borderWidth: 2.5, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 2px 0px ${C.ink900}` }}>
                    {(() => {
                      const Icon = I as typeof Users;
                      return <Icon size={26} color={C.ink900} strokeWidth={2.5} />;
                    })()}
                  </View>
                  <GText v="numM" numberOfLines={1} adjustsFontSizeToFit>
                    {v as string}
                  </GText>
                  <GText v="bodyS" color={C.ink500}>
                    {l as string}
                  </GText>
                </Card>
              ))}
            </Row>
          </>
        ) : null}
      </Body>
    </Screen>
  );
}
