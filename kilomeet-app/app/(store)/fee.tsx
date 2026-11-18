// Ví phí trả trước của cửa hàng (quyết định #28) — khớp Figma "33 · Cửa hàng — Ví phí".
// Người chạy mua voucher → giữ 3.000đ; quán quét QR → trừ thật; voucher hết hạn chưa dùng → trả lại.
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { toast } from 'sonner-native';
import { Info, Lock, Plus, RotateCcw, ScanLine, Wallet, type LucideIcon } from 'lucide-react-native';
import { api } from '../../src/api/client';
import type { StoreFeeEntry, StoreFeeKind, StoreFeeWallet } from '../../src/api/types';
import { C } from '../../src/theme/game';
import { fmtDayMonth, fmtInt, fmtTime, fmtVnd } from '../../src/lib/format';
import { Body, Card, EmptyState, GameDialog, GButton, GText, IconTile, Loading, Pill, Row, Screen, SectionHeader, TopBar } from '../../src/components/game';
import { Pressable } from '../../src/components/game/Press';

const KIND: Record<StoreFeeKind, { icon: LucideIcon; tile: string; color: string; sign: string }> = {
  topup: { icon: Wallet, tile: C.orange300, color: C.green700, sign: '+' },
  hold: { icon: Lock, tile: C.coin300, color: C.orange700, sign: '' },
  charge: { icon: ScanLine, tile: C.green300, color: C.red700, sign: '−' },
  release: { icon: RotateCcw, tile: C.sky300, color: C.green700, sign: '+' },
};

const newRequestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function EntryRow({ e, last }: { e: StoreFeeEntry; last: boolean }) {
  const k = KIND[e.kind];
  return (
    <Row gap={10} style={{ paddingVertical: 10, borderBottomWidth: last ? 0 : 1.5, borderBottomColor: C.ink300 }}>
      <IconTile icon={k.icon} size={40} iconSize={20} fill={k.tile} radius={14} sw={2} />
      <View style={{ flex: 1 }}>
        <GText v="bodyMStrong">{e.title}</GText>
        <GText v="bodyS" color={C.ink500} numberOfLines={2}>
          {e.subtitle} · {fmtDayMonth(e.createdAt)} {fmtTime(e.createdAt)}
        </GText>
      </View>
      <GText v="numS" color={k.color}>
        {k.sign}
        {fmtVnd(e.amountVnd)}
      </GText>
    </Row>
  );
}

function TopupChip({ amount, fee, selected, onPress }: { amount: number; fee: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: 2,
        padding: 12,
        borderRadius: 16,
        borderWidth: selected ? 2.5 : 2,
        borderColor: C.ink900,
        backgroundColor: selected ? C.coin300 : C.surface,
        boxShadow: `0px ${pressed ? 0 : 2}px 0px ${C.ink900}`,
        transform: pressed ? [{ translateY: 2 }] : [],
      })}>
      <GText v="numM">{fmtVnd(amount)}</GText>
      <GText v="bodyS" color={C.ink500}>
        = {fmtInt(Math.floor(amount / fee))} voucher
      </GText>
    </Pressable>
  );
}

