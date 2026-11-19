import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { toast } from 'sonner-native';
import { AlertCircle, Check, ChevronRight, Gift, Info, Link2, Mail, MapPin, Route, ShoppingBag, Sparkles, Store } from 'lucide-react-native';
import { useVoucherStore } from '../../../src/stores/voucher';
import { useRunnerStore } from '../../../src/stores/runner';
import { useAuthStore } from '../../../src/stores/auth';
import { RANK_INDEX, type OwnedVoucher, type StoreProfile, type VoucherTemplate } from '../../../src/api/types';
import { C, DEPTH, RANK_LABEL } from '../../../src/theme/game';
import { avatarColor, discountLabel, fmtDate, fmtDayMonth, fmtInt, initials } from '../../../src/lib/format';
import { isOpenNow, loadStoreProfile } from '../../../src/lib/storeProfile';
import {
  Avatar,
  Banner,
  Body,
  Card,
  Coin,
  Confetti,
  EmptyState,
  GameSheet,
  GButton,
  GInput,
  GText,
  IconTile,
  InfoRow,
  Pill,
  RadioDot,
  RankChip,
  Row,
  Screen,
  SectionHeader,
  StickyBar,
  StoreIntroCard,
  TopBar,
  VoucherTicket,
  XPBar,
} from '../../../src/components/game';

const QUICK_FRIENDS = [
  { name: 'Nguyễn Lan', email: 'lan@demo.com' },
  { name: 'Minh Trần', email: 'minh@demo.com' },
];

