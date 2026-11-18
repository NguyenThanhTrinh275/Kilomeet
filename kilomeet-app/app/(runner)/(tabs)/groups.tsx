import { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { toast } from 'sonner-native';
import { Check, ChevronRight, Clock, Crown, Flag, Info, Lock, Plus, Users, X, Zap } from 'lucide-react-native';
import { useGroupStore } from '../../../src/stores/group';
import { useAuthStore } from '../../../src/stores/auth';
import type { GroupRun, Runner } from '../../../src/api/types';
import { C, DEPTH, NIGHT_DEEP_GRADIENT, TONE, type Tone } from '../../../src/theme/game';
import { avatarColor, fmtDayMonth, initials } from '../../../src/lib/format';
import { MEMBER_BENEFITS, MEMBERSHIP_PRICE, subscribeMember } from '../../../src/lib/membership';
import {
  Avatar,
  Banner,
  Body,
  Card,
  CoinChip,
  EmptyState,
  GButton,
  GText,
  IconTile,
  Pill,
  type PillTone,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  StarField,
  TAB_BAR_SPACE,
  XPBar,
} from '../../../src/components/game';
import { useRunnerStore } from '../../../src/stores/runner';
import { fmtInt } from '../../../src/lib/format';

const RANK_RANGE_LABELS: Record<string, string> = {
  same: 'Cùng hạng',
  within1: '±1 hạng',
  within2: '±2 hạng',
  any: 'Mọi hạng',
};

const STATUS: Record<GroupRun['status'], [string, PillTone]> = {
  open: ['Đang nhận', 'coin'],
  confirmed: ['Đã chốt', 'green'],
  in_progress: ['Đang chạy', 'orange'],
  completed: ['Đã xong', 'ink'],
  cancelled: ['Đã huỷ', 'red'],
};

function dayLabel(date: string) {
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 7 * 3600_000 + 86_400_000).toISOString().slice(0, 10);
  return date === today ? 'Hôm nay' : date === tomorrow ? 'Mai' : fmtDayMonth(`${date}T00:00:00+07:00`);
}

function GroupCard({ g, mine, onPress }: { g: GroupRun; mine?: boolean; onPress: () => void }) {
  const [label, tone] = STATUS[g.status];
  const tile: Tone = g.status === 'confirmed' ? 'green' : mine ? 'coin' : 'sky';
  return (
    <Card row pad={12} gap={12} onPress={onPress} style={g.status === 'cancelled' ? { opacity: 0.55 } : null}>
      <View style={{ width: 76, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, backgroundColor: TONE[tile][300], borderWidth: 2, borderColor: C.ink900, alignItems: 'center' }}>
        <GText v="numM">{g.timeSlot}</GText>
        <GText v="bodyS" color={C.ink700}>
          {dayLabel(g.date)}
        </GText>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Pill tone={tone} label={label} />
        <Row gap={4}>
          <Flag size={14} color={C.green700} strokeWidth={2.5} />
          <GText v="titleS" numberOfLines={1} style={{ flex: 1 }}>
            {g.meetingPoint.name}
          </GText>
        </Row>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Pill tone="sky" label={`${g.distanceKm} km`} />
          <Pill tone="grape" label={RANK_RANGE_LABELS[g.rankRange] ?? g.rankRange} />
        </Row>
        <Row gap={8}>
          <View style={{ flexDirection: 'row' }}>
            {g.members.slice(0, 4).map((m, i) => (
              <Avatar key={m.userId} initials={initials(m.userName)} fill={avatarColor(m.userName)} size={26} style={{ marginLeft: i ? -8 : 0 }} />
            ))}
          </View>
          <GText v="bodyS" color={C.ink700}>
            {g.members.length}/{g.maxMembers}
          </GText>
        </Row>
      </View>
      <ChevronRight size={20} color={C.ink500} strokeWidth={2.5} />
    </Card>
  );
}

type MatchState = { phase: 'searching' | 'matched' | 'pending'; groupId?: string | null };

