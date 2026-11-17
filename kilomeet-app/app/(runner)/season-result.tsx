// Màn "Season Over" — tổng kết mùa vừa đóng: huy hiệu, hạng tụt 2 bậc, token giữ lại.
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Play, ShoppingBag, TrendingDown } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import { useVoucherStore } from '../../src/stores/voucher';
import { RANKS, RANK_TOKEN_RETENTION, type Rank, type Runner } from '../../src/api/types';
import { C, NIGHT_DEEP_GRADIENT, RANK_COLOR, RANK_LABEL } from '../../src/theme/game';
import { fmtInt } from '../../src/lib/format';
import { Card, Coin, GButton, GText, Glow, Loading, Pill, RankEmblem, Row, StarField, XPBar } from '../../src/components/game';
import type { ApiBadge } from './badges';

export default function SeasonResultScreen() {
  const user = useAuthStore((s) => s.user) as Runner | null;
  const myVouchers = useVoucherStore((s) => s.myVouchers);
  const [badge, setBadge] = useState<ApiBadge | null | undefined>(undefined);

  useEffect(() => {
    api
      .get<ApiBadge[]>('/me/badges')
      .then((b) => setBadge(b.filter((x) => !x.current).pop() ?? null))
      .catch(() => setBadge(null));
  }, []);

  if (badge === undefined || !user) return <Loading dark />;

  const endRank: Rank = badge?.highestRank ?? user.rank;
  const newRank: Rank = RANKS[Math.max(0, RANKS.indexOf(endRank) - 2)]!;
  const cap = RANK_TOKEN_RETENTION[endRank];
  const kept = Math.min(user.tokenBalance, cap);
  const usable = myVouchers.filter((v) => v.status === 'owned').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.night }}>
      <LinearGradient colors={NIGHT_DEEP_GRADIENT} style={StyleSheet.absoluteFill} />
      <StarField count={28} seed={21} height={500} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }}>
          <Pill tone="coin" label={badge?.seasonName ?? 'Mùa trước'} />
          <GText v="displayXL" color={C.white} align="center">
            MÙA GIẢI{'\n'}KẾT THÚC!
          </GText>
          <View style={{ width: 200, height: 196, alignItems: 'center' }}>
            <Glow size={190} color={RANK_COLOR[endRank]} opacity={0.3} style={{ position: 'absolute', top: 0 }} />
            <RankEmblem rank={endRank} size={140} style={{ marginTop: 18 }} />
            <View style={{ position: 'absolute', bottom: 0, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, backgroundColor: RANK_COLOR[endRank], borderWidth: 2.5, borderColor: C.ink900, boxShadow: `0px 2px 0px ${C.ink900}` }}>
              <GText v="caps">Huy hiệu {RANK_LABEL[endRank]}</GText>
            </View>
          </View>
          <GText v="bodyM" color={C.ink300} align="center">
            Huy hiệu mùa là NFT không chuyển được — thành tích của bạn được giữ mãi.
          </GText>

          <Card gap={12} style={{ alignSelf: 'stretch' }}>
            <GText v="caps" color={C.ink500}>
              Hạng mùa mới
            </GText>
            <Row gap={10} style={{ justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <RankEmblem rank={endRank} size={56} />
                <GText v="bodyMStrong">{RANK_LABEL[endRank]}</GText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.red300, borderWidth: 2, borderColor: C.ink900 }}>
                <TrendingDown size={16} color={C.red700} strokeWidth={2.5} />
                <GText v="bodyMStrong" color={C.red700}>
                  -2 bậc
                </GText>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <RankEmblem rank={newRank} size={56} />
                <GText v="bodyMStrong">{RANK_LABEL[newRank]}</GText>
              </View>
            </Row>
          </Card>

          <Card gap={10} style={{ alignSelf: 'stretch' }}>
            <Row between>
              <GText v="caps" color={C.ink500}>
                Token giữ lại
              </GText>
              <Pill tone="red" label={`Tối đa ${fmtInt(cap)}`} />
            </Row>
            <Row gap={8}>
              <Coin size={32} />
              <GText v="numL" color={C.green700}>
                {fmtInt(kept)}
              </GText>
              <ChevronRight size={20} color={C.ink500} strokeWidth={2.5} />
              <GText v="bodyM" color={C.ink500}>
                số dư hiện tại
              </GText>
            </Row>
            <XPBar pct={cap ? kept / cap : 0} tone="coin" height={18} />
            <GText v="bodyS" color={C.ink500}>
              {RANK_LABEL[endRank]} giữ tối đa {fmtInt(cap)} token, phần vượt mức bị xoá khi reset.
            </GText>
          </Card>

          <Card row fill={C.green300} pad={12} depth="none" sw={2} radius={16} style={{ alignSelf: 'stretch' }}>
            <ShoppingBag size={22} color={C.green700} strokeWidth={2.5} />
            <GText v="bodyMStrong" style={{ flex: 1 }}>
              {usable} voucher đã mua vẫn được giữ nguyên.
            </GText>
          </Card>

          <GButton label="Vào mùa mới" type="accent" icon={Play} filledIcon onPress={() => router.replace('/(runner)')} block />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
