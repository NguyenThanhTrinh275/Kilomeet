// Ví & giao dịch on-chain: danh sách lệnh chain (outbox) kèm trạng thái và link Snowtrace.
// Dùng cho Runner / Cửa hàng (GET /me/wallet) và Quản trị (GET /admin/chain-txs).
// Lệnh chain được gửi sau (job outbox ~5 s/lần) nên màn tự làm mới khi còn lệnh đang chờ.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  CircleCheck, Clock, Coins, ExternalLink, Flag, Gift, Link2, ScanLine, Store, Ticket, TriangleAlert, Trophy, Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '../../api/client';
import type { ChainTx, WalletInfo } from '../../api/types';
import { C } from '../../theme/game';
import { Body, Card, CoinAmount, EmptyState, GText, IconTile, Loading, Pill, Row, Screen, SectionHeader, TopBar } from '../game';

const POLL_MS = 3000;

const OP_ICON: Record<string, [LucideIcon, string]> = {
  mintToken: [Coins, C.coin300],
  purchaseVoucher: [Ticket, C.orange300],
  giftVoucher: [Gift, C.grape300],
  redeemVoucher: [ScanLine, C.sky300],
  settleSeason: [Flag, C.red300],
  recordBadge: [Trophy, C.coin300],
  approveMerchant: [Store, C.green300],
  createVoucherType: [Ticket, C.green300],
  startSeason: [Flag, C.green300],
  endSeason: [Flag, C.red300],
};

const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function StatusPill({ status }: { status: ChainTx['status'] }) {
  if (status === 'done') return <Pill tone="green" icon={CircleCheck} label="Đã xác nhận" />;
  if (status === 'failed') return <Pill tone="red" icon={TriangleAlert} label="Lỗi" />;
  return <Pill tone="coin" icon={Clock} label="Đang gửi lên chain" />;
}

function TxRow({ tx }: { tx: ChainTx }) {
  const [icon, tile] = OP_ICON[tx.op] ?? [Link2, C.sunken];
  const url = tx.explorerUrl;
  return (
    <Card row gap={12} pad={12} onPress={url ? () => void Linking.openURL(url) : undefined}>
      <IconTile icon={icon} fill={tile} />
      <View style={{ flex: 1, gap: 4 }}>
        <GText v="bodyMStrong" numberOfLines={2}>
          {tx.label}
        </GText>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <StatusPill status={tx.status} />
          <GText v="bodyS" color={C.ink500}>
            {ago(tx.createdAt)}
          </GText>
        </Row>
        {url ? (
          <Row gap={4}>
            <GText v="bodyS" color={C.sky700}>
              Snowtrace {shortAddr(tx.txHash ?? '')}
            </GText>
            <ExternalLink size={12} color={C.sky700} strokeWidth={2.5} />
          </Row>
        ) : null}
      </View>
      {tx.amount ? (
        <GText v="numS" color={tx.amount > 0 ? C.green700 : C.red700}>
          {tx.amount > 0 ? `+${tx.amount}` : `−${-tx.amount}`}
        </GText>
      ) : null}
    </Card>
  );
}

export function WalletView({ mode, title }: { mode: 'me' | 'admin'; title: string }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [txs, setTxs] = useState<ChainTx[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      if (mode === 'admin') {
        setTxs(await api.get<ChainTx[]>('/admin/chain-txs'));
      } else {
        const w = await api.get<WalletInfo>('/me/wallet');
        setWallet(w);
        setTxs(w.transactions);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được giao dịch');
    }
  }, [mode]);

  // Tải khi mở màn; dừng làm mới khi rời màn.
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }, [load]),
  );

  // Còn lệnh đang chờ → hỏi lại sau 3 s để thấy chuyển sang "Đã xác nhận".
  const waiting = txs?.some((t) => t.status === 'pending' || t.status === 'sent') ?? false;
  useEffect(() => {
    if (!waiting) return;
    timer.current = setTimeout(() => void load(), POLL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [waiting, txs, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const offChain = wallet?.chain === 'fake';
  const done = txs?.filter((t) => t.status === 'done').length ?? 0;

  return (
    <Screen>
      <TopBar title={title} />
      <Body refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.green700} />}>
        {mode === 'me' && wallet ? (
          <Card fill={C.sky300} gap={10} pad={16}>
            <Row between>
              <Pill tone="ink" icon={Link2} label={offChain ? 'Chế độ thử · chưa lên chain' : 'Avalanche Fuji'} />
              <CoinAmount amount={wallet.tokenBalance.toLocaleString('vi-VN')} />
            </Row>
            <Row gap={10}>
              <IconTile icon={Wallet} fill={C.surface} />
              <View style={{ flex: 1 }}>
                <GText v="bodyS" color={C.ink700}>
                  Ví của bạn (server trả phí gas)
                </GText>
                <GText v="titleS" numberOfLines={1}>
                  {shortAddr(wallet.address)}
                </GText>
              </View>
            </Row>
            <Card row pad={[8, 12]} depth="none" sw={2} radius={12} onPress={() => void Linking.openURL(wallet.explorerUrl)}>
              <GText v="bodyMStrong" style={{ flex: 1 }}>
                Mở ví trên Snowtrace
              </GText>
              <ExternalLink size={16} color={C.sky700} strokeWidth={2.5} />
            </Card>
          </Card>
        ) : null}

        {mode === 'admin' ? (
          <Card row fill={C.green300} gap={12} pad={14}>
            <IconTile icon={Link2} fill={C.surface} />
            <View style={{ flex: 1 }}>
              <GText v="titleS">Token, voucher, huy hiệu ghi on-chain</GText>
              <GText v="bodyS" color={C.ink700}>
                Ví server ký mọi giao dịch. Chạm một dòng để mở Snowtrace.
              </GText>
            </View>
          </Card>
        ) : null}

        {error ? <EmptyState icon={TriangleAlert} title="Không tải được giao dịch" text={error} tone={C.red300} /> : null}
        {!txs && !error ? <Loading /> : null}
        {txs && txs.length === 0 ? <EmptyState icon={Link2} title="Chưa có giao dịch" text="Chạy bộ, mua hoặc dùng voucher để thấy giao dịch on-chain ở đây." /> : null}

        {txs && txs.length > 0 ? (
          <>
            <SectionHeader title="Giao dịch gần đây" link={waiting ? 'Đang cập nhật…' : `${done}/${txs.length} đã xác nhận`} linkColor={C.ink500} />
            <View style={{ gap: 10 }}>
              {txs.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </View>
          </>
        ) : null}
      </Body>
    </Screen>
  );
}
