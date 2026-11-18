import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GameMap } from '../../src/components/game/GameMap';
import { toast } from 'sonner-native';
import { Calendar, Check, Crosshair, Mail, Search, Store as StoreIcon, X } from 'lucide-react-native';
import { api } from '../../src/api/client';
import type { PendingStore } from '../../src/api/types';
import { C } from '../../src/theme/game';
import { fmtDate } from '../../src/lib/format';
import { Body, Card, EmptyState, GameDialog, GButton, GText, IconTile, Loading, MapPin, Pill, type PillTone, Row, Screen, Segmented, TopBar } from '../../src/components/game';

type StoreTab = 'pending' | 'approved' | 'rejected';
type StoreItem = PendingStore & { status: StoreTab };

const STATUS: Record<StoreTab, [string, PillTone]> = {
  pending: ['Chờ duyệt', 'coin'],
  approved: ['Đã duyệt', 'green'],
  rejected: ['Từ chối', 'red'],
};

export default function StoresScreen() {
  const [tab, setTab] = useState<StoreTab>('pending');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ store: StoreItem; action: 'approve' | 'reject' } | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      setStores(await api.get<StoreItem[]>('/admin/stores'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  async function confirmAction() {
    if (!dialog) return;
    setBusy(true);
    try {
      await api.post(`/admin/stores/${dialog.store.id}`, { action: dialog.action });
      toast.success(dialog.action === 'approve' ? `Đã duyệt ${dialog.store.storeName}` : `Đã từ chối ${dialog.store.storeName}`);
      setDialog(null);
      await fetchStores();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  }

  if (loading && stores.length === 0) return <Loading />;
  const count = (t: StoreTab) => stores.filter((s) => s.status === t).length;
  const shown = stores.filter((s) => s.status === tab);

  return (
    <Screen>
      <TopBar title="Duyệt cửa hàng" action={Search} />
      <Body refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void fetchStores()} tintColor={C.green700} />}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `Chờ · ${count('pending')}` },
            { value: 'approved', label: `Đã duyệt · ${count('approved')}` },
            { value: 'rejected', label: `Từ chối · ${count('rejected')}` },
          ]}
        />
        {shown.length === 0 ? (
          <EmptyState icon={StoreIcon} title="Không có cửa hàng nào" text={tab === 'pending' ? 'Tất cả đơn đăng ký đã được xử lý.' : undefined} tone={C.orange300} />
        ) : (
          shown.map((s) => {
            const [label, tone] = STATUS[s.status];
            return (
              <Card key={s.id} gap={12} pad={14}>
                <Row gap={12}>
                  <IconTile icon={StoreIcon} size={48} iconSize={26} fill={C.orange500} radius={14} sw={2.5} depth="small" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <GText v="titleS">{s.storeName}</GText>
                    <GText v="bodyS" color={C.ink500}>
                      {s.storeAddress}
                    </GText>
                  </View>
                  <Pill tone={tone} label={label} />
                </Row>
                <View style={{ height: 130, borderRadius: 14, borderWidth: 2, borderColor: C.ink900, overflow: 'hidden' }}>
                  <GameMap
                    style={{ flex: 1 }}
                    initialRegion={{ latitude: s.latitude, longitude: s.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}>
                    <Marker coordinate={{ latitude: s.latitude, longitude: s.longitude }} anchor={{ x: 0.5, y: 1 }}>
                      <MapPin kind="store" />
                    </Marker>
                  </GameMap>
                </View>
                <Row gap={12} style={{ flexWrap: 'wrap' }}>
                  {[
                    [Crosshair, `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`],
                    [Calendar, `Gửi ${fmtDate(s.appliedAt)}`],
                    [Mail, s.email],
                  ].map(([I, t]) => {
                    const Icon = I as typeof Mail;
                    return (
                      <Row key={t as string} gap={4}>
                        <Icon size={14} color={C.ink500} strokeWidth={2.5} />
                        <GText v="bodyS" color={C.ink700}>
                          {t as string}
                        </GText>
                      </Row>
                    );
                  })}
                </Row>
                {s.status === 'pending' ? (
                  <Row gap={10}>
                    <GButton label="Từ chối" type="secondary" size="M" icon={X} onPress={() => setDialog({ store: s, action: 'reject' })} flex />
                    <GButton label="Duyệt" size="M" icon={Check} onPress={() => setDialog({ store: s, action: 'approve' })} flex />
                  </Row>
                ) : null}
              </Card>
            );
          })
        )}
      </Body>
      <GameDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        icon={dialog?.action === 'approve' ? Check : X}
        iconFill={dialog?.action === 'approve' ? C.green500 : C.red500}
        iconColor={dialog?.action === 'approve' ? C.ink900 : C.white}
        title={dialog?.action === 'approve' ? 'Duyệt cửa hàng?' : 'Từ chối cửa hàng?'}
        text={`${dialog?.store.storeName ?? ''} — ${dialog?.action === 'approve' ? 'cửa hàng sẽ có thể tạo voucher trên hệ thống.' : 'cửa hàng sẽ bị từ chối đăng ký.'}`}
        actions={
          <>
            <GButton
              label={dialog?.action === 'approve' ? 'Duyệt' : 'Từ chối'}
              type={dialog?.action === 'approve' ? 'primary' : 'danger'}
              icon={dialog?.action === 'approve' ? Check : X}
              loading={busy}
              onPress={() => void confirmAction()}
              block
            />
            <GButton label="Huỷ" type="secondary" onPress={() => setDialog(null)} block />
          </>
        }
      />
    </Screen>
  );
}