export default function StoreFeeScreen() {
  const [w, setW] = useState<StoreFeeWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(newRequestId());

  const load = useCallback(async () => {
    try {
      setW(await api.get<StoreFeeWallet>('/store/fee'));
    } catch (e) {
      toast.error('Không tải được ví phí', { description: (e as Error).message });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fee = w?.feePerVoucherVnd ?? 3000;
  const presets = w?.presetsVnd ?? [30_000, 60_000, 150_000, 300_000];
  const selected = amount ?? presets[1] ?? 60_000;
  /** Mức nạp đủ để bán hết kho, làm tròn lên bội số 1.000đ và tối thiểu 10.000đ. */
  const fillUp = useMemo(() => (w && w.shortfallVnd > 0 ? Math.max(10_000, Math.ceil(w.shortfallVnd / 1000) * 1000) : 0), [w]);

  const openConfirm = () => {
    requestId.current = newRequestId();
    setConfirmOpen(true);
  };

  const topup = async () => {
    setBusy(true);
    try {
      const next = await api.post<StoreFeeWallet>('/store/fee/topup', { amountVnd: selected, requestId: requestId.current });
      setW(next);
      setConfirmOpen(false);
      toast.success(`Đã nạp ${fmtVnd(selected)} vào ví phí`, {
        description: next.shortfallVnd > 0 ? `Bán được ${next.sellableCount} voucher nữa.` : 'Ví đủ phí để bán hết voucher còn lại.',
      });
    } catch (e) {
      toast.error('Nạp tiền không thành công', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (!w) {
    return (
      <Screen>
        <TopBar title="Ví phí" />
        <EmptyState icon={Wallet} title="Không tải được ví phí" text="Kéo xuống để thử lại." />
      </Screen>
    );
  }

  const heldPct = w.balanceVnd > 0 ? Math.min(1, w.heldVnd / w.balanceVnd) : 0;

  return (
    <Screen>
      <TopBar
        title="Ví phí"
        action={Info}
        onAction={() => toast.info(`Mỗi voucher bán ra tạm giữ ${fmtVnd(fee)}. Quét QR mới trừ thật; hết hạn chưa dùng thì trả lại.`)}
      />
      <Body padTop={4} padBottom={40} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green700} />}>
        {/* Số dư */}
        <Card fill={C.coin300} gap={12} pad={16}>
          <Row gap={12}>
            <IconTile icon={Wallet} size={48} iconSize={26} fill={C.surface} radius={14} sw={2} />
            <View style={{ flex: 1 }}>
              <GText v="caps" color={C.ink700}>
                Khả dụng
              </GText>
              <GText v="numL">{fmtVnd(w.availableVnd)}</GText>
            </View>
            <Pill tone={w.sellableCount > 0 ? 'green' : 'red'} label={w.sellableCount > 0 ? `Bán thêm ${w.sellableCount}` : 'Hết khả dụng'} />
          </Row>
          <View style={{ height: 16, borderRadius: 999, borderWidth: 2, borderColor: C.ink900, backgroundColor: C.surface, overflow: 'hidden', flexDirection: 'row' }}>
            {w.balanceVnd > 0 ? (
              <>
                <View style={{ flex: 1 - heldPct, backgroundColor: C.green500 }} />
                <View style={{ flex: heldPct, backgroundColor: C.orange500 }} />
              </>
            ) : null}
          </View>
          <Row gap={14}>
            {[
              [C.green500, `Khả dụng ${fmtVnd(w.availableVnd)}`],
              [C.orange500, `Tạm giữ ${fmtVnd(w.heldVnd)}`],
            ].map(([c, t]) => (
              <Row key={t} gap={6}>
                <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: c, borderWidth: 1.5, borderColor: C.ink900 }} />
                <GText v="bodyS" color={C.ink700}>
                  {t}
                </GText>
              </Row>
            ))}
          </Row>
          <Row gap={10} center={false}>
            {[
              ['Đang tạm giữ', fmtVnd(w.heldVnd), `${w.heldCount} voucher chưa quét`],
              ['Đã trả phí', fmtVnd(w.totalPaidVnd), `${fmtVnd(fee)} mỗi lượt quét`],
            ].map(([l, v, n]) => (
              <Card key={l} pad={[10, 12]} gap={2} radius={14} sw={2} depth="none" style={{ flex: 1 }}>
                <GText v="caps" color={C.ink500}>
                  {l}
                </GText>
                <GText v="numM">{v}</GText>
                <GText v="bodyS" color={C.ink500}>
                  {n}
                </GText>
              </Card>
            ))}
          </Row>
        </Card>

        {/* Cảnh báo thiếu tiền */}
        {w.shortfallVnd > 0 ? (
          <Card row fill={C.orange300} pad={14}>
            <IconTile icon={Info} size={44} iconSize={22} fill={C.surface} radius={14} sw={2} />
            <View style={{ flex: 1, gap: 2 }}>
              <GText v="titleS">Còn {w.unsoldCount - w.sellableCount} voucher chưa bán được</GText>
              <GText v="bodyS" color={C.ink700}>
                Ví đủ cho {w.sellableCount} / {w.unsoldCount} voucher còn lại. Nạp thêm {fmtVnd(w.shortfallVnd)} để bán hết.
              </GText>
            </View>
          </Card>
        ) : null}

        {/* Nạp tiền */}
        <SectionHeader title="Nạp tiền vào ví" link={`${fmtVnd(fee)} / voucher`} />
        <Card gap={12} pad={16}>
          {[0, 2].map((i) => (
            <Row key={i} gap={10}>
              {presets.slice(i, i + 2).map((p) => (
                <TopupChip key={p} amount={p} fee={fee} selected={selected === p} onPress={() => setAmount(p)} />
              ))}
            </Row>
          ))}
          {fillUp > 0 ? (
            <Pressable
              onPress={() => setAmount(fillUp)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: selected === fillUp ? 2.5 : 2,
                borderColor: C.ink900,
                backgroundColor: selected === fillUp ? C.coin300 : C.sky300,
              }}>
              <Plus size={16} color={C.ink900} strokeWidth={2.5} />
              <GText v="bodyMStrong">
                Nạp đủ {fmtVnd(fillUp)} để bán hết {w.unsoldCount} voucher
              </GText>
            </Pressable>
          ) : null}
          <GButton label={`Nạp ${fmtVnd(selected)}`} icon={Wallet} onPress={openConfirm} block />
          <GText v="bodyS" color={C.ink500} align="center">
            Thanh toán giả lập · không trừ tiền thật trong bản demo
          </GText>
        </Card>

        {/* Cách tính phí */}
        <SectionHeader title="Phí được tính thế nào" />
        <Card gap={14} pad={16}>
          {(
            [
              [Lock, C.coin300, `Khách mua → tạm giữ ${fmtVnd(fee)}`, 'Voucher bán ra luôn có sẵn phí đứng sau'],
              [ScanLine, C.green300, `Quét QR → trừ ${fmtVnd(fee)}`, 'Chỉ trả khi khách thật đến quán'],
              [RotateCcw, C.sky300, 'Hết hạn chưa dùng → trả lại', 'Không mất tiền cho voucher bị bỏ quên'],
            ] as const
          ).map(([I, tile, t, d]) => (
            <Row key={t} gap={12}>
              <IconTile icon={I} size={44} iconSize={22} fill={tile} radius={14} sw={2} />
              <View style={{ flex: 1 }}>
                <GText v="titleS">{t}</GText>
                <GText v="bodyS" color={C.ink700}>
                  {d}
                </GText>
              </View>
            </Row>
          ))}
        </Card>

        {/* Lịch sử */}
        <SectionHeader title="Lịch sử ví" />
        {w.entries.length > 0 ? (
          <Card pad={[4, 14]} gap={0}>
            {w.entries.map((e, i) => (
              <EntryRow key={e.id} e={e} last={i === w.entries.length - 1} />
            ))}
          </Card>
        ) : (
          <Card row>
            <IconTile icon={Wallet} fill={C.sunken} />
            <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
              Chưa có giao dịch. Nạp tiền để bắt đầu bán voucher.
            </GText>
          </Card>
        )}
      </Body>

      <GameDialog
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        icon={Wallet}
        iconFill={C.coin500}
        iconColor={C.ink900}
        title={`Nạp ${fmtVnd(selected)}?`}
        text={`Đủ phí cho ${fmtInt(Math.floor(selected / fee))} voucher bán ra. Thanh toán giả lập, không trừ tiền thật.`}
        actions={
          <>
            <GButton label="Huỷ" type="secondary" onPress={() => setConfirmOpen(false)} disabled={busy} block />
            <GButton label="Xác nhận nạp" icon={Wallet} onPress={() => void topup()} loading={busy} block />
          </>
        }
      />
    </Screen>
  );
}
