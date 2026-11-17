import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { toast } from 'sonner-native';
import { Check, ChevronRight, Clock, LogOut, Mail, Plus, Receipt, RefreshCcw, ScanLine, Settings2, ShoppingBag, Store as StoreIcon, Wallet } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/auth';
import type { Store, StoreDashboard, StoreProfile } from '../../src/api/types';
import { C } from '../../src/theme/game';
import { profileCompleteness } from '../../src/lib/storeProfile';
import { avatarColor, fmtTime, fmtVnd, fmtVndShort, fmtDayMonth, initials } from '../../src/lib/format';
import {
  Avatar,
  Body,
  Card,
  GameDialog,
  GameSheet,
  GButton,
  GText,
  Glow,
  IconButton,
  IconTile,
  Loading,
  MenuRow,
  Pill,
  Row,
  Screen,
  SectionHeader,
  StatTile,
  StoreNav,
  TAB_BAR_SPACE,
  XPBar,
} from '../../src/components/game';

function StoreHeader({ name, approved, onMenu }: { name: string; approved: boolean; onMenu: () => void }) {
  return (
    <Row gap={12}>
      <IconTile icon={StoreIcon} size={52} iconSize={28} fill={C.orange500} radius={16} sw={2.5} depth="small" />
      <View style={{ flex: 1, gap: 2 }}>
        <GText v="titleL" numberOfLines={1}>
          {name}
        </GText>
        <Row gap={6}>
          <Pill tone={approved ? 'green' : 'coin'} label={approved ? 'Đã duyệt' : 'Chờ duyệt'} />
          <GText v="bodyS" color={C.ink500}>
            Đối tác
          </GText>
        </Row>
      </View>
      <IconButton icon={Settings2} onPress={onMenu} />
    </Row>
  );
}

