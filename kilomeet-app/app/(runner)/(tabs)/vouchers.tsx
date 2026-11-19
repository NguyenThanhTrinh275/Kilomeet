import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgePercent, Clock, Gift, MapPin as PinIcon, Route, ShoppingBag, SlidersHorizontal, Store } from 'lucide-react-native';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { RANK_INDEX, RANK_TOKEN_RETENTION, type OwnedVoucher, type VoucherTemplate } from '../../../src/api/types';
import { C, DEPTH, RANK_LABEL, TONE, type Tone } from '../../../src/theme/game';
import { discountLabel, fmtDayMonth, fmtInt, foldVi } from '../../../src/lib/format';
import {
  Body,
  Card,
  Chip,
  CoinChip,
  EmptyState,
  GButton,
  GText,
  Pill,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Segmented,
  TAB_BAR_SPACE,
  VoucherTicket,
} from '../../../src/components/game';

type Tab = 'all' | 'mine';
type Filter = 'all' | 'quest' | 'eligible';
const STUBS = [C.orange500, C.coin500, C.sky500, C.green500];

function stubFor(storeId: string) {
  let h = 0;
  for (let i = 0; i < storeId.length; i++) h = (h * 31 + storeId.charCodeAt(i)) >>> 0;
  return STUBS[h % STUBS.length]!;
}

function ownedStatus(v: OwnedVoucher): { label: string; tone: Tone | 'ink'; dim: boolean } {
  const expired = v.status === 'expired' || Date.parse(v.template.expiresAt) < Date.now();
  if (v.status === 'used') return { label: 'Đã dùng', tone: 'ink', dim: true };
  if (expired) return { label: 'Hết hạn', tone: 'red', dim: true };
  // `gifted` trong kho của MÌNH = voucher người khác tặng mình (người tặng không còn giữ nó) → dùng được.
  if (v.status === 'gifted' || v.giftedFrom) return { label: 'Được tặng', tone: 'grape', dim: false };
  return { label: 'Dùng được', tone: 'green', dim: false };
}

