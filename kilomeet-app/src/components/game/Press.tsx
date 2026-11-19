// Pressable dùng được style dạng hàm ({ pressed }) => ... trên mọi nền tảng.
//
// NativeWind (react-native-css-interop) bọc Pressable của react-native và trên Android bỏ mất style
// dạng hàm: nút mất nền, viền, padding, flexDirection. Style tĩnh thì vẫn đúng. Component này tự theo dõi
// trạng thái nhấn rồi truyền xuống một style TĨNH đã flatten, nên luôn hiển thị đúng.
import * as React from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PressState = { pressed: boolean };

export type PressProps = Omit<RNPressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((s: PressState) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((s: PressState) => React.ReactNode);
};

export function Pressable({ style, children, onPressIn, onPressOut, ...props }: PressProps) {
  const [pressed, setPressed] = React.useState(false);
  const state = { pressed };
  return (
    <RNPressable
      {...props}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={StyleSheet.flatten(typeof style === 'function' ? style(state) : style)}>
      {typeof children === 'function' ? children(state) : children}
    </RNPressable>
  );
}
