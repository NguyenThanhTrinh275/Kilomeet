import { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner-native';
import { colors } from '../../../src/theme/colors';
import { api } from '../../../src/api/client';
import { RANKS } from '../../../src/api/types';
import type { Rank, VoucherTemplate } from '../../../src/api/types';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const RANK_LABELS: Record<string, string> = {
  đồng: 'Đồng', bạc: 'Bạc', vàng: 'Vàng',
  bạch_kim: 'Bạch kim', kim_cương: 'Kim cương', cao_thủ: 'Cao thủ',
};

const QUEST_OPTIONS = [
  { label: 'Không có', value: '' },
  { label: 'Chạy ngang qua quán', value: 'Chạy ngang qua quán' },
];

const positiveInt = (label: string) =>
  z.string().trim().min(1, `Nhập ${label}`).refine((v) => /^\d+$/.test(v) && Number(v) > 0, `${label} phải > 0`);

const createVoucherSchema = z.object({
  title: z.string().trim().min(2, 'Nhập tiêu đề voucher'),
  description: z.string().optional(),
  priceTokens: positiveInt('giá token'),
  discountPercent: z
    .string()
    .trim()
    .min(1, 'Nhập % giảm giá')
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100, 'Giảm giá từ 1-100%'),
  questDiscount: z.string().optional(),
  quantity: positiveInt('số lượng'),
  expiryDate: z.string().optional(),
  area: z.string().optional(),
});

type CreateVoucherForm = z.infer<typeof createVoucherSchema>;

export default function CreateVoucherScreen() {
  const router = useRouter();
  const [questType, setQuestType] = useState('');
  const [minRank, setMinRank] = useState<Rank>('đồng');
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, watch } = useForm<CreateVoucherForm>({
    resolver: zodResolver(createVoucherSchema),
    defaultValues: {
      title: '',
      description: '',
      priceTokens: '',
      discountPercent: '',
      questDiscount: '',
      quantity: '',
      expiryDate: '',
      area: '',
    },
  });

  const [title, priceTokens, discountPercent] = watch(['title', 'priceTokens', 'discountPercent']);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await api.post<VoucherTemplate>('/store/vouchers', {
        title: values.title,
        description: values.description ?? '',
        priceTokens: Number(values.priceTokens),
        discountPercent: Number(values.discountPercent),
        questType: questType || undefined,
        questDiscountPercent: questType && values.questDiscount ? Number(values.questDiscount) : 0,
        quantity: Number(values.quantity),
        minRank,
        expiryDate: values.expiryDate ?? '',
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
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">Tạo voucher mới</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          <FormInput
            control={control}
            name="title"
            label="Tiêu đề *"
            placeholder="VD: Giảm 20% cà phê"
          />

          <FormInput
            control={control}
            name="description"
            label="Mô tả"
            placeholder="Mô tả chi tiết voucher"
            multiline
          />

          <View className="flex-row gap-3">
            <FormInput
              control={control}
              name="priceTokens"
              label="Giá (token) *"
              placeholder="50"
              keyboardType="number-pad"
              containerClassName="flex-1"
            />
            <FormInput
              control={control}
              name="discountPercent"
              label="Giảm giá (%) *"
              placeholder="20"
              keyboardType="number-pad"
              containerClassName="flex-1"
            />
          </View>

          {/* Quest type */}
          <View className="gap-2">
            <Label>Loại quest</Label>
            <View className="flex-row gap-2">
              {QUEST_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={questType === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setQuestType(opt.value)}>
                  <Text>{opt.label}</Text>
                </Button>
              ))}
            </View>
          </View>

          {questType !== '' && (
            <FormInput
              control={control}
              name="questDiscount"
              label="Giảm giá quest (% trên giá token)"
              placeholder="50"
              keyboardType="number-pad"
            />
          )}

          <View className="flex-row gap-3">
            <FormInput
              control={control}
              name="quantity"
              label="Số lượng *"
              placeholder="100"
              keyboardType="number-pad"
              containerClassName="flex-1"
            />
            <FormInput
              control={control}
              name="expiryDate"
              label="Hạn sử dụng"
              placeholder="31/12/2026"
              containerClassName="flex-1"
            />
          </View>

          {/* Min rank selector */}
          <View className="gap-2">
            <Label>Hạng tối thiểu</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {RANKS.map((rank) => {
                  const isSelected = minRank === rank;
                  const rankColor = colors.rank[rank];
                  return (
                    <TouchableOpacity
                      key={rank}
                      className="px-3 py-2 rounded-xl"
                      style={{
                        backgroundColor: isSelected ? rankColor + '20' : colors.bgSecondary,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: rankColor,
                      }}
                      onPress={() => setMinRank(rank)}>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: isSelected ? rankColor : colors.textSecondary }}>
                        {RANK_LABELS[rank]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <FormInput
            control={control}
            name="area"
            label="Khu vực"
            placeholder="VD: Quận 1, TP.HCM"
          />

          {/* Preview Card */}
          <View className="gap-2 mt-1">
            <Label>Xem trước</Label>
            <Card className="p-0 overflow-hidden gap-0">
              <View className="h-1 bg-km-accent" />
              <View className="p-4 gap-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-muted-foreground text-xs mb-1">Cà phê Sài Gòn</Text>
                    <Text className="text-white text-base font-semibold">{title || 'Tiêu đề voucher'}</Text>
                  </View>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: colors.rank[minRank] + '20',
                      borderColor: colors.rank[minRank] + '50',
                    }}>
                    <Text style={{ color: colors.rank[minRank] }}>{RANK_LABELS[minRank]}+</Text>
                  </Badge>
                </View>

                {questType !== '' && (
                  <View className="flex-row items-center bg-km-surface/50 rounded-lg p-2">
                    <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                    <Text className="text-muted-foreground text-xs ml-2 flex-1">{questType}</Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <Ionicons name="pricetag" size={16} color={colors.accent} />
                  <Text className="text-white text-lg font-bold ml-2">{priceTokens || '0'}</Text>
                  <Text className="text-muted-foreground text-xs ml-1">token</Text>
                  {discountPercent ? (
                    <Text className="text-km-primary text-sm font-bold ml-3">-{discountPercent}%</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </View>

          <Button size="lg" className="mb-8" onPress={() => void onSubmit()} disabled={submitting}>
            <Text>{submitting ? 'Đang tạo...' : 'Tạo voucher'}</Text>
          </Button>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