function Matchmaking({ state, onClose, myName }: { state: MatchState | null; onClose: () => void; myName: string }) {
  const searching = state?.phase === 'searching';
  const blips: [string, string, number, number, boolean][] = [
    ['HA', C.sky300, 230, 70, !searching],
    ['QT', C.orange300, 50, 200, !searching],
    ['LN', C.green300, 220, 240, false],
    ['TA', C.grape300, 70, 50, false],
  ];
  return (
    <Modal visible={!!state} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.night }}>
        <LinearGradient colors={NIGHT_DEEP_GRADIENT} style={StyleSheet.absoluteFill} />
        <StarField count={20} seed={31} height={700} />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, gap: 18 }}>
          <View style={{ alignItems: 'center', gap: 6, paddingTop: 16 }}>
            <Pill tone="coin" label="Ghép tự động" />
            <GText v="displayL" color={C.white} align="center">
              {searching ? 'Đang tìm đồng đội...' : state?.phase === 'matched' ? 'Đã ghép được nhóm!' : 'Đã gửi yêu cầu'}
            </GText>
            <GText v="bodyM" color={C.ink300} align="center">
              {searching
                ? 'Gom 3–6 hội viên trong bán kính 3 km, trùng giờ xuất phát'
                : state?.phase === 'matched'
                  ? 'Hãy xác nhận tham gia trước giờ xuất phát 2 tiếng.'
                  : 'Sẽ lập nhóm khi đủ 3 hội viên gần bạn cùng khung giờ.'}
            </GText>
          </View>
          <View style={{ alignSelf: 'center', width: 320, height: 320 }}>
            <Svg width={320} height={320}>
              {[160, 115, 70].map((r, i) => (
                <Circle key={r} cx={160} cy={160} r={r - 2} fill={C.sky500} fillOpacity={0.1 + i * 0.05} stroke={C.sky500} strokeWidth={2} strokeDasharray="8 6" />
              ))}
              {searching ? <Path d="M160 160 L160 2 A158 158 0 0 1 297 81 Z" fill={C.sky500} fillOpacity={0.35} /> : null}
            </Svg>
            <Avatar initials={initials(myName)} fill={C.coin300} size={56} style={{ position: 'absolute', left: 132, top: 132 }} />
            {blips.map(([i, c, x, y, found]) => (
              <View key={i} style={{ position: 'absolute', left: x, top: y }}>
                <Avatar initials={i} fill={c} size={40} dim={!found} />
                {found ? (
                  <View style={{ position: 'absolute', right: -6, top: -4, width: 20, height: 20, borderRadius: 20, backgroundColor: C.green500, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={12} color={C.ink900} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Ngày mai', '05:00 · 05:30 · 06:00', '5 km', '±1 hạng', '≤ 3 km'].map((t) => (
              <View key={t} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.night2, borderWidth: 2, borderColor: C.ink900 }}>
                <GText v="bodyMStrong" color={C.white}>
                  {t}
                </GText>
              </View>
            ))}
          </Row>
          <Card gap={8}>
            <Row between>
              <GText v="bodyMStrong">{searching ? 'Đang quét hội viên gần bạn' : 'Đã tìm thấy'}</GText>
              <GText v="numS" color={C.green700}>
                {searching ? '…' : state?.phase === 'matched' ? '3 / 3 tối thiểu' : 'Đang chờ thêm'}
              </GText>
            </Row>
            <XPBar pct={searching ? 0.45 : state?.phase === 'matched' ? 1 : 0.66} tone="green" height={16} />
          </Card>
          <View style={{ flex: 1 }} />
          {state?.phase === 'matched' && state.groupId ? (
            <GButton
              label="Vào phòng chờ nhóm"
              icon={Users}
              onPress={() => {
                const id = state.groupId!;
                onClose();
                router.push(`/(runner)/groups/${id}`);
              }}
              block
            />
          ) : null}
          <GButton label={searching ? 'Huỷ tìm' : 'Đóng'} type="secondary" icon={X} onPress={onClose} block style={{ marginBottom: 16 }} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function VipPass() {
  const [busy, setBusy] = useState(false);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const subscribe = async () => {
    setBusy(true);
    try {
      await subscribeMember();
      toast.success('Bạn đã là Hội viên KILOMeet!', { description: 'Bắt đầu ghép nhóm chạy ngay.' });
    } catch (e) {
      toast.error('Đăng ký thất bại', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Body padTop={4} padBottom={TAB_BAR_SPACE + 16}>
        <Row between>
          <GText v="displayL">Nhóm chạy</GText>
          <CoinChip amount={fmtInt(tokenBalance)} />
        </Row>
        <View style={[{ borderRadius: 26, borderWidth: 3, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
          <LinearGradient colors={[C.grape500, C.night2]} style={{ padding: 20, gap: 12 }}>
            <Row between>
              <Pill tone="coin" label="Hội viên pass" />
              <View style={[{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.coin500, borderWidth: 3, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.glowCoin]}>
                <Crown size={34} color={C.ink900} strokeWidth={2.5} />
              </View>
            </Row>
            <GText v="displayL" color={C.white}>
              Chạy cùng đồng đội{'\n'}gần nhà
            </GText>
            <Row gap={6} center={false} style={{ alignItems: 'baseline' }}>
              <GText v="numL" color={C.coin500}>
                {MEMBERSHIP_PRICE}
              </GText>
              <GText v="titleS" color={C.grape300}>
                / tháng
              </GText>
            </Row>
            {MEMBER_BENEFITS.map((b) => (
              <Row key={b} gap={10}>
                <View style={{ width: 24, height: 24, borderRadius: 24, backgroundColor: C.green500, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color={C.ink900} strokeWidth={3} />
                </View>
                <GText v="bodyMStrong" color={C.white} style={{ flex: 1 }}>
                  {b}
                </GText>
              </Row>
            ))}
          </LinearGradient>
        </View>
        <Banner icon={Info} tone="sky" text="Token, hạng, voucher và luật cuối mùa giống hệt người chơi miễn phí." />
        <SectionHeader title="Nhóm gần bạn" link="Đã khoá" linkColor={C.ink500} />
        <View>
          <View style={{ opacity: 0.35 }} pointerEvents="none">
            <Card row pad={12} gap={12}>
              <View style={{ width: 76, paddingVertical: 10, borderRadius: 16, backgroundColor: C.coin300, borderWidth: 2, borderColor: C.ink900, alignItems: 'center' }}>
                <GText v="numM">05:30</GText>
                <GText v="bodyS">Mai</GText>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <GText v="titleS">CV Lê Thị Riêng</GText>
                <Row gap={6}>
                  <Pill tone="sky" label="5 km" />
                  <Pill tone="grape" label="±1 hạng" />
                </Row>
              </View>
            </Card>
          </View>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.ink900 }}>
              <Lock size={16} color={C.coin500} strokeWidth={2.5} />
              <GText v="bodyMStrong" color={C.white}>
                Chỉ dành cho Hội viên
              </GText>
            </View>
          </View>
        </View>
        <GButton label={`Kích hoạt · ${MEMBERSHIP_PRICE}`} type="night" icon={Crown} loading={busy} onPress={() => void subscribe()} block />
        <GText v="bodyS" color={C.ink500} align="center">
          Thanh toán giả lập cho bản demo
        </GText>
      </Body>
    </Screen>
  );
}

export default function GroupsScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups, autoMatch } = useGroupStore();
  const runner = user?.role === 'runner' || user?.role === 'member' ? (user as Runner) : null;
  const isMember = runner?.isMember ?? false;

  useEffect(() => {
    if (isMember) fetchGroups().catch(() => undefined);
  }, [isMember, fetchGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups().catch(() => undefined);
    setRefreshing(false);
  }, [fetchGroups]);

  if (!isMember) return <VipPass />;

  const q = search.trim().toLowerCase();
  const filtered = groups.filter((g) => !q || g.meetingPoint.name.toLowerCase().includes(q) || g.timeSlot.includes(q));
  const mine = filtered.filter((g) => g.members.some((m) => m.userId === user?.id));
  const nearby = filtered.filter((g) => !g.members.some((m) => m.userId === user?.id) && g.status !== 'cancelled' && g.status !== 'completed');

  /**
   * Ghép tự động: gửi yêu cầu (ngày mai, khung 5:00, 5:30, 6:00, 5 km, chênh tối đa 1 hạng, vị trí hiện tại).
   * Đủ 3 người gần nhau cùng khung giờ thì BE lập nhóm ngay; chưa đủ thì chờ người khác đăng ký.
   */
  const handleAutoMatch = async () => {
    setMatch({ phase: 'searching' });
    try {
      let pos = { latitude: 10.7722, longitude: 106.6596 };
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }
      const tomorrow = new Date(Date.now() + 7 * 3600_000 + 86_400_000).toISOString().slice(0, 10);
      const [r] = await Promise.all([
        autoMatch({ date: tomorrow, timeSlots: ['05:00', '05:30', '06:00'], distanceKm: 5, rankRange: 'within1', ...pos }),
        new Promise((res) => setTimeout(res, 1800)),
      ]);
      await fetchGroups().catch(() => undefined);
      setMatch(r.status === 'matched' && r.groupId ? { phase: 'matched', groupId: r.groupId } : { phase: 'pending' });
    } catch (e) {
      setMatch(null);
      toast.error('Không thể ghép nhóm lúc này', { description: (e as Error).message });
    }
  };

  return (
    <Screen>
      <Body padTop={4} padBottom={TAB_BAR_SPACE + 16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        <Row between>
          <GText v="displayL">Nhóm chạy</GText>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.grape500, borderWidth: 2, borderColor: C.ink900 }, DEPTH.small]}>
            <Crown size={16} color={C.coin500} strokeWidth={2.5} />
            <GText v="caps" color={C.white}>
              Hội viên
            </GText>
          </View>
        </Row>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm theo địa điểm, giờ..." />
        <Row gap={12} center={false}>
          {[
            ['Tự lập nhóm', 'Chọn giờ, điểm hẹn, mời người gần', Plus, 'green', () => router.push('/(runner)/groups/create')],
            ['Ghép tự động', 'Hệ thống gom 3–6 người trong 3 km', Zap, 'orange', () => void handleAutoMatch()],
          ].map(([t, d, I, tone, fn]) => (
            <Card key={t as string} gap={8} pad={14} fill={TONE[tone as Tone][300]} onPress={fn as () => void} style={{ flex: 1 }}>
              <IconTile icon={I as typeof Plus} size={52} iconSize={28} fill={TONE[tone as Tone][500]} radius={16} sw={2.5} depth="small" />
              <GText v="titleS">{t as string}</GText>
              <GText v="bodyS" color={C.ink700}>
                {d as string}
              </GText>
            </Card>
          ))}
        </Row>
        <Card gap={8} pad={14}>
          <Row between>
            <Row gap={6}>
              <Clock size={18} color={C.sky700} strokeWidth={2.5} />
              <GText v="bodyMStrong">Độ đúng hẹn</GText>
            </Row>
            <GText v="numM" color={runner!.punctuality >= 80 ? C.green700 : C.orange700}>
              {runner!.punctuality}%
            </GText>
          </Row>
          <XPBar pct={runner!.punctuality / 100} tone={runner!.punctuality >= 80 ? 'green' : 'orange'} height={14} />
          <GText v="bodyS" color={C.ink500}>
            Đến trễ hoặc vắng không báo sẽ làm giảm độ đúng hẹn. Có nhóm chỉ nhận người từ 80% trở lên.
          </GText>
        </Card>

        <SectionHeader title="Nhóm của tôi" link={`${mine.length} nhóm`} linkColor={C.ink500} />
        {mine.length === 0 ? (
          <Card row>
            <IconTile icon={Users} fill={C.sunken} />
            <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
              Bạn chưa tham gia nhóm nào. Tự lập nhóm hoặc ghép tự động nhé!
            </GText>
          </Card>
        ) : (
          mine.map((g) => <GroupCard key={g.id} g={g} mine onPress={() => router.push(`/(runner)/groups/${g.id}`)} />)
        )}

        <SectionHeader title="Nhóm gần bạn" link={`${nearby.length} nhóm`} linkColor={C.ink500} />
        {nearby.length === 0 ? (
          <EmptyState icon={Users} title="Chưa có nhóm phù hợp" text="Thử ghép tự động để hệ thống tìm đồng đội cho bạn." tone={C.grape300} />
        ) : (
          nearby.map((g) => <GroupCard key={g.id} g={g} onPress={() => router.push(`/(runner)/groups/${g.id}`)} />)
        )}
      </Body>
      <Matchmaking state={match} onClose={() => setMatch(null)} myName={user?.name ?? 'Bạn'} />
    </Screen>
  );
}
