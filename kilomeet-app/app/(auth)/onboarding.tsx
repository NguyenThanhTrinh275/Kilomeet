import { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, Footprints, Percent, Play, TrendingUp, Users } from 'lucide-react-native';
import { C, DEPTH, NIGHT_GRADIENT } from '../../src/theme/game';
import {
  Avatar,
  CityMap,
  Coin,
  GButton,
  GText,
  Glow,
  MapPin,
  RankEmblem,
  StarField,
  VoucherTicket,
} from '../../src/components/game';

const { width } = Dimensions.get('window');
const STAGE_H = 400;

const slides = [
  {
    title: 'Chạy mỗi ngày,\nlên cấp mỗi tuần',
    body: 'Hoàn thành nhiệm vụ ngày và tuần để nhận token. Chạy đủ km để leo từ Đồng lên Cao Thủ.',
    glow: C.green500,
  },
  {
    title: 'Token đổi\nvoucher thật',
    body: 'Dùng token mua voucher của quán đối tác. Chạy ngang qua quán để được giảm thêm tới 50%.',
    glow: C.coin500,
  },
  {
    title: 'Lập đội,\nchạy cùng nhau',
    body: 'Hội viên được ghép nhóm với người chạy gần nhà, hẹn ở điểm hội tụ và xuất phát cùng giờ.',
    glow: C.sky500,
  },
];

function Stage1() {
  const cx = width / 2;
  return (
    <>
      <View style={[{ position: 'absolute', left: cx - 85, top: 110, width: 170, height: 170, borderRadius: 170, backgroundColor: C.green500, borderWidth: 4, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }, DEPTH.glowGreen]}>
        <Footprints size={92} color={C.ink900} strokeWidth={2.5} />
      </View>
      <RankEmblem rank="đồng" size={64} style={{ position: 'absolute', left: cx - 155, top: 90 }} />
      <RankEmblem rank="vàng" size={72} style={{ position: 'absolute', left: cx + 95, top: 70 }} />
      <RankEmblem rank="cao_thủ" size={80} style={{ position: 'absolute', left: cx + 75, top: 240 }} />
      <View style={[{ position: 'absolute', left: cx - 165, top: 262, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: C.surface, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.chunky]}>
        <Coin size={28} />
        <GText v="numM">+10</GText>
      </View>
      <View style={[{ position: 'absolute', left: cx - 45, top: 62, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.coin500, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.small]}>
        <TrendingUp size={16} color={C.ink900} strokeWidth={2.5} />
        <GText v="caps">Lên hạng!</GText>
      </View>
    </>
  );
}

function Stage2() {
  const cx = width / 2;
  return (
    <>
      <View style={[{ position: 'absolute', left: cx - 75, top: 60, borderRadius: 999 }, DEPTH.glowCoin]}>
        <Coin size={150} />
      </View>
      <Coin size={40} style={{ position: 'absolute', left: cx - 135, top: 70 }} />
      <Coin size={30} style={{ position: 'absolute', left: cx + 105, top: 150 }} />
      <Coin size={24} style={{ position: 'absolute', left: cx + 115, top: 60 }} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: 225, transform: [{ scale: 0.92 }] }}>
        <VoucherTicket discount="-20%" store="FUJI COFFEE · 120 m" title="Giảm 20% mọi đồ uống" price={500} dealPrice={250} rank="bạc" leftLabel="CÒN 37" questLabel="Đã chạy ngang quán · -50%" />
      </View>
      <View style={[{ position: 'absolute', left: cx + 55, top: 200, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.grape500, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.small]}>
        <Percent size={16} color={C.white} strokeWidth={2.5} />
        <GText v="caps" color={C.white}>
          -50% giá
        </GText>
      </View>
    </>
  );
}

function Stage3() {
  const cx = width / 2;
  const pals: [string, string, number, number][] = [
    ['LN', C.green300, 40, 40],
    ['MT', C.coin300, 210, 50],
    ['HA', C.sky300, 200, 180],
    ['QT', C.orange300, 50, 170],
  ];
  return (
    <>
      <View style={[{ position: 'absolute', left: cx - 150, top: 60, width: 300, height: 260, borderRadius: 28, borderWidth: 3, borderColor: C.ink900, overflow: 'hidden' }, DEPTH.chunky]}>
        <View style={{ position: 'absolute', left: -40, top: -120 }}>
          <CityMap />
        </View>
        <View style={{ position: 'absolute', left: 124, top: 90 }}>
          <MapPin kind="meet" size={56} />
        </View>
        {pals.map(([i, c, x, y]) => (
          <Avatar key={i} initials={i} fill={c} style={{ position: 'absolute', left: x, top: y }} />
        ))}
      </View>
      <View style={[{ position: 'absolute', left: cx - 75, top: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.coin500, borderWidth: 2.5, borderColor: C.ink900 }, DEPTH.chunky]}>
        <Users size={18} color={C.ink900} strokeWidth={2.5} />
        <GText v="titleS">4/6 đồng đội</GText>
      </View>
    </>
  );
}

const STAGES = [Stage1, Stage2, Stage3];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);

  const complete = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const next = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
    } else {
      void complete();
    }
  };

  const last = index === slides.length - 1;
  const slide = slides[index]!;
  const StageArt = STAGES[index]!;

  return (
    <View style={{ flex: 1, backgroundColor: C.night }}>
      <LinearGradient colors={NIGHT_GRADIENT} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <StarField count={18} seed={index + 5} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable onPress={() => void complete()} style={[{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900 }, DEPTH.small]}>
            <GText v="bodyMStrong">Bỏ qua</GText>
          </Pressable>
        </View>

        <View style={{ width, height: STAGE_H }}>
          <Glow size={300} color={slide.glow} style={{ position: 'absolute', left: width / 2 - 150, top: 40 }} />
          <View style={{ position: 'absolute', left: width / 2 - 130, top: 330, width: 260, height: 56, borderRadius: 999, backgroundColor: C.night2, borderWidth: 3, borderColor: C.ink900 }} />
          <StageArt />
        </View>
      </SafeAreaView>

      <View
        style={{
          backgroundColor: C.bg,
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          borderWidth: 3,
          borderBottomWidth: 0,
          borderColor: C.ink900,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 40,
          gap: 14,
        }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {slides.map((_, i) => (
            <View key={i} style={{ width: i === index ? 32 : 12, height: 12, borderRadius: 999, backgroundColor: i === index ? C.orange500 : C.ink300, borderWidth: 2, borderColor: C.ink900 }} />
          ))}
        </View>
        <GText v="displayL">{slide.title}</GText>
        <GText v="bodyL" color={C.ink500}>
          {slide.body}
        </GText>
        <GButton
          label={last ? 'Bắt đầu chơi' : 'Tiếp tục'}
          type={last ? 'accent' : 'primary'}
          icon={last ? Play : ChevronRight}
          filledIcon={last}
          onPress={next}
          block
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );
}
