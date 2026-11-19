import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner-native';
import { Calendar, Info, MapPin, Percent, Route, ShoppingBag, Sparkles, Wallet, X } from 'lucide-react-native';
import { api } from '../../../src/api/client';
import { useAuthStore } from '../../../src/stores/auth';
import { RANKS, type Rank, type Store, type StoreFeeWallet, type VoucherTemplate } from '../../../src/api/types';
import { C, DEPTH, RANK_COLOR } from '../../../src/theme/game';
import { discountLabel, fmtVnd } from '../../../src/lib/format';
import { Banner, Body, Card, GButton, GFormInput, GText, RankEmblem, Row, Screen, Segmented, TopBar, VoucherTicket } from '../../../src/components/game';

const QUEST = 'Chạy ngang qua quán';
const QUEST_STEPS = [20, 30, 40, 50];

const positiveInt = (label: string) =>
  z.string().trim().min(1, `Nhập ${label}`).refine((v) => /^\d+$/.test(v) && Number(v) > 0, `${label[0]!.toUpperCase()}${label.slice(1)} phải là số nguyên dương`);

const schema = z.object({
  title: z.string().trim().min(2, 'Nhập tiêu đề voucher'),
  description: z.string().optional(),
  priceTokens: positiveInt('giá token'),
  discountPercent: z
    .string()
    .trim()
    .min(1, 'Nhập % giảm giá')
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100, 'Giảm giá từ 1-100%'),
  quantity: positiveInt('số lượng'),
  expiryDate: z.string().optional(),
  area: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function CreateVoucherScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as Store | null;
  const [quest, setQuest] = useState<'none' | 'pass'>('pass');
  const [questDiscount, setQuestDiscount] = useState(50);
  const [minRank, setMinRank] = useState<Rank>('đồng');
  const [submitting, setSubmitting] = useState(false);
  const [fee, setFee] = useState<StoreFeeWallet | null>(null);
  useEffect(() => {
    api.get<StoreFeeWallet>('/store/fee').then(setFee).catch(() => undefined);
  }, []);

  const { control, handleSubmit, watch } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', priceTokens: '', discountPercent: '', quantity: '', expiryDate: '', area: '' },
  });
  const [title, price, discount, quantity] = watch(['title', 'priceTokens', 'discountPercent', 'quantity']);
  const priceN = Number(price) || 0;
  const dealPrice = Math.round(priceN * (1 - questDiscount / 100));

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    try {
      await api.post<VoucherTemplate>('/store/vouchers', {
        title: v.title,
        description: v.description ?? '',
        priceTokens: Number(v.priceTokens),
        discountPercent: Number(v.discountPercent),
        questType: quest === 'pass' ? QUEST : undefined,
        questDiscountPercent: quest === 'pass' ? questDiscount : 0,
        quantity: Number(v.quantity),
        minRank,
        expiryDate: v.expiryDate ?? '',
      });
      toast.success('Đã tạo voucher thành công');
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể tạo voucher');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen>
      <TopBar title="Tạo voucher mới" action={Info} onAction={() => toast.info(`Mỗi voucher bán ra tạm giữ ${fmtVnd(fee?.feePerVoucherVnd ?? 3000)} trong ví phí; chỉ trừ khi khách dùng, hết hạn chưa dùng thì trả lại.`)} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Body gap={14}>
          <GFormInput control={control} name="title" label="Tiêu đề *" icon={Sparkles} placeholder="VD: Giảm 20% mọi đồ uống" />
          <GFormInput control={control} name="description" label="Mô tả" icon={Info} placeholder="Áp dụng tất cả đồ uống tại quầy" />
          <Row gap={12} center={false}>
            <View style={{ flex: 1 }}>
              <GFormInput control={control} name="priceTokens" label="Giá (token) *" icon={Wallet} placeholder="500" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <GFormInput control={control} name="discountPercent" label="Giảm giá (%) *" icon={Percent} placeholder="20" keyboardType="number-pad" />
            </View>
          </Row>

          <GText v="caps" color={C.ink500}>
            Nhiệm vụ giảm giá
          </GText>
          <Segmented
            value={quest}
            onChange={setQuest}
            radius={16}
            activeFill={C.grape500}
            activeText={C.white}
            options={[
              { value: 'none', label: 'Không có', icon: X },
              { value: 'pass', label: 'Chạy ngang quán', icon: Route },
            ]}
          />
          {quest === 'pass' ? (
            <Card fill={C.grape300} gap={10} pad={14} depth="small">
              <Row between>
                <GText v="bodyMStrong">Giảm trên giá token</GText>
                <GText v="numM" color={C.grape700}>
                  {questDiscount}%
                </GText>
              </Row>
              <Row gap={8} center={false}>
                {QUEST_STEPS.map((p) => {
                  const on = p === questDiscount;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setQuestDiscount(p)}
                      style={[{ flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.ink900, backgroundColor: on ? C.grape500 : C.surface }, on ? DEPTH.small : null]}>
                      <GText v="numS" color={on ? C.white : C.ink900}>
                        -{p}%
                      </GText>
                    </Pressable>
                  );
                })}
              </Row>
              <GText v="bodyS" color={C.ink700}>
                Khách chạy ngang trong 50 m chỉ trả {priceN ? `${dealPrice} token (thay vì ${priceN})` : `${100 - questDiscount}% giá token`}.
              </GText>
            </Card>
          ) : null}

          <Row gap={12} center={false}>
            <View style={{ flex: 1 }}>
              <GFormInput control={control} name="quantity" label="Số lượng *" icon={ShoppingBag} placeholder="100" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <GFormInput control={control} name="expiryDate" label="Hạn sử dụng" icon={Calendar} placeholder="31/12/2026" />
            </View>
          </Row>

          <GText v="caps" color={C.ink500}>
            Hạng tối thiểu
          </GText>
          <Row gap={6} center={false}>
            {RANKS.map((r) => {
              const on = r === minRank;
              return (
                <Pressable
                  key={r}
                  onPress={() => setMinRank(r)}
                  style={[{ flex: 1, alignItems: 'center', padding: 6, borderRadius: 14, borderWidth: on ? 2.5 : 1.5, borderColor: C.ink900, backgroundColor: on ? RANK_COLOR[r] : C.surface }, on ? DEPTH.small : null]}>
                  <RankEmblem rank={r} size={34} />
                </Pressable>
              );
            })}
          </Row>
          <GFormInput control={control} name="area" label="Khu vực" icon={MapPin} placeholder="VD: Quận 10, TP.HCM" />

          <GText v="caps" color={C.ink500}>
            Xem trước trong cửa hàng
          </GText>
          <VoucherTicket
            discount={discount ? discountLabel(Number(discount)) : '-?%'}
            store={user?.storeName ?? 'Cửa hàng của bạn'}
            title={title || 'Tiêu đề voucher'}
            price={priceN || '?'}
            dealPrice={quest === 'pass' && priceN ? dealPrice : undefined}
            rank={minRank}
            leftLabel={`Còn ${quantity || '?'}`}
            questLabel={quest === 'pass' ? `Đã chạy ngang quán · -${questDiscount}%` : undefined}
          />
          {(() => {
            const per = fee?.feePerVoucherVnd ?? 3000;
            const want = (fee?.unsoldCount ?? 0) + (Number(quantity) || 0);
            const short = fee ? Math.max(0, want * per - fee.availableVnd) : 0;
            return (
              <Banner
                icon={Wallet}
                tone={short > 0 ? 'orange' : 'coin'}
                iconColor={C.ink900}
                title={fee ? `Ví phí đủ cho ${fee.sellableCount} voucher bán ra` : undefined}
                text={
                  short > 0
                    ? `Mỗi voucher bán ra tạm giữ ${fmtVnd(per)}. Nạp thêm ${fmtVnd(short)} để bán hết cả voucher mới.`
                    : `Mỗi voucher bán ra tạm giữ ${fmtVnd(per)}; chỉ trừ khi khách dùng tại quầy, hết hạn chưa dùng thì trả lại.`
                }
                right={
                  short > 0 ? (
                    <Pressable onPress={() => router.push('/(store)/fee')}>
                      <GText v="bodyMStrong" color={C.orange700}>
                        Nạp ›
                      </GText>
                    </Pressable>
                  ) : undefined
                }
              />
            );
          })()}
          <GButton label="Tạo voucher" type="accent" icon={Sparkles} loading={submitting} onPress={() => void onSubmit()} block />
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}