export default function VouchersScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { templates, myVouchers, fetchTemplates, fetchMyVouchers } = useVoucherStore();
  const runs = useRunnerStore((s) => s.runs);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const rank = useRunnerStore((s) => s.rank);
  const passedStoreIds = useMemo(() => new Set(runs.flatMap((r) => r.passedStoreIds || [])), [runs]);

  useEffect(() => {
    fetchTemplates().catch(() => undefined);
    fetchMyVouchers().catch(() => undefined);
  }, [fetchTemplates, fetchMyVouchers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTemplates(), fetchMyVouchers()]).catch(() => undefined);
    setRefreshing(false);
  }, [fetchTemplates, fetchMyVouchers]);

  const q = foldVi(search); // tìm không dấu
  const match = (t: VoucherTemplate) => !q || foldVi(t.storeName).includes(q) || foldVi(t.title).includes(q);
  const eligible = (t: VoucherTemplate) => t.myQuestEligible ?? passedStoreIds.has(t.storeId);

  const shop = templates
    .filter(match)
    .filter((t) => (filter === 'quest' ? !!t.questDescription : filter === 'eligible' ? eligible(t) && t.questDiscountPercent > 0 : true))
    .sort((a, b) => Number(b.remaining > 0 && !b.pausedForFee) - Number(a.remaining > 0 && !a.pausedForFee) || Number(eligible(b)) - Number(eligible(a)));
  const mine = myVouchers.filter((v) => match(v.template));
  const usable = myVouchers.filter((v) => !ownedStatus(v).dim).length;
  const questStores = new Set(templates.filter((t) => t.questDescription).map((t) => t.storeId)).size;

  return (
    <Screen>
      <Body padTop={4} padBottom={TAB_BAR_SPACE + 16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        <Row between>
          <GText v="displayL">Cửa hàng</GText>
          <CoinChip amount={fmtInt(tokenBalance)} />
        </Row>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Khám phá' },
            { value: 'mine', label: 'Kho đồ của tôi' },
          ]}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm cửa hàng, voucher..." right={<SlidersHorizontal size={20} color={C.ink700} strokeWidth={2.5} />} />

        {tab === 'all' ? (
          <>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <Chip label="Tất cả" icon={PinIcon} selected={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="Có nhiệm vụ" icon={Route} selected={filter === 'quest'} onPress={() => setFilter('quest')} />
              <Chip label="Đã mở giảm giá" icon={BadgePercent} selected={filter === 'eligible'} onPress={() => setFilter('eligible')} />
            </Row>

            {questStores > 0 && filter === 'all' && !q ? (
              <View style={[{ borderRadius: 22, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
                <LinearGradient colors={[C.grape500, C.grape700]} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Pill tone="coin" label="Deal nhiệm vụ" />
                    <GText v="titleL" color={C.white}>
                      Chạy ngang quán,{'\n'}giảm tới 50% giá token
                    </GText>
                    <GText v="bodyS" color={C.grape300}>
                      Đi qua quán trong bán kính 50 m là đạt. Không cần ghé vào.
                    </GText>
                    <GButton label="Xem quán gần" type="secondary" size="S" icon={Route} onPress={() => router.navigate('/(runner)/run')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                  </View>
                  <View style={{ width: 88, height: 88, borderRadius: 88, backgroundColor: C.surface, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                    <Route size={46} color={C.grape700} strokeWidth={2.5} />
                  </View>
                </LinearGradient>
              </View>
            ) : null}

            <SectionHeader title="Gần bạn" link={`${shop.length} voucher · ${new Set(shop.map((t) => t.storeId)).size} quán`} linkColor={C.ink500} />
            {shop.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Không tìm thấy voucher" text="Thử từ khoá khác hoặc bỏ bộ lọc." />
            ) : (
              shop.map((t) => {
                const deal = eligible(t) && t.questDiscountPercent > 0;
                const dealPrice = t.myPrice ?? Math.round(t.priceTokens * (1 - t.questDiscountPercent / 100));
                const soldOut = t.remaining <= 0;
                const paused = !soldOut && !!t.pausedForFee;
                const lockedRank = RANK_INDEX[rank] < RANK_INDEX[t.minRank];
                return (
                  <VoucherTicket
                    key={t.id}
                    discount={discountLabel(t.discountPercent)}
                    store={`${t.storeName}`}
                    title={t.title}
                    price={t.priceTokens}
                    dealPrice={deal ? dealPrice : undefined}
                    rank={t.minRank}
                    leftLabel={soldOut ? 'Hết lượt' : paused ? 'Tạm hết' : lockedRank ? `Cần ${RANK_LABEL[t.minRank]}` : `Còn ${t.remaining}`}
                    leftTone={soldOut || paused || lockedRank ? 'red' : 'sky'}
                    stub={deal ? C.grape500 : soldOut || paused ? C.red500 : stubFor(t.storeId)}
                    questLabel={deal ? `Đã chạy ngang quán · -${t.questDiscountPercent}%` : t.questDescription ? `Nhiệm vụ: ${t.questDescription.toLowerCase()} -${t.questDiscountPercent}%` : undefined}
                    dim={soldOut || paused}
                    stamp={soldOut ? 'HẾT LƯỢT' : paused ? 'TẠM HẾT' : undefined}
                    onPress={() => router.push(`/(runner)/voucher/${t.id}`)}
                  />
                );
              })
            )}
            {tokenBalance > RANK_TOKEN_RETENTION[rank] ? (
              <Card row fill={C.coin300} depth="small">
                <Gift size={22} color={C.ink900} strokeWidth={2.5} />
                <GText v="bodyMStrong" style={{ flex: 1 }}>
                  Token vượt mức giữ lại của hạng {RANK_LABEL[rank]} — đổi voucher trước khi hết mùa!
                </GText>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <Card row fill={C.green300} pad={12} depth="none" sw={2} radius={16}>
              <ShoppingBag size={22} color={C.green700} strokeWidth={2.5} />
              <GText v="bodyMStrong" style={{ flex: 1 }}>
                {myVouchers.length} vật phẩm · {usable} có thể dùng ngay
              </GText>
            </Card>
            {mine.length === 0 ? (
              <EmptyState icon={Gift} title="Kho đồ trống" text="Đổi token lấy voucher ở tab Khám phá nhé!" tone={C.coin300} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {mine.map((v) => {
                  const st = ownedStatus(v);
                  const stub = stubFor(v.template.storeId);
                  return (
                    <Card key={v.id} pad={0} gap={8} onPress={() => router.push(`/(runner)/voucher/${v.id}?owned=1`)} style={{ width: '47.8%', overflow: 'hidden', opacity: st.dim ? 0.55 : 1 }}>
                      <View style={{ height: 92, backgroundColor: stub, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 2.5, borderColor: C.ink900 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                          <Store size={22} color={C.ink900} strokeWidth={2.5} />
                        </View>
                        <GText v="numL">{discountLabel(v.template.discountPercent)}</GText>
                      </View>
                      <View style={{ gap: 4, paddingHorizontal: 12, paddingBottom: 12 }}>
                        <Pill tone={st.tone} label={st.label} />
                        <GText v="caps" color={C.ink500} numberOfLines={1}>
                          {v.template.storeName}
                        </GText>
                        <GText v="bodyMStrong" numberOfLines={2}>
                          {v.template.title}
                        </GText>
                        <Row gap={4}>
                          <Clock size={12} color={C.ink500} strokeWidth={2.5} />
                          <GText v="bodyS" color={C.ink500}>
                            {v.status === 'used' && v.usedAt ? `Dùng ${fmtDayMonth(v.usedAt)}` : `HSD ${fmtDayMonth(v.template.expiresAt)}`}
                          </GText>
                        </Row>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}
        <View style={{ height: 1, backgroundColor: TONE.coin[300] }} />
      </Body>
    </Screen>
  );
}