function QrCard({ voucher, storeName }: { voucher: OwnedVoucher; storeName: string }) {
  const used = voucher.status === 'used';
  return (
    <Card pad={20} gap={12} center radius={24}>
      <Row between style={{ alignSelf: 'stretch' }}>
        <GText v="caps" color={C.ink500}>
          Mã QR sử dụng
        </GText>
        <Pill tone={used ? 'ink' : 'green'} label={used ? 'Đã sử dụng' : 'Có thể dùng'} />
      </Row>
      <View style={{ padding: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink900, opacity: used ? 0.35 : 1 }}>
        <QRCode value={voucher.qrCode} size={200} color={C.ink900} backgroundColor={C.white} />
      </View>
      <GText v="numM" align="center">
        {voucher.qrCode.length > 16 ? `${voucher.qrCode.slice(0, 8)}…${voucher.qrCode.slice(-4)}`.toUpperCase() : voucher.qrCode.toUpperCase()}
      </GText>
      <GText v="bodyM" color={C.ink500} align="center">
        Đưa mã này cho nhân viên {storeName} quét tại quầy.
      </GText>
    </Card>
  );
}

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [giftError, setGiftError] = useState<string | null>(null); // khai báo TRƯỚC mọi return sớm (luật hooks)
  const templates = useVoucherStore((s) => s.templates);
  const myVouchers = useVoucherStore((s) => s.myVouchers);
  const buyVoucher = useVoucherStore((s) => s.buyVoucher);
  const giftVoucher = useVoucherStore((s) => s.giftVoucher);
  const fetchMyVouchers = useVoucherStore((s) => s.fetchMyVouchers);
  const fetchTemplates = useVoucherStore((s) => s.fetchTemplates);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const tokenBalance = useRunnerStore((s) => s.tokenBalance);
  const rank = useRunnerStore((s) => s.rank);
  const runs = useRunnerStore((s) => s.runs);

  const [giftOpen, setGiftOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [gifting, setGifting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [unlocked, setUnlocked] = useState<OwnedVoucher | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);

  const ownedVoucher = myVouchers.find((v) => v.id === id);
  const template: VoucherTemplate | undefined = templates.find((t) => t.id === id) ?? ownedVoucher?.template;

  useEffect(() => {
    if (!template) return;
    loadStoreProfile(template.storeId, templates).then(setProfile).catch(() => setProfile(null));
  }, [template?.storeId]);

  const passedStoreIds = useMemo(() => runs.flatMap((r) => r.passedStoreIds || []), [runs]);

  if (!template) {
    return (
      <Screen>
        <TopBar title="Chi tiết voucher" />
        <EmptyState icon={AlertCircle} title="Không tìm thấy voucher" text="Voucher có thể đã hết hạn hoặc bị gỡ." />
        <View style={{ paddingHorizontal: 24 }}>
          <GButton label="Quay lại" type="secondary" onPress={() => router.back()} block />
        </View>
      </Screen>
    );
  }

  // BE tự xét quyền giảm giá (7 ngày, mỗi mẫu 1 lần) và trả myQuestEligible/myPrice; mock thì đoán theo lịch sử chạy.
  const questCompleted = ownedVoucher ? ownedVoucher.questCompletedAt != null : (template.myQuestEligible ?? passedStoreIds.includes(template.storeId));
  const hasQuest = template.questDiscountPercent > 0 && !!template.questDescription;
  const discountedPrice = hasQuest ? Math.round(template.priceTokens * (1 - template.questDiscountPercent / 100)) : null;
  const price = ownedVoucher
    ? ownedVoucher.paidTokens
    : (template.myPrice ?? (questCompleted && discountedPrice != null ? discountedPrice : template.priceTokens));
  const showDeal = questCompleted && discountedPrice != null && price < template.priceTokens;
  const canGift = !!ownedVoucher && ownedVoucher.status === 'owned' && !ownedVoucher.giftedFrom;
  const open = profile ? isOpenNow(profile) : { open: true };

  const handleBuy = async () => {
    if (RANK_INDEX[rank] < RANK_INDEX[template.minRank]) {
      toast.warning('Chưa đủ hạng', { description: `Cần đạt từ hạng ${RANK_LABEL[template.minRank]} trở lên để mua voucher này.` });
      return;
    }
    if (tokenBalance < price) {
      toast.warning('Không đủ token', { description: `Bạn cần ${price} token nhưng hiện có ${tokenBalance} token.` });
      return;
    }
    setBuying(true);
    try {
      const bought = await buyVoucher(template.id, questCompleted);
      await Promise.all([fetchMyVouchers(), refreshMe().catch(() => undefined), fetchTemplates().catch(() => undefined)]);
      setUnlocked(bought);
    } catch (e) {
      toast.error('Lỗi mua voucher', { description: e instanceof Error ? e.message : 'Không thể mua voucher' });
    } finally {
      setBuying(false);
    }
  };

  const confirmGift = async () => {
    const target = ownedVoucher ?? unlocked;
    if (!target) return;
    const trimmed = recipient.trim();
    if (!trimmed) {
      setGiftError('Vui lòng nhập email người nhận.');
      return;
    }
    setGiftError(null);
    setGifting(true);
    try {
      await giftVoucher(target.id, trimmed);
      await fetchMyVouchers();
      setGiftOpen(false);
      setUnlocked(null);
      toast.success('Đã tặng thành công', {
        description: `Voucher đã được chuyển cho ${trimmed}. Giao dịch đang ghi lên Avalanche.`,
        action: { label: 'Xem giao dịch', onClick: () => router.push('/(runner)/wallet') },
      });
      router.back();
    } catch (e) {
      // Toast nằm dưới Modal (sheet tặng) nên không thấy → báo lỗi ngay trong sheet.
      setGiftError(e instanceof Error ? e.message : 'Không thể tặng voucher');
    } finally {
      setGifting(false);
    }
  };

  const left = template.remaining;
  /** Quán hết khả dụng trong ví phí (quyết định #28): còn hàng nhưng tạm ngừng bán. */
  const paused = left > 0 && !!template.pausedForFee;
  /** Sau khi mua, template tải lại và quyền giảm đã dùng → lấy giá thực trả để hiện giá giảm trên vé. */
  const paidDeal = !!unlocked && unlocked.paidTokens < template.priceTokens;
  const ticketProps = {
    discount: discountLabel(template.discountPercent),
    store: template.storeName,
    title: template.title,
    price: template.priceTokens,
    dealPrice: showDeal ? price : undefined,
    rank: template.minRank,
    questLabel: showDeal ? `Đã chạy ngang quán · -${template.questDiscountPercent}%` : undefined,
  } as const;

  return (
    <Screen>
      <TopBar title="Chi tiết voucher" action={canGift ? Gift : Info} onAction={canGift ? () => setGiftOpen(true) : () => toast.info('Mỗi voucher dùng 1 lần, tặng được 1 lần.')} />
      <Body padBottom={ownedVoucher ? 40 : 140}>
        {/* Hero */}
        <Card pad={0} gap={0} radius={24} style={{ overflow: 'hidden' }}>
          <LinearGradient colors={showDeal ? [C.grape500, C.grape700] : [C.orange500, C.orange700]} style={{ height: 150, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 }}>
            <IconTile icon={Store} size={72} iconSize={38} fill={C.surface} radius={20} sw={3} depth="small" />
            <View>
              <GText v="numXL" color={C.white} style={{ fontSize: 64, lineHeight: 68 }}>
                {discountLabel(template.discountPercent)}
              </GText>
              <GText v="caps" color={C.white}>
                Giảm giá tại quầy
              </GText>
            </View>
          </LinearGradient>
          <View style={{ padding: 18, gap: 6, borderTopWidth: 2.5, borderColor: C.ink900 }}>
            <Row gap={6}>
              <MapPin size={14} color={C.ink500} strokeWidth={2.5} />
              <GText v="caps" color={C.ink500} numberOfLines={1} style={{ flex: 1 }}>
                {template.storeName}
                {profile?.address ? ` · ${profile.address}` : ''}
              </GText>
            </Row>
            <GText v="titleL">{template.title}</GText>
            {template.description ? (
              <GText v="bodyM" color={C.ink700}>
                {template.description}
              </GText>
            ) : null}
          </View>
        </Card>

        {/* Về quán */}
        <SectionHeader title="Về quán" />
        <StoreIntroCard
          name={template.storeName}
          meta={[open.until ? `đến ${open.until}` : null, profile?.address?.split(',').pop()?.trim()].filter(Boolean).join(' · ') || 'Đối tác KILOMeet'}
          intro={profile ? `${profile.tagline}. ${profile.description.split('\n')[0]}` : 'Đang tải giới thiệu quán…'}
          tags={profile?.tags.slice(0, 4) ?? []}
          open={open.open}
          onPress={() => router.push(`/(runner)/store/${template.storeId}`)}
        />

        {/* Nhiệm vụ giảm giá */}
        {hasQuest ? (
          <Card fill={C.grape300} gap={10}>
            <Row between>
              <GText v="caps" color={C.grape700}>
                Nhiệm vụ giảm giá
              </GText>
              <Pill tone="grape" label={`-${template.questDiscountPercent}% giá token`} />
            </Row>
            <Row gap={12}>
              <IconTile icon={Route} size={48} iconSize={26} fill={C.grape500} color={C.white} radius={14} sw={2.5} depth="small" />
              <View style={{ flex: 1 }}>
                <GText v="titleS">{template.questDescription}</GText>
                <GText v="bodyS" color={C.ink700}>
                  Đường chạy đi qua điểm cách quán dưới 50 m
                </GText>
              </View>
            </Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900 }}>
              <View style={{ width: 22, height: 22, borderRadius: 22, backgroundColor: questCompleted ? C.green500 : C.sunken, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
                {questCompleted ? <Check size={14} color={C.ink900} strokeWidth={3} /> : null}
              </View>
              <GText v="bodyMStrong" style={{ flex: 1 }}>
                {questCompleted
                  ? ownedVoucher?.questCompletedAt
                    ? `Đã hoàn thành ${fmtDayMonth(ownedVoucher.questCompletedAt)} · đã áp dụng ưu đãi`
                    : `Đã hoàn thành · giá còn ${price} token`
                  : 'Chưa hoàn thành — chạy ngang quán để mở giảm giá'}
              </GText>
            </View>
          </Card>
        ) : null}

        {/* Thông tin */}
        <Card pad={[4, 16]} gap={0}>
          <InfoRow label={ownedVoucher ? 'Đã trả' : 'Giá token'}>
            <Row gap={6}>
              <Coin size={20} />
              {showDeal && !ownedVoucher ? (
                <GText v="bodyMStrong" color={C.ink500} strike>
                  {template.priceTokens}
                </GText>
              ) : null}
              <GText v="numM" color={showDeal ? C.grape700 : C.ink900}>
                {price}
              </GText>
            </Row>
          </InfoRow>
          <InfoRow label="Hạng tối thiểu">
            <RankChip rank={template.minRank} />
          </InfoRow>
          <InfoRow label="Số lượng còn">
            <Row gap={8}>
              <XPBar pct={template.totalSupply ? left / template.totalSupply : 0} tone="orange" height={14} style={{ width: 80 }} />
              <GText v="bodyMStrong">
                {paused ? 'Tạm hết' : `${left} / ${template.totalSupply}`}
              </GText>
            </Row>
          </InfoRow>
          <InfoRow label="Hạn sử dụng" last={!ownedVoucher}>
            {fmtDate(template.expiresAt)}
          </InfoRow>
          {ownedVoucher ? (
            <InfoRow label="Nguồn" last>
              {ownedVoucher.giftedFrom ? 'Được tặng' : `Mua ${fmtDayMonth(ownedVoucher.purchasedAt)}`}
            </InfoRow>
          ) : null}
        </Card>

        {ownedVoucher ? (
          <>
            <QrCard voucher={ownedVoucher} storeName={template.storeName} />
            {canGift ? <GButton label="Tặng bạn bè" type="secondary" icon={Gift} onPress={() => setGiftOpen(true)} block /> : null}
          </>
        ) : null}
      </Body>

      {!ownedVoucher ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <StickyBar>
            <View>
              <GText v="bodyS" color={C.ink500}>
                Số dư sau mua
              </GText>
              <Row gap={4}>
                <Coin size={18} />
                <GText v="numM" color={tokenBalance - price < 0 ? C.red700 : C.ink900}>
                  {fmtInt(tokenBalance - price)}
                </GText>
              </Row>
            </View>
            <GButton
              label={left <= 0 ? 'Hết lượt' : paused ? 'Tạm hết' : `Mua · ${price}`}
              type="coin"
              icon={ShoppingBag}
              loading={buying}
              disabled={left <= 0 || paused}
              onPress={() => void handleBuy()}
              flex
            />
          </StickyBar>
        </View>
      ) : null}

      {/* Mở khoá vật phẩm */}
      <Modal visible={!!unlocked} animationType="fade" onRequestClose={() => setUnlocked(null)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <LinearGradient colors={[C.orange300, C.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} />
          <Confetti />
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 16, backgroundColor: C.green500, borderWidth: 3, borderColor: C.ink900 }, DEPTH.button]}>
                <Sparkles size={22} color={C.ink900} strokeWidth={2.5} />
                <GText v="titleL" style={{ fontSize: 22 }}>
                  MỞ KHOÁ VẬT PHẨM!
                </GText>
              </View>
              <GText v="bodyL" color={C.ink700} align="center">
                Bạn đã đổi {unlocked?.paidTokens ?? price} token{paidDeal ? ` (giảm ${template.questDiscountPercent}% nhờ nhiệm vụ)` : ''}.
              </GText>
              <View style={{ alignSelf: 'stretch' }}>
                <VoucherTicket {...ticketProps} dealPrice={paidDeal ? unlocked!.paidTokens : undefined} questLabel={paidDeal ? `Đã chạy ngang quán · -${template.questDiscountPercent}%` : undefined} leftLabel={`HSD ${fmtDayMonth(template.expiresAt)}`} />
              </View>
              {unlocked ? (
                <View style={{ alignSelf: 'stretch' }}>
                  <QrCard voucher={unlocked} storeName={template.storeName} />
                </View>
              ) : null}
              <Card
                row
                pad={[8, 12]}
                fill={C.sky300}
                depth="none"
                sw={2}
                radius={12}
                style={{ alignSelf: 'stretch' }}
                onPress={() => (setUnlocked(null), router.push('/(runner)/wallet'))}>
                <Link2 size={16} color={C.sky700} strokeWidth={2.5} />
                <GText v="bodyS" style={{ flex: 1 }}>
                  Voucher ghi trên Avalanche Fuji · xem giao dịch
                </GText>
                <ChevronRight size={16} color={C.sky700} strokeWidth={2.5} />
              </Card>
              <Row gap={12} style={{ alignSelf: 'stretch' }}>
                <GButton label="Tặng bạn" type="secondary" size="M" icon={Gift} onPress={() => setGiftOpen(true)} flex />
                <GButton
                  label="Xong"
                  size="M"
                  icon={Check}
                  onPress={() => {
                    const v = unlocked;
                    setUnlocked(null);
                    if (v) router.replace(`/(runner)/voucher/${v.id}?owned=1`);
                  }}
                  flex
                />
              </Row>
            </ScrollView>
          </SafeAreaView>
          <GiftSheet open={giftOpen && !!unlocked} onClose={() => (setGiftOpen(false), setGiftError(null))} template={template} recipient={recipient} setRecipient={(v: string) => (setRecipient(v), setGiftError(null))} onConfirm={() => void confirmGift()} busy={gifting} error={giftError} />
        </View>
      </Modal>

      <GiftSheet open={giftOpen && !unlocked} onClose={() => (setGiftOpen(false), setGiftError(null))} template={template} recipient={recipient} setRecipient={(v: string) => (setRecipient(v), setGiftError(null))} onConfirm={() => void confirmGift()} busy={gifting} error={giftError} />
    </Screen>
  );
}

