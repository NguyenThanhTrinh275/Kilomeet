import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { colors } from '../../src/theme/colors';

type ScanResult = {
  voucherTitle: string;
  holderName: string;
  value: string;
};

const MOCK_RESULT: ScanResult = {
  voucherTitle: 'Giảm 20% cà phê',
  holderName: 'Nguyễn Văn A',
  value: '50 token',
};

type ScanState = 'scanning' | 'scanned' | 'confirmed';

export default function ScanScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const processingRef = useRef(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (processingRef.current) return;
    processingRef.current = true;
    // ponytail: mock — parse QR data from API when wired
    setResult(MOCK_RESULT);
    setState('scanned');
  };

  const handleConfirm = () => {
    setState('confirmed');
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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-4">Quét QR</Text>
      </View>

      <View className="flex-1">
        {/* Camera */}
        {state === 'scanning' && (
          <View className="flex-1">
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            {/* Overlay with cutout */}
            <View className="flex-1 items-center justify-center">
              <View className="w-64 h-64 rounded-3xl border-2 border-white/50" />
              <Text className="text-white/70 text-sm mt-4">Đưa mã QR voucher vào khung</Text>
            </View>
          </View>
        )}

        {/* Scanned Result */}
        {state === 'scanned' && result && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-km-bg-secondary rounded-2xl p-6 w-full">
              <View className="items-center mb-4">
                <View className="bg-km-accent/20 rounded-full p-4">
                  <Ionicons name="qr-code" size={48} color={colors.accent} />
                </View>
              </View>

              <Text className="text-white text-xl font-bold text-center mb-4">Thông tin voucher</Text>

              <View className="mb-3">
                <Text className="text-slate-400 text-xs">Voucher</Text>
                <Text className="text-white text-base font-semibold">{result.voucherTitle}</Text>
              </View>

              <View className="mb-3">
                <Text className="text-slate-400 text-xs">Người dùng</Text>
                <Text className="text-white text-base font-semibold">{result.holderName}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-slate-400 text-xs">Giá trị</Text>
                <Text className="text-white text-base font-semibold">{result.value}</Text>
              </View>

              {/* Fee notice */}
              <View className="bg-km-warning/10 rounded-xl p-3 flex-row items-center mb-6">
                <Ionicons name="information-circle" size={20} color={colors.warning} />
                <Text className="text-km-warning text-sm ml-2 font-semibold">Phí: 5.000đ</Text>
              </View>

              <View className="flex-row">
                <TouchableOpacity
                  className="flex-1 bg-km-surface rounded-xl py-4 items-center mr-2"
                  activeOpacity={0.7}
                  onPress={handleRescan}
                >
                  <Text className="text-white font-bold">Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-km-primary rounded-xl py-4 items-center ml-2"
                  activeOpacity={0.7}
                  onPress={handleConfirm}
                >
                  <Text className="text-km-bg font-bold">Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Confirmed */}
        {state === 'confirmed' && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="items-center">
              <View className="bg-km-primary/20 rounded-full p-6 mb-4">
                <Ionicons name="checkmark-circle" size={72} color={colors.success} />
              </View>
              <Text className="text-white text-2xl font-bold mb-2">Thành công!</Text>
              <Text className="text-slate-400 text-base text-center">
                Voucher đã được xác nhận sử dụng
              </Text>
              <Text className="text-km-warning text-sm mt-2 font-semibold">Phí: 5.000đ</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
