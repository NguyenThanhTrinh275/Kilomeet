import { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { toast } from 'sonner-native';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

type ScanResult = {
  voucherTitle: string;
  feeVnd: number;
};

type ScanState = 'scanning' | 'scanned' | 'confirmed';

export default function ScanScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const processingRef = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const res = await api.post<ScanResult>('/store/scan', { qrCode: data });
      setResult(res);
      setState('scanned');
    } catch (e) {
      toast.error('QR không hợp lệ', {
        description: (e as Error).message || 'QR không hợp lệ hoặc đã sử dụng',
      });
      processingRef.current = false;
    }
  };

  const handleConfirm = () => {
    setState('confirmed');
    toast.success('Đã xác nhận sử dụng voucher');
    setTimeout(() => {
      setState('scanning');
      setResult(null);
      processingRef.current = false;
    }, 3000);
  };

  const handleRescan = () => {
    setState('scanning');
    setResult(null);
    processingRef.current = false;
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 z-10">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">Quét QR Voucher</Text>
      </View>

      <View className="flex-1">
        {state === 'scanning' && (
          <View className="flex-1">
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <View className="flex-1 items-center justify-center">
              <View className="w-64 h-64 rounded-3xl border-2 border-white/50" />
              <Text className="text-white/70 text-sm mt-4">Đưa mã QR voucher vào khung</Text>
            </View>
          </View>
        )}

        {state === 'scanned' && result && (
          <View className="flex-1 items-center justify-center px-6">
            <Card className="p-6 w-full gap-4">
              <View className="items-center">
                <View className="bg-km-accent/20 rounded-full p-4">
                  <Ionicons name="qr-code" size={48} color={colors.accent} />
                </View>
              </View>

              <Text className="text-white text-xl font-bold text-center">Thông tin voucher</Text>

              <View>
                <Text className="text-muted-foreground text-xs">Voucher</Text>
                <Text className="text-white text-base font-semibold">{result.voucherTitle}</Text>
              </View>

              <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex-row items-center">
                <Ionicons name="information-circle" size={20} color={colors.warning} />
                <Text className="text-amber-400 text-sm ml-2 font-semibold">
                  Phí: {result.feeVnd.toLocaleString('vi-VN')}đ
                </Text>
              </View>

              <View className="flex-row gap-3">
                <Button variant="secondary" size="lg" className="flex-1" onPress={handleRescan}>
                  <Text>Huỷ</Text>
                </Button>
                <Button size="lg" className="flex-1" onPress={handleConfirm}>
                  <Text>Xác nhận</Text>
                </Button>
              </View>
            </Card>
          </View>
        )}

        {state === 'confirmed' && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="items-center">
              <View className="bg-km-primary/20 rounded-full p-6 mb-4">
                <Ionicons name="checkmark-circle" size={72} color={colors.success} />
              </View>
              <Text className="text-white text-2xl font-bold mb-2">Thành công!</Text>
              <Text className="text-muted-foreground text-base text-center">
                Voucher đã được xác nhận sử dụng
              </Text>
              {result && (
                <Text className="text-amber-400 text-sm mt-2 font-semibold">
                  Phí: {result.feeVnd.toLocaleString('vi-VN')}đ
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