export default function StoreDashboardScreen() {
  const user = useAuthStore((s) => s.user) as Store | null;
  const logout = useAuthStore((s) => s.logout);
  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const approved = user?.approved ?? false;

  const load = useCallback(async () => {
    await Promise.all([
      api.get<StoreDashboard>('/store/dashboard').then(setDashboard).catch(() => undefined),
      api.get<StoreProfile>('/store/profile').then(setProfile).catch(() => undefined),
    ]);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      api.get<StoreProfile>('/store/profile').then(setProfile).catch(() => undefined);
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), useAuthStore.getState().refreshMe().catch(() => undefined)]);
    setRefreshing(false);
  }, [load]);

  const doLogout = () => {
    setLogoutOpen(false);
    logout();
    router.replace('/(auth)/login');
  };

  if (loading) return <Loading />;
  const name = dashboard?.storeName ?? user?.storeName ?? '';
  const menu = (
    <>
      <GameSheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <GText v="titleL">Cửa hàng</GText>
        <Card pad={[4, 0]} gap={0} style={{ overflow: 'hidden' }}>
          <MenuRow icon={StoreIcon} tile={C.orange300} title="Hồ sơ quán" subtitle="Giới thiệu quán cho người chạy" onPress={() => (setMenuOpen(false), router.push('/(store)/profile'))} />
          <MenuRow icon={ShoppingBag} tile={C.coin300} title="Voucher của tôi" subtitle="Danh sách voucher đang bán" onPress={() => (setMenuOpen(false), router.push('/(store)/vouchers'))} />
          <MenuRow icon={LogOut} tile={C.red300} title="Đăng xuất" titleColor={C.red700} onPress={() => (setMenuOpen(false), setLogoutOpen(true))} last />
        </Card>
      </GameSheet>
      <GameDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        icon={LogOut}
        title="Đăng xuất?"
        actions={
          <>
            <GButton label="Ở lại" onPress={() => setLogoutOpen(false)} block />
            <GButton label="Đăng xuất" type="danger" icon={LogOut} onPress={doLogout} block />
          </>
        }
      />
    </>
  );

  // ─── Chờ duyệt ────────────────────────────────────────────────
  if (!approved) {
    const steps: [string, 'done' | 'now' | 'next'][] = [
      ['Tạo tài khoản & ví', 'done'],
      [`Gửi vị trí quán${user ? ` (${user.latitude.toFixed(3)}, ${user.longitude.toFixed(3)})` : ''}`, 'done'],
      ['Quản trị duyệt', 'now'],
      ['Tạo voucher đầu tiên', 'next'],
    ];
    return (
      <Screen>
        <Body padTop={4} gap={18} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
          <StoreHeader name={name} approved={false} onMenu={() => setMenuOpen(true)} />
          <View style={{ alignItems: 'center', height: 210 }}>
            <Glow size={200} color={C.coin500} opacity={0.3} style={{ position: 'absolute', top: 0 }} />
            <View style={{ marginTop: 35, width: 130, height: 130, borderRadius: 130, backgroundColor: C.coin500, borderWidth: 4, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 4px 0px ${C.ink900}` }}>
              <Clock size={70} color={C.ink900} strokeWidth={2.5} />
            </View>
          </View>
          <GText v="displayL" align="center">
            Đang chờ duyệt
          </GText>
          <GText v="bodyL" color={C.ink500} align="center">
            Quản trị viên sẽ kiểm tra thông tin và vị trí quán. Thường mất dưới 24 giờ.
          </GText>
          <Card pad={[6, 16]} gap={0}>
            {steps.map(([t, st], i) => (
              <Row key={t} gap={12} style={{ paddingVertical: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 28, backgroundColor: st === 'done' ? C.green500 : st === 'now' ? C.coin500 : C.sunken, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                  {st === 'done' ? <Check size={16} color={C.ink900} strokeWidth={3} /> : <GText v="numS">{i + 1}</GText>}
                </View>
                <GText v="bodyMStrong" color={st === 'next' ? C.ink500 : C.ink900} style={{ flex: 1 }}>
                  {t}
                </GText>
              </Row>
            ))}
          </Card>
          <GButton label="Kiểm tra lại" icon={RefreshCcw} onPress={() => void onRefresh()} loading={refreshing} block />
          <GButton label="Hoàn thiện hồ sơ quán" type="secondary" icon={StoreIcon} onPress={() => router.push('/(store)/profile')} block />
          <GButton label="Liên hệ hỗ trợ" type="secondary" size="M" icon={Mail} onPress={() => toast.info('Email: support@kilomeet.app')} block />
        </Body>
        {menu}
      </Screen>
    );
  }

  // ─── Đã duyệt ─────────────────────────────────────────────────
  const d = dashboard;
  const comp = profileCompleteness(profile);
  const missing = comp.items.find((i) => !i[1])?.[0];
  const days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = day.toISOString().slice(0, 10);
    return { label: fmtDayMonth(day.toISOString()).slice(0, 2), count: d?.recentUsages.filter((u) => u.usedAt.slice(0, 10) === key).length ?? 0 };
  });
  const maxDay = Math.max(1, ...days.map((x) => x.count));

  return (
    <Screen>
      <Body padTop={4} padBottom={TAB_BAR_SPACE + 16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        <StoreHeader name={name} approved onMenu={() => setMenuOpen(true)} />
        <Row gap={12} center={false}>
          <StatTile value={String(d?.totalVouchersCreated ?? 0)} label="voucher tạo" icon={ShoppingBag} tile={C.orange300} onPress={() => router.push('/(store)/vouchers')} />
          <StatTile value={String(d?.totalVouchersUsed ?? 0)} label="lượt đã dùng" icon={Check} tile={C.green300} />
          <StatTile value={fmtVndShort(d?.totalFeesVnd ?? 0)} label="phí còn nợ" icon={Wallet} tile={C.red300} />
        </Row>
        <Row gap={12} center={false}>
          {[
            ['Quét QR', 'Xác nhận voucher tại quầy', ScanLine, C.orange300, C.orange500, () => router.push('/(store)/scan')],
            ['Tạo voucher', 'Thêm nhiệm vụ chạy ngang quán', Plus, C.green300, C.green500, () => router.push('/(store)/vouchers/create')],
          ].map(([t, s, I, bg, fg, fn]) => (
            <Card key={t as string} fill={bg as string} gap={8} pad={14} onPress={fn as () => void} style={{ flex: 1 }}>
              <IconTile icon={I as typeof Plus} size={56} iconSize={30} fill={fg as string} radius={18} sw={2.5} depth="small" />
              <GText v="titleM">{t as string}</GText>
              <GText v="bodyS" color={C.ink700}>
                {s as string}
              </GText>
            </Card>
          ))}
        </Row>

        <Card row fill={C.coin300} pad={14} onPress={() => router.push('/(store)/profile')}>
          <IconTile icon={StoreIcon} size={48} iconSize={26} fill={C.surface} color={C.orange700} radius={14} />
          <View style={{ flex: 1, gap: 4 }}>
            <GText v="titleS">
              Hồ sơ quán · {Math.round((comp.done / comp.total) * 100)}%
            </GText>
            <XPBar pct={comp.done / comp.total} tone="orange" height={12} />
            <GText v="bodyS" color={C.ink700}>
              {missing ? `Thêm ${missing.toLowerCase()} để hoàn thiện` : 'Hồ sơ đã hoàn thiện — người chạy đọc trước khi mua'}
            </GText>
          </View>
          <ChevronRight size={20} color={C.ink900} strokeWidth={2.5} />
        </Card>

        <Card gap={12}>
          <Row between>
            <GText v="titleS">Lượt dùng 7 ngày qua</GText>
            <Pill tone="grape" label={`${days.reduce((s, x) => s + x.count, 0)} lượt`} />
          </Row>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 10 }}>
            {days.map((x, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: 26, height: Math.max(6, (x.count / maxDay) * 84), borderRadius: 8, backgroundColor: x.count ? (i === 6 ? C.orange500 : C.grape500) : C.sunken, borderWidth: 2, borderColor: C.ink900 }} />
                <GText v="caps" color={C.ink700} style={{ fontSize: 10 }}>
                  {x.label}
                </GText>
              </View>
            ))}
          </View>
          <GText v="bodyS" color={C.ink500}>
            Phí nền tảng {fmtVnd(5000)} mỗi lượt voucher được dùng tại quầy.
          </GText>
        </Card>

        <SectionHeader title="Đổi gần đây" />
        {d && d.recentUsages.length > 0 ? (
          <Card pad={[4, 14]} gap={0}>
            {d.recentUsages.map((u, i) => (
              <Row key={i} gap={10} style={{ paddingVertical: 10, borderBottomWidth: i < d.recentUsages.length - 1 ? 1.5 : 0, borderBottomColor: C.ink300 }}>
                <Avatar initials={initials(u.userName)} fill={avatarColor(u.userName)} size={40} />
                <View style={{ flex: 1 }}>
                  <GText v="bodyMStrong" numberOfLines={1}>
                    {u.voucherTitle}
                  </GText>
                  <GText v="bodyS" color={C.ink500}>
                    {u.userName} · {fmtDayMonth(u.usedAt)} {fmtTime(u.usedAt)}
                  </GText>
                </View>
                <Pill tone="red" label="-5.000đ" />
              </Row>
            ))}
          </Card>
        ) : (
          <Card row>
            <IconTile icon={Receipt} fill={C.sunken} />
            <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
              Chưa có lượt đổi nào. Quét QR khi khách đưa voucher nhé!
            </GText>
          </Card>
        )}
      </Body>
      <StoreNav active="home" />
      {menu}
    </Screen>
  );
}