function GiftSheet({
  open,
  onClose,
  template,
  recipient,
  setRecipient,
  onConfirm,
  error,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  template: VoucherTemplate;
  recipient: string;
  setRecipient: (s: string) => void;
  onConfirm: () => void;
  error?: string | null;
  busy: boolean;
}) {
  const me = useAuthStore((s) => s.user);
  return (
    <GameSheet open={open} onClose={onClose}>
      <Row gap={12}>
        <IconTile icon={Gift} size={52} iconSize={28} fill={C.sky500} radius={16} sw={2.5} depth="small" />
        <View style={{ flex: 1 }}>
          <GText v="titleL">Tặng voucher</GText>
          <GText v="bodyS" color={C.ink500}>
            Chỉ tặng được 1 lần · giữ nguyên hạn dùng
          </GText>
        </View>
      </Row>
      <Card row pad={12} depth="small" radius={16}>
        <IconTile icon={Store} size={40} iconSize={20} fill={C.orange500} radius={12} />
        <View style={{ flex: 1 }}>
          <GText v="caps" color={C.ink500}>
            {template.storeName}
          </GText>
          <GText v="bodyMStrong">{template.title}</GText>
        </View>
      </Card>
      <GText v="caps" color={C.ink500}>
        Chọn nhanh đồng đội
      </GText>
      {QUICK_FRIENDS.filter((f) => f.email !== me?.email).map((f) => {
        const on = recipient.trim().toLowerCase() === f.email;
        return (
          <Card key={f.email} row pad={12} depth="small" radius={16} fill={on ? C.sky300 : C.surface} onPress={() => setRecipient(f.email)}>
            <Avatar initials={initials(f.name)} fill={avatarColor(f.name)} size={40} />
            <View style={{ flex: 1 }}>
              <GText v="titleS">{f.name}</GText>
              <GText v="bodyS" color={C.ink500}>
                {f.email}
              </GText>
            </View>
            <RadioDot on={on} size={24} />
          </Card>
        );
      })}
      <GInput label="Hoặc nhập email người nhận" icon={Mail} placeholder="VD: lan@demo.com" value={recipient} onChangeText={setRecipient} autoCapitalize="none" keyboardType="email-address" />
      <Banner icon={Info} tone="coin" iconColor={C.ink900} text="Điều kiện hạng và khu vực chỉ xét lúc mua — người nhận dùng được ngay." />
      {error ? <Banner icon={Info} tone="red" iconColor={C.red700} title="Không tặng được" text={error} /> : null}
      <Row gap={12}>
        <GButton label="Huỷ" type="secondary" onPress={onClose} flex disabled={busy} />
        <GButton label="Tặng" type="accent" icon={Gift} loading={busy} onPress={onConfirm} flex />
      </Row>
    </GameSheet>
  );
}
