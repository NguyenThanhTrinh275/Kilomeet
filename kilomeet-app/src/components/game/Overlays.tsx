// Hộp thoại và bottom sheet kiểu game (dùng Modal của RN, không cần portal).
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { C, DEPTH } from '../../theme/game';
import { GameToaster } from './GameToaster';
import { GText, IconTile } from './primitives';

export function GameDialog({
  open,
  onClose,
  icon,
  iconFill = C.red500,
  iconColor = C.white,
  title,
  text,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  iconFill?: string;
  iconColor?: string;
  title: string;
  text?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Chừa thanh trạng thái + phím điều hướng; nội dung dài (vd. đóng mùa) thì cuộn trong hộp thoại. */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(27,26,58,0.65)', justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
        <View
          onStartShouldSetResponder={() => true}
          style={[
            {
              backgroundColor: C.surface,
              borderRadius: 28,
              borderWidth: 2.5,
              borderColor: C.ink900,
              maxHeight: '100%',
              overflow: 'hidden',
            },
            DEPTH.chunky,
          ]}>
          <ScrollView bounces={false} contentContainerStyle={{ padding: 24, gap: 14, alignItems: 'center' }}>
          {icon ? <IconTile icon={icon} size={72} iconSize={34} fill={iconFill} color={iconColor} radius={22} sw={3} depth="small" /> : null}
          <GText v="titleL" align="center">
            {title}
          </GText>
          {text ? (
            <GText v="bodyL" color={C.ink500} align="center" style={{ fontFamily: 'Nunito_600SemiBold' }}>
              {text}
            </GText>
          ) : null}
          {children}
          {actions ? <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 4 }}>{actions}</View> : null}
          </ScrollView>
        </View>
      </Pressable>
      <GameToaster />
      </GestureHandlerRootView>
    </Modal>
  );
}

export function GameSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Android edge-to-edge: cửa sổ không tự co khi bật bàn phím → phải dùng 'padding' cả trên Android,
          nếu không ô nhập (mã QR, email người nhận) bị bàn phím che mất. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,26,58,0.6)' }}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 3,
            borderBottomWidth: 0,
            borderColor: C.ink900,
            maxHeight: '88%',
            overflow: 'hidden',
          }}>
          <View style={{ alignItems: 'center', paddingTop: 12 }}>
            <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: C.ink300 }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 16) + 20, gap: 14 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <GameToaster />
      </GestureHandlerRootView>
    </Modal>
  );
}
