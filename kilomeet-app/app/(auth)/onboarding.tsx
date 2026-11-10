import { View, Text, TouchableOpacity, Dimensions, Image, FlatList } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    image: require('../../assets/images/onboarding_1.jpg'),
    title: 'Chạy bộ mỗi ngày',
    description: 'Hoàn thành nhiệm vụ chạy hàng ngày và hàng tuần để kiếm token và leo hạng.',
  },
  {
    image: require('../../assets/images/onboarding_2.jpg'),
    title: 'Kiếm token & voucher',
    description: 'Dùng token mua voucher giảm giá tại các cửa hàng đối tác. Chạy ngang quán để được giảm thêm!',
  },
  {
    image: require('../../assets/images/onboarding_3.jpg'),
    title: 'Chạy cùng nhóm',
    description: 'Đăng ký Hội viên để được ghép nhóm chạy chung với những người gần bạn.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
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
            <Image
              source={item.image}
              style={{ width: width * 0.75, height: width * 0.75, borderRadius: 24 }}
              className="mb-8"
              resizeMode="cover"
            />
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
