import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Route, ShoppingBag } from 'lucide-react-native';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useAuthStore } from '../../../src/stores/auth';
import type { Store, VoucherTemplate } from '../../../src/api/types';
import { C } from '../../../src/theme/game';
import { discountLabel, fmtDate } from '../../../src/lib/format';
import { Body, Card, Chip, EmptyState, GButton, GText, Pill, type PillTone, RankChip, Row, Screen, StoreNav, TAB_BAR_SPACE, XPBar, Coin } from '../../../src/components/game';

type Filter = 'all' | 'live' | 'ended';
const STUBS = [C.orange500, C.coin500, C.sky500, C.grape500];

function status(v: VoucherTemplate): [string, PillTone, boolean] {
  if (Date.parse(v.expiresAt) < Date.now()) return ['Hết hạn', 'red', true];
  if (v.remaining <= 0) return ['Hết lượt', 'coin', true];
  return ['Đang bán', 'green', false];
}

export default function StoreVouchersScreen() {
  const user = useAuthStore((s) => s.user) as Store | null;
  const { templates, fetchTemplates } = useVoucherStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) fetchTemplates(user.id).catch(() => undefined);
  }, [user?.id, fetchTemplates]);
  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchTemplates(user.id).catch(() => undefined);
    }, [user?.id, fetchTemplates]),
  );

  const mine = templates.filter((t) => t.storeId === user?.id);
  const live = mine.filter((t) => !status(t)[2]);
  const shown = filter === 'live' ? live : filter === 'ended' ? mine.filter((t) => status(t)[2]) : mine;

  return (
    <Screen>
      <Body
        padTop={4}
        padBottom={TAB_BAR_SPACE + 16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchTemplates(user?.id).catch(() => undefined);
              setRefreshing(false);
            }}
            tintColor={C.green700}
          />
        }>
        <Row between>
          <GText v="displayL">Voucher của tôi</GText>
          <GButton label="Tạo" size="S" icon={Plus} onPress={() => router.push('/(store)/vouchers/create')} />
        </Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Chip label={`Tất cả · ${mine.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label={`Đang bán · ${live.length}`} selected={filter === 'live'} onPress={() => setFilter('live')} />
          <Chip label={`Đã kết thúc · ${mine.length - live.length}`} selected={filter === 'ended'} onPress={() => setFilter('ended')} />
        </Row>
        {shown.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Chưa có voucher nào" text="Tạo voucher đầu tiên và gắn nhiệm vụ chạy ngang quán để kéo khách!" tone={C.orange300} />
        ) : (
          shown.map((v, i) => {
            const [label, tone, ended] = status(v);
            const sold = v.totalSupply - v.remaining;
            const stub = STUBS[i % STUBS.length]!;
            return (
              <Card key={v.id} gap={10} pad={14} style={ended ? { opacity: 0.6 } : null}>
                <Row gap={12}>
                  <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: stub, borderWidth: 2.5, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                    <GText v="numM" color={stub === C.grape500 ? C.white : C.ink900} numberOfLines={1} style={{ fontSize: 17 }}>
                      {discountLabel(v.discountPercent)}
                    </GText>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Pill tone={tone} label={label} />
                    <GText v="titleS" numberOfLines={2}>
                      {v.title}
                    </GText>
                    <Row gap={6}>
                      <Coin size={16} />
                      <GText v="numS">{v.priceTokens}</GText>
                      <RankChip rank={v.minRank} small />
                    </Row>
                  </View>
                </Row>
                {v.questDescription ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.grape300, borderWidth: 1.5, borderColor: C.ink900 }}>
                    <Route size={14} color={C.grape700} strokeWidth={2.5} />
                    <GText v="bodyS" style={{ marginLeft: 6, flexShrink: 1 }}>
                      Nhiệm vụ: -{v.questDiscountPercent}% khi {v.questDescription.toLowerCase()}
                    </GText>
                  </View>
                ) : null}
                <XPBar pct={v.totalSupply ? sold / v.totalSupply : 0} tone="orange" height={14} />
                <Row between>
                  <GText v="bodyS" color={C.ink700}>
                    Đã bán {sold}/{v.totalSupply}
                  </GText>
                  <GText v="bodyS" color={C.ink500}>
                    HSD {fmtDate(v.expiresAt)}
                  </GText>
                </Row>
              </Card>
            );
          })
        )}
      </Body>
      <StoreNav active="vouchers" />
    </Screen>
  );
}
