// Hộp thoại và bottom sheet kiểu game (dùng Modal của RN, không cần portal).
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { C, DEPTH } from '../../theme/game';
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
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(27,26,58,0.65)', justifyContent: 'center', padding: 24 }}>
        <Pressable
          onPress={() => undefined}
          style={[
            {
              backgroundColor: C.surface,
              borderRadius: 28,
              borderWidth: 2.5,
              borderColor: C.ink900,
              padding: 24,
              gap: 14,
              alignItems: 'center',
            },
            DEPTH.chunky,
          ]}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function GameSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,26,58,0.6)' }}>
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
    </Modal>
  );
}
