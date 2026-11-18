import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { Calendar, ChevronRight, Plus, RefreshCcw, ShoppingBag, Sun, TrendingDown, Trophy, Wallet } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { DAILY_QUEST_REWARD, RANKS, RANK_KM_THRESHOLD, RANK_TOKEN_RETENTION, WEEKLY_QUEST_TOKEN_PER_KM, type SeasonInfo } from '../../src/api/types';
import { C, RANK_LABEL, TONE, type Tone } from '../../src/theme/game';
import { fmtDate } from '../../src/lib/format';
import { Body, Card, Coin, EmptyState, GameDialog, GButton, GText, IconTile, InfoRow, Loading, Pill, RankEmblem, Row, Screen, SectionHeader, TopBar } from '../../src/components/game';

export default function SeasonScreen() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const fetchSeasons = useCallback(async () => {
    try {
      setSeasons(await api.get<SeasonInfo[]>('/admin/season'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSeasons();
  }, [fetchSeasons]);

  const season = seasons.find((s) => s.isActive) ?? seasons[seasons.length - 1];
  const past = seasons.filter((s) => s !== season);
  const daysLeft = season?.endDate ? Math.max(0, Math.ceil((Date.parse(`${season.endDate.slice(0, 10)}T23:59:59+07:00`) - Date.now()) / 86_400_000)) : 0;

  async function act(action: 'end' | 'start') {
    setBusy(true);
    try {
      await api.post<SeasonInfo>('/admin/season', { action });
      setCloseOpen(false);
      setNewOpen(false);
      toast.success(action === 'end' ? 'Đã đóng mùa giải hiện tại' : 'Đã mở mùa giải mới', {
        description: 'Giao dịch reset đang ghi lên Avalanche.',
        action: { label: 'Xem giao dịch', onClick: () => router.push('/(admin)/chain') },
      });
      await fetchSeasons();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : action === 'end' ? 'Không thể đóng mùa' : 'Không thể mở mùa mới');
    } finally {
      setBusy(false);
    }
  }

  if (loading && seasons.length === 0) return <Loading />;

  return (
    <Screen>
      <TopBar title="Quản lý mùa" action={Calendar} />
      <Body>
        {!season ? (
          <>
            <EmptyState icon={Trophy} title="Chưa có mùa nào" text="Mở mùa đầu tiên để người chạy bắt đầu leo hạng." tone={C.coin300} />
            <GButton label="Mở mùa mới" icon={Plus} onPress={() => setNewOpen(true)} block />
          </>
        ) : (
          <>
            <Card fill={C.grape300} gap={8}>
              <Row between>
                <GText v="titleM" style={{ flex: 1 }}>
                  {season.name}
                </GText>
                <Pill tone={season.isActive ? 'green' : 'red'} label={season.isActive ? 'Đang diễn ra' : 'Đã kết thúc'} />
              </Row>
              <Row between>
                <GText v="bodyM" color={C.ink700}>
                  Bắt đầu
                </GText>
                <GText v="bodyMStrong">{fmtDate(season.startDate)}</GText>
              </Row>
              {season.endDate ? (
                <Row between>
                  <GText v="bodyM" color={C.ink700}>
                    Kết thúc
                  </GText>
                  <GText v="bodyMStrong">{fmtDate(season.endDate)} · 23:59</GText>
                </Row>
              ) : null}
              {season.isActive ? (
                <Row between>
                  <GText v="bodyM" color={C.ink700}>
                    Còn lại
                  </GText>
                  <GText v="bodyMStrong">{daysLeft} ngày</GText>
                </Row>
              ) : null}
              {season.isActive ? (
                <GButton label="Đóng mùa & chạy reset" type="danger" icon={RefreshCcw} onPress={() => setCloseOpen(true)} block style={{ marginTop: 6 }} />
              ) : (
                <GButton label="Mở mùa mới" icon={Plus} onPress={() => setNewOpen(true)} block style={{ marginTop: 6 }} />
              )}
            </Card>

            <SectionHeader title="Bậc thang hạng" link="km/tuần · token giữ" linkColor={C.ink500} />
            <Card pad={[4, 14]} gap={0}>
              <Row style={{ paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: C.ink300 }}>
                <GText v="caps" color={C.ink500} style={{ flex: 1 }}>
                  Hạng
                </GText>
                <GText v="caps" color={C.ink500} style={{ width: 66 }}>
                  Km
                </GText>
                <GText v="caps" color={C.ink500} style={{ width: 66 }}>
                  Giữ
                </GText>
              </Row>
              {RANKS.map((r, i) => (
                <Row key={r} style={{ paddingVertical: 8, borderBottomWidth: i < RANKS.length - 1 ? 1.5 : 0, borderBottomColor: C.ink300 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <RankEmblem rank={r} size={30} />
                    <GText v="bodyMStrong" numberOfLines={1} style={{ marginLeft: 8, flexShrink: 1 }}>
                      {RANK_LABEL[r]}
                    </GText>
                  </View>
                  <GText v="numS" style={{ width: 66 }}>
                    {RANK_KM_THRESHOLD[r] ? `${RANK_KM_THRESHOLD[r]} km` : '—'}
                  </GText>
                  <Row gap={4} style={{ width: 66 }}>
                    <Coin size={16} />
                    <GText v="numS">{RANK_TOKEN_RETENTION[r]}</GText>
                  </Row>
                </Row>
              ))}
            </Card>

            <SectionHeader title="Phần thưởng nhiệm vụ" />
            <Row gap={12} center={false}>
              {[
                ['Nhiệm vụ ngày', `+${DAILY_QUEST_REWARD}`, 'chạy ≥ 2 km', 'orange'],
                ['Nhiệm vụ tuần', `+${WEEKLY_QUEST_TOKEN_PER_KM}/km`, 'TB 4 tuần +10%', 'sky'],
              ].map(([t, v, s, tone]) => (
                <Card key={t} fill={TONE[tone as Tone][300]} gap={4} pad={14} style={{ flex: 1 }}>
                  <GText v="bodyMStrong">{t}</GText>
                  <Row gap={4}>
                    <Coin size={22} />
                    <GText v="numL">{v}</GText>
                  </Row>
                  <GText v="bodyS" color={C.ink700}>
                    {s}
                  </GText>
                </Card>
              ))}
            </Row>

            {past.length ? (
              <>
                <SectionHeader title="Mùa trước" />
                {past.map((s) => (
                  <Card key={s.id} row pad={12} depth="small">
                    <IconTile icon={Trophy} size={40} iconSize={20} fill={C.sunken} color={C.ink500} radius={12} />
                    <View style={{ flex: 1 }}>
                      <GText v="bodyMStrong">{s.name}</GText>
                      <GText v="bodyS" color={C.ink500}>
                        {fmtDate(s.startDate)} – {s.endDate ? fmtDate(s.endDate) : '…'}
                      </GText>
                    </View>
                    <Pill tone="ink" label="Đã đóng" />
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </Body>

      <GameDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        icon={RefreshCcw}
        title={`Đóng ${season?.name ?? 'mùa'}?`}
        text="Thao tác không thể hoàn tác. Giao dịch reset được ghi công khai trên Avalanche."
        actions={
          <>
            <GButton label="Đóng mùa" type="danger" icon={RefreshCcw} loading={busy} onPress={() => void act('end')} block />
            <GButton label="Huỷ" type="secondary" onPress={() => setCloseOpen(false)} block />
          </>
        }>
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          {[
            [TrendingDown, 'Mọi người tụt 2 bậc hạng (thấp nhất Đồng)', 'red'],
            [Wallet, 'Token cắt theo hạng: tối đa 0 → 500', 'coin'],
            [Trophy, 'Mint huy hiệu mùa (NFT không chuyển được)', 'grape'],
            [ShoppingBag, 'Voucher đã mua được giữ nguyên', 'green'],
          ].map(([I, t, tone]) => {
            const Icon = I as typeof Trophy;
            return (
              <Row key={t as string} gap={10} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: TONE[tone as Tone][300], borderWidth: 1.5, borderColor: C.ink900 }}>
                <Icon size={18} color={C.ink900} strokeWidth={2.5} />
                <GText v="bodyMStrong" style={{ flex: 1 }}>
                  {t as string}
                </GText>
              </Row>
            );
          })}
          <View style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: C.sunken, borderWidth: 2, borderColor: C.ink900 }}>
            <GText v="caps" color={C.ink500}>
              Ví dụ · Cao Thủ 1.000 token
            </GText>
            <Row gap={8} style={{ justifyContent: 'center' }}>
              <RankEmblem rank="cao_thủ" size={32} />
              <Row gap={3}>
                <Coin size={16} />
                <GText v="numS">1.000</GText>
              </Row>
              <ChevronRight size={18} color={C.ink500} strokeWidth={2.5} />
              <RankEmblem rank="bạch_kim" size={32} />
              <Row gap={3}>
                <Coin size={16} />
                <GText v="numS" color={C.green700}>
                  500
                </GText>
              </Row>
            </Row>
          </View>
        </View>
      </GameDialog>

      <GameDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        icon={Sun}
        iconFill={C.coin500}
        iconColor={C.ink900}
        title="Mở mùa mới?"
        text="Mùa mới bắt đầu ngay, người chạy có thể leo hạng trở lại."
        actions={
          <>
            <GButton label="Mở mùa" icon={Plus} loading={busy} onPress={() => void act('start')} block />
            <GButton label="Huỷ" type="secondary" onPress={() => setNewOpen(false)} block />
          </>
        }
      />
    </Screen>
  );
}
