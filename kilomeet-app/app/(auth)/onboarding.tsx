import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'footsteps' as const,
    title: 'Chạy bộ mỗi ngày',
    description: 'Hoàn thành nhiệm vụ chạy hàng ngày và hàng tuần để kiếm token và leo hạng.',
    color: '#22C55E',
  },
  {
    icon: 'pricetag' as const,
    title: 'Kiếm token & voucher',
    description: 'Dùng token mua voucher giảm giá tại các cửa hàng đối tác. Chạy ngang quán để được giảm thêm!',
    color: '#F97316',
  },
  {
    icon: 'people' as const,
    title: 'Chạy cùng nhóm',
    description: 'Đăng ký Hội viên để được ghép nhóm chạy chung với những người gần bạn.',
    color: '#818CF8',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-km-bg">
      <View className="flex-row justify-end px-6 pt-2">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-slate-400 text-base">Bỏ qua</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={{ width }} className="items-center justify-center px-8">
            {/* Icon circle */}
            <View
              className="w-40 h-40 rounded-full items-center justify-center mb-10"
              style={{ backgroundColor: item.color + '20' }}
            >
              <Ionicons name={item.icon} size={64} color={item.color} />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-slate-400 text-base text-center leading-6">
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Dots + Button */}
      <View className="px-6 pb-8">
        {/* Dots */}
        <View className="flex-row justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${
                i === currentIndex ? 'w-8 bg-km-primary' : 'w-2 bg-km-surface'
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          className="h-14 bg-km-primary rounded-xl items-center justify-center"
          onPress={handleNext}
        >
          <Text className="text-white text-lg font-semibold">
            {currentIndex < slides.length - 1 ? 'Tiếp tục' : 'Bắt đầu'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
