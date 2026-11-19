// Bản đồ hoạt hình dùng chung (khớp Map/City trong Figma): đường trắng viền mực, công viên xanh, khối nhà kem.
//
// Hai lỗi khiến style mất (thấy bản đồ Google thường):
// 1. Android: MapView dựng lúc khung còn 0×0 (vd. thẻ bản đồ trong HUD đang chạy) bỏ qua customMapStyle.
//    → Gắn style lại sau onMapReady (đổi tham chiếu mảng để native áp lại).
// 2. iOS: không ép provider thì dùng Apple Maps, vốn không hỗ trợ customMapStyle. → PROVIDER_GOOGLE.
import * as React from 'react';
import MapView, { PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';
import { GAME_MAP_STYLE } from '../../theme/game';

export const GameMap = React.forwardRef<MapView, MapViewProps>(function GameMap({ onMapReady, customMapStyle, ...props }, ref) {
  const base = customMapStyle ?? GAME_MAP_STYLE;
  const [style, setStyle] = React.useState(base);
  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      customMapStyle={style}
      userInterfaceStyle="light"
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsIndoors={false}
      showsTraffic={false}
      toolbarEnabled={false}
      {...props}
      onMapReady={(e) => {
        setStyle([...base]); // mảng mới → native áp lại style khi bản đồ đã sẵn sàng
        onMapReady?.(e);
      }}
    />
  );
});
