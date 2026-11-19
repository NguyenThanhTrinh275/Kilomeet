import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { toast } from 'sonner-native';
import { Bell, Check, Clock, Crown, ExternalLink, Footprints, History, Info, LogOut, Route, Settings2, Trophy, Wallet } from 'lucide-react-native';
import { useAuthStore } from '../../../src/stores/auth';
import { useRunnerStore } from '../../../src/stores/runner';
import type { Runner } from '../../../src/api/types';
import { C, DEPTH, RANK_LABEL } from '../../../src/theme/game';
import { avatarColor, fmtInt, fmtKm, initials } from '../../../src/lib/format';
import { MEMBER_BENEFITS, MEMBERSHIP_PRICE, subscribeMember } from '../../../src/lib/membership';
import {
  Avatar,
  Body,
  Card,
  GameDialog,
  GButton,
  GText,
  IconButton,
  IconTile,
  MenuRow,
  Pill,
  RankEmblem,
  Row,
  Screen,
  TAB_BAR_SPACE,
  Toggle,
} from '../../../src/components/game';

const shortAddr = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user) as Runner | null;
  const logout = useAuthStore((s) => s.logout);
  const runs = useRunnerStore((s) => s.runs);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const fetchRuns = useRunnerStore((s) => s.fetchRuns);
  const [notify, setNotify] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    fetchRuns().catch(() => undefined);
  }, [fetchRuns]);

  if (!user) return null;
  const rank = user.rank || 'đồng';
  const totalKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const explorer = `https://testnet.snowtrace.io/address/${user.walletAddress}`;

  const confirmSubscribe = async () => {
    setSubscribing(true);
    try {
      await subscribeMember();
      setSubscribeOpen(false);
      toast.success('Bạn đã là Hội viên KILOMeet!', { description: 'Vào tab "Nhóm" để bắt đầu ghép chạy.' });
    } catch (e) {
      toast.error('Đăng ký thất bại', { description: (e as Error).message });
    } finally {
      setSubscribing(false);
    }
  };

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <Screen>
      <LinearGradient colors={[C.coin500, C.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }} />
      <Body padTop={4} padBottom={TAB_BAR_SPACE + 16}>
        <Row style={{ justifyContent: 'flex-end' }}>
          <IconButton icon={Settings2} onPress={() => toast.info('Cài đặt sẽ có trong bản sau')} />
        </Row>
        <View style={{ alignItems: 'center', gap: 8, marginTop: -16 }}>
          <View style={{ width: 108, height: 108 }}>
            <Avatar initials={initials(user.name)} fill={avatarColor(user.name)} size={96} style={{ position: 'absolute', left: 6, top: 0 }} />
            <RankEmblem rank={rank} size={42} style={{ position: 'absolute', right: 0, bottom: 0 }} />
          </View>
          <Row gap={8}>
            <GText v="displayL">{user.name}</GText>
            {user.isMember ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: C.grape500, borderWidth: 2, borderColor: C.ink900 }}>
                <Crown size={14} color={C.coin500} strokeWidth={2.5} />
                <GText v="caps" color={C.white}>
                  VIP
                </GText>
              </View>
            ) : null}
          </Row>
          <GText v="bodyM" color={C.ink500}>
            {user.email}
          </GText>
          <Card row pad={[6, 12]} gap={6} fill={C.sky300} depth="small" sw={2} radius={999} onPress={() => Linking.openURL(explorer)}>
            <Wallet size={16} color={C.sky700} strokeWidth={2.5} />
            <GText v="bodyMStrong">{shortAddr(user.walletAddress)} · Avalanche Fuji</GText>
            <ExternalLink size={14} color={C.sky700} strokeWidth={2.5} />
          </Card>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            [fmtKm(totalKm), 'Tổng km mùa', Route, C.green300],
            [String(runs.length), 'Buổi chạy', Footprints, C.sky300],
            [fmtInt(tokenBalance), 'Token ví', Wallet, C.coin300],
            [user.isMember ? `${user.punctuality}%` : RANK_LABEL[rank], user.isMember ? 'Đúng hẹn' : 'Hạng', user.isMember ? Clock : Trophy, C.grape300],
          ].map(([v, l, I, tile]) => (
            <Card key={l as string} row pad={12} gap={10} style={{ width: '47.8%' }}>
              <IconTile icon={I as typeof Route} size={40} iconSize={20} fill={tile as string} radius={12} />
              <View style={{ flex: 1 }}>
                <GText v="numM" numberOfLines={1} adjustsFontSizeToFit>
                  {v as string}
                </GText>
                <GText v="bodyS" color={C.ink500}>
                  {l as string}
                </GText>
              </View>
            </Card>
          ))}
        </View>

        <Card row pad={14} gap={12} onPress={() => router.push('/(runner)/badges')}>
          <RankEmblem rank={user.seasonBadge ?? rank} size={48} />
          <View style={{ flex: 1 }}>
            <GText v="titleS">Thành tích mùa này</GText>
            <GText v="bodyS" color={C.ink500}>
              Cao nhất: {RANK_LABEL[user.seasonBadge ?? rank]} · xem phòng huy hiệu
            </GText>
          </View>
          <GText v="bodyMStrong" color={C.orange700}>
            Xem →
          </GText>
        </Card>

        {user.isMember ? (
          <View style={[{ borderRadius: 22, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
            <LinearGradient colors={[C.grape500, C.night2]} style={{ padding: 16, gap: 8 }}>
              <Row between>
                <Pill tone="green" label="Đang hoạt động" />
                <Crown size={26} color={C.coin500} strokeWidth={2.5} />
              </Row>
              <GText v="titleM" color={C.white}>
                Gói Hội viên KILOMeet
              </GText>
              <GText v="bodyS" color={C.grape300}>
                {MEMBERSHIP_PRICE}/tháng · ghép nhóm không giới hạn
              </GText>
            </LinearGradient>
          </View>
        ) : (
          <View style={[{ borderRadius: 22, borderWidth: 2.5, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
            <LinearGradient colors={[C.grape500, C.night2]} style={{ padding: 16, gap: 10 }}>
              <Row between>
                <Pill tone="coin" label="Hội viên pass" />
                <GText v="numM" color={C.coin500}>
                  {MEMBERSHIP_PRICE}
                  <GText v="bodyS" color={C.grape300}>
                    /tháng
                  </GText>
                </GText>
              </Row>
              {MEMBER_BENEFITS.slice(0, 3).map((b) => (
                <Row key={b} gap={8}>
                  <Check size={16} color={C.green500} strokeWidth={3} />
                  <GText v="bodyMStrong" color={C.white} style={{ flex: 1 }}>
                    {b}
                  </GText>
                </Row>
              ))}
              <GButton label="Đăng ký Hội viên" type="coin" icon={Crown} onPress={() => setSubscribeOpen(true)} block />
            </LinearGradient>
          </View>
        )}

        <Card pad={[4, 0]} gap={0} style={{ overflow: 'hidden' }}>
          <MenuRow icon={History} tile={C.sky300} title="Lịch sử chạy" subtitle={`${runs.length} buổi chạy mùa này`} onPress={() => router.push('/(runner)/history')} />
          <MenuRow icon={Trophy} tile={C.coin300} title="Huy hiệu mùa" subtitle="Kệ cúp các mùa đã qua" onPress={() => router.push('/(runner)/badges')} />
          <MenuRow icon={Wallet} tile={C.green300} title="Ví & giao dịch" subtitle="Token, voucher on-chain · Snowtrace" onPress={() => router.push('/(runner)/wallet')} />
          <MenuRow icon={Bell} tile={C.orange300} title="Thông báo nhắc chạy" subtitle="Nhiệm vụ mới, sắp hết mùa" right={<Toggle value={notify} onChange={setNotify} />} />
          <MenuRow icon={Info} tile={C.grape300} title="Phiên bản" subtitle="v1.0.0 (Avalanche)" last />
        </Card>

        <GButton label="Đăng xuất" type="danger" icon={LogOut} onPress={() => setLogoutOpen(true)} block />
      </Body>

      <GameDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        icon={Crown}
        iconFill={C.coin500}
        iconColor={C.ink900}
        title="Đăng ký Hội viên?"
        text={`Xác nhận gói Hội viên ${MEMBERSHIP_PRICE}/tháng để mở tính năng ghép nhóm chạy (thanh toán giả lập).`}
        actions={
          <>
            <GButton label="Xác nhận" type="night" icon={Crown} loading={subscribing} onPress={() => void confirmSubscribe()} block />
            <GButton label="Huỷ" type="secondary" onPress={() => setSubscribeOpen(false)} block />
          </>
        }
      />
      <GameDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        icon={LogOut}
        title="Đăng xuất?"
        text="Bạn có chắc chắn muốn đăng xuất tài khoản?"
        actions={
          <>
            <GButton label="Ở lại" onPress={() => setLogoutOpen(false)} block />
            <GButton label="Đăng xuất" type="danger" icon={LogOut} onPress={confirmLogout} block />
          </>
        }
      />
    </Screen>
  );
}
