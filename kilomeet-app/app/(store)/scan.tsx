import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { toast } from 'sonner-native';
import { Camera, Check, Clock, Link2, QrCode, ScanLine, Wallet, X, Zap } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { C, DEPTH } from '../../src/theme/game';
import { fmtTime, fmtVnd } from '../../src/lib/format';
import { Banner, Card, GameSheet, GButton, GInput, GText, IconButton, InfoRow, Row, ScanFrame } from '../../src/components/game';

type ScanResult = { voucherTitle: string; feeVnd: number };
type Phase = 'scanning' | 'scanned' | 'confirmed';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [code, setCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState('');
  const [at, setAt] = useState('');
  const processing = useRef(false);

  const submit = async (data: string) => {
    if (processing.current) return;
    processing.current = true;
    try {
      const res = await api.post<ScanResult>('/store/scan', { qrCode: data });
      setResult(res);
      setCode(data);
      setPhase('scanned');
      setManualOpen(false);
    } catch (e) {
      toast.error('QR không hợp lệ', { description: (e as Error).message || 'QR không hợp lệ hoặc đã sử dụng' });
      processing.current = false;
    }
  };

  const reset = () => {
    setPhase('scanning');
    setResult(null);
    setCode('');
    processing.current = false;
  };

  const confirm = () => {
    setAt(new Date().toISOString());
    setPhase('confirmed');
    toast.success('Đã xác nhận sử dụng voucher', {
      description: 'Voucher bị đốt on-chain, phí 5.000đ được ghi nhận.',
      action: { label: 'Xem giao dịch', onClick: () => router.push('/(store)/wallet') },
    });
  };

  // ─── Thành công ───────────────────────────────────────────────
  if (phase === 'confirmed' && result) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={[C.green500, C.green700]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[{ width: 150, height: 150, borderRadius: 150, backgroundColor: C.surface, borderWidth: 4, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.chunky]}>
            <Check size={86} color={C.green700} strokeWidth={3} />
          </View>
          <View style={[{ paddingVertical: 8, paddingHorizontal: 24, borderRadius: 16, backgroundColor: C.coin500, borderWidth: 3, borderColor: C.ink900 }, DEPTH.button]}>
            <GText v="displayL">THÀNH CÔNG!</GText>
          </View>
          <GText v="bodyL" align="center">
            Voucher "{result.voucherTitle}" đã được sử dụng.
          </GText>
          <Card gap={10} style={{ alignSelf: 'stretch' }}>
            {[
              [Link2, 'Đốt voucher on-chain', code.length > 14 ? `${code.slice(0, 6)}…${code.slice(-4)}` : code, C.sky700],
              [Wallet, 'Phí ghi nhận', `+${fmtVnd(result.feeVnd)}`, C.red700],
              [Clock, 'Thời điểm', `${fmtTime(at)} · ${new Date(at).toLocaleDateString('vi-VN')}`, C.ink900],
            ].map(([I, l, v, col]) => {
              const Icon = I as typeof Link2;
              return (
                <Row key={l as string} gap={10}>
                  <Icon size={18} color={col as string} strokeWidth={2.5} />
                  <GText v="bodyM" color={C.ink500} style={{ flex: 1 }}>
                    {l as string}
                  </GText>
                  <GText v="bodyMStrong" color={col as string}>
                    {v as string}
                  </GText>
                </Row>
              );
            })}
          </Card>
          <GButton label="Quét tiếp" type="secondary" icon={ScanLine} onPress={reset} block />
          <GButton label="Về tổng quan" type="secondary" size="M" onPress={() => router.back()} block />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink900 }}>
      {permission?.granted && phase === 'scanning' ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => void submit(data)} />
      ) : (
        <LinearGradient colors={[C.ink700, C.ink900]} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,26,58,0.35)' }]} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <Row gap={12} style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <IconButton icon={X} onPress={() => router.back()} />
          <GText v="titleM" color={C.white} align="center" style={{ flex: 1 }}>
            Quét QR voucher
          </GText>
          <IconButton icon={Zap} fill={torch ? C.coin500 : C.surface} onPress={() => setTorch((t) => !t)} />
        </Row>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <ScanFrame size={270} />
          <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 40 }}>
            <GText v="titleM" color={C.white} align="center">
              {permission?.granted ? 'Đưa mã QR voucher vào khung' : 'Cần quyền camera để quét'}
            </GText>
            <GText v="bodyM" color={C.ink300} align="center">
              Mã được kiểm tra trên chuỗi để chống dùng hai lần.
            </GText>
            {!permission?.granted ? <GButton label="Cho phép camera" type="coin" icon={Camera} onPress={() => void requestPermission()} style={{ marginTop: 8 }} /> : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <GButton label="Nhập mã thủ công" type="secondary" icon={QrCode} onPress={() => setManualOpen(true)} block />
        </View>
      </SafeAreaView>

      <GameSheet open={manualOpen} onClose={() => setManualOpen(false)}>
        <GText v="titleL">Nhập mã voucher</GText>
        <GInput label="Mã QR" icon={QrCode} placeholder="Dán hoặc gõ mã trên voucher" value={manual} onChangeText={setManual} autoCapitalize="none" />
        <GButton label="Kiểm tra mã" icon={Check} onPress={() => manual.trim() && void submit(manual.trim())} block />
      </GameSheet>

      <GameSheet open={phase === 'scanned' && !!result} onClose={reset}>
        <Banner icon={Check} tone="green" iconColor={C.green700} text="Voucher hợp lệ · chưa sử dụng" />
        <Card gap={0} pad={[4, 16]} depth="small">
          <InfoRow label="Voucher">{result?.voucherTitle ?? ''}</InfoRow>
          <InfoRow label="Mã">{code.length > 18 ? `${code.slice(0, 10)}…` : code}</InfoRow>
          <InfoRow label="Phí nền tảng" last>
            <GText v="numS" color={C.red700}>
              {fmtVnd(result?.feeVnd ?? 5000)}
            </GText>
          </InfoRow>
        </Card>
        <Row gap={12}>
          <GButton label="Huỷ" type="secondary" onPress={reset} flex />
          <GButton label="Xác nhận dùng" icon={Check} onPress={confirm} flex />
        </Row>
      </GameSheet>
    </View>
  );
}
