import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Check, Hourglass, Link2, LogOut, RefreshCcw, Shield, Store as StoreIcon } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import type { PendingStore, SeasonInfo } from '../../src/api/types';
import { C, DEPTH, NIGHT_GRADIENT } from '../../src/theme/game';
import { fmtDate } from '../../src/lib/format';
import { Body, Card, GameDialog, GButton, GText, IconTile, Loading, MenuRow, Pill, Row, Screen, SectionHeader, XPBar } from '../../src/components/game';

type AdminStore = PendingStore & { status: 'pending' | 'approved' | 'rejected' };

function daysUntil(dateStr: string) {
  if (!dateStr) return 0;
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000));
}

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [pending, setPending] = useState<PendingStore[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [p, s, all] = await Promise.all([
        api.get<PendingStore[]>('/admin/pending-stores'),
        api.get<SeasonInfo[]>('/admin/seasons'),
        api.get<AdminStore[]>('/admin/stores').catch(() => [] as AdminStore[]),
      ]);
      setPending(p);
      setSeasons(s);
      setStores(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) return <Loading />;
  const active = seasons.find((s) => s.isActive);
  const daysLeft = active ? daysUntil(active.endDate) : 0;
  const pct = active ? Math.min(1, (Date.now() - Date.parse(active.startDate)) / (Date.parse(active.endDate) - Date.parse(active.startDate))) : 0;
  const approved = stores.filter((s) => s.status === 'approved').length;

  return (
    <Screen>
      <Body
        padTop={4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchData();
              setRefreshing(false);
            }}
            tintColor={C.green700}
          />
        }>
        <Row gap={12}>
          <IconTile icon={Shield} size={52} iconSize={28} fill={C.sky500} radius={16} sw={2.5} depth="small" />
          <View style={{ flex: 1, gap: 2 }}>
            <GText v="titleL">Bảng điều khiển</GText>
            <Pill tone="ink" label={`Game master · ${user?.name ?? 'Admin'}`} />
          </View>
        </Row>

        <View style={[{ borderRadius: 22, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
          <LinearGradient colors={NIGHT_GRADIENT} style={{ padding: 18, gap: 10 }}>
            <Row between>
              <Pill tone={active ? 'green' : 'red'} label={active ? 'Đang diễn ra' : 'Chưa mở mùa'} />
              {active ? (
                <GText v="bodyS" color={C.ink300}>
                  {fmtDate(active.startDate).slice(0, 5)} – {fmtDate(active.endDate).slice(0, 5)}
                </GText>
              ) : null}
            </Row>
            <GText v="titleL" color={C.white}>
              {active?.name ?? 'Chưa có mùa đang chạy'}
            </GText>
            {active ? (
              <>
                <Row gap={8} center={false} style={{ alignItems: 'baseline' }}>
                  <GText v="numXL" color={C.coin500}>
                    {daysLeft}
                  </GText>
                  <GText v="titleS" color={C.ink300}>
                    ngày còn lại
                  </GText>
                </Row>
                <XPBar pct={pct} tone="coin" height={16} />
              </>
            ) : null}
          </LinearGradient>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            [String(pending.length), 'cửa hàng chờ duyệt', Hourglass, C.orange300],
            [String(approved), 'cửa hàng đối tác', Check, C.green300],
            [String(seasons.length), 'mùa đã tạo', Calendar, C.sky300],
            [active ? String(daysLeft) : '—', 'ngày tới reset', RefreshCcw, C.coin300],
          ].map(([v, l, I, tile]) => (
            <Card key={l as string} gap={4} pad={14} style={{ width: '47.8%' }}>
              <IconTile icon={I as typeof Check} size={36} iconSize={18} fill={tile as string} radius={10} />
              <GText v="numL">{v as string}</GText>
              <GText v="bodyS" color={C.ink500}>
                {l as string}
              </GText>
            </Card>
          ))}
        </View>

        <SectionHeader title="Điều hành" />
        <Card pad={[4, 0]} gap={0} style={{ overflow: 'hidden' }}>
          <MenuRow
            icon={StoreIcon}
            tile={C.orange300}
            title="Duyệt cửa hàng"
            subtitle={`${pending.length} quán đang chờ duyệt`}
            onPress={() => router.push('/(admin)/stores')}
            right={
              pending.length ? (
                <View style={{ minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 24, backgroundColor: C.red500, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                  <GText v="numS" color={C.white}>
                    {pending.length}
                  </GText>
                </View>
              ) : undefined
            }
          />
          <MenuRow icon={RefreshCcw} tile={C.grape300} title="Quản lý mùa" subtitle="Mở / đóng mùa, chạy reset" onPress={() => router.push('/(admin)/season')} />
          <MenuRow icon={Link2} tile={C.green300} title="Chuỗi Avalanche Fuji" subtitle="Token, voucher, huy hiệu ghi on-chain" last />
        </Card>

        <GButton label="Đăng xuất" type="secondary" icon={LogOut} onPress={() => setLogoutOpen(true)} block />
      </Body>
      <GameDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        icon={LogOut}
        title="Đăng xuất?"
        actions={
          <>
            <GButton label="Ở lại" onPress={() => setLogoutOpen(false)} block />
            <GButton
              label="Đăng xuất"
              type="danger"
              icon={LogOut}
              onPress={() => {
                setLogoutOpen(false);
                logout();
                router.replace('/(auth)/login');
              }}
              block
            />
          </>
        }
      />
    </Screen>
  );
}
