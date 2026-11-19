// Ô nhập chunky, ô nhập gắn react-hook-form, ô tìm kiếm, tab 2 lựa chọn.
import * as React from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Search, XCircle, type LucideIcon } from 'lucide-react-native';
import { C, DEPTH, FONT, STROKE } from '../../theme/game';
import { GText } from './primitives';

export type GInputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  error?: string;
  hint?: string;
  multiline?: boolean;
  /** Bộ đếm ký tự, ví dụ maxLength */
  counter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputComponent?: React.ComponentType<TextInputProps>;
};

export function GInput({
  label,
  icon: Icon,
  right,
  error,
  hint,
  multiline,
  counter,
  containerStyle,
  inputComponent: InputComp = TextInput,
  ...props
}: GInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? <GText v="bodyMStrong">{label}</GText> : null}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            gap: 10,
            minHeight: multiline ? 120 : 52,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 0,
            borderRadius: 14,
            backgroundColor: C.surface,
            borderWidth: STROKE,
            borderColor: error ? C.red700 : C.ink900,
          },
          focused ? DEPTH.chunky : DEPTH.small,
        ]}>
        {Icon ? <Icon size={20} color={focused ? C.ink900 : C.ink500} strokeWidth={2.5} style={multiline ? { marginTop: 2 } : null} /> : null}
        <InputComp
          placeholderTextColor={C.ink300}
          {...props}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            fontFamily: FONT.bodyBold,
            fontSize: multiline ? 14 : 16,
            lineHeight: multiline ? 20 : undefined,
            color: C.ink900,
            paddingVertical: multiline ? 0 : 12,
            textAlignVertical: multiline ? 'top' : 'center',
            minHeight: multiline ? 96 : undefined,
          }}
        />
        {right}
      </View>
      {error ? (
        <GText v="bodyS" color={C.red700}>
          {error}
        </GText>
      ) : hint || counter ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <GText v="bodyS" color={C.grape700} style={{ flex: 1 }}>
            {hint ?? ''}
          </GText>
          {counter && props.maxLength ? (
            <GText v="numS" color={C.ink500}>
              {`${(props.value ?? '').length}/${props.maxLength}`}
            </GText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type GFormInputProps<T extends FieldValues> = Omit<GInputProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

export function GFormInput<T extends FieldValues>({ control, name, ...props }: GFormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <GInput {...props} value={value == null ? '' : String(value)} onChangeText={onChange} onBlur={onBlur} error={error?.message} />
      )}
    />
  );
}

export function SearchBar({ value, onChangeText, placeholder, right }: { value: string; onChangeText: (s: string) => void; placeholder: string; right?: React.ReactNode }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 48,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: C.surface,
          borderWidth: STROKE,
          borderColor: C.ink900,
        },
        DEPTH.small,
      ]}>
      <Search size={20} color={C.ink500} strokeWidth={2.5} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.ink300}
        style={{ flex: 1, fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink900, paddingVertical: 0 }}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <XCircle size={20} color={C.ink500} strokeWidth={2.5} />
        </Pressable>
      ) : (
        right
      )}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeFill = C.surface,
  activeText = C.ink900,
  radius = 999,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  activeFill?: string;
  activeText?: string;
  radius?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: radius,
        backgroundColor: C.sunken,
        borderWidth: STROKE,
        borderColor: C.ink900,
      }}>
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              {
                flex: 1,
                minHeight: 40,
                paddingHorizontal: 6,
                borderRadius: radius === 999 ? 999 : radius - 4,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              },
              on ? [{ backgroundColor: activeFill, borderWidth: 2, borderColor: C.ink900 }, DEPTH.small] : null,
            ]}>
            {Icon ? <Icon size={16} color={on ? activeText : C.ink700} strokeWidth={2.5} /> : null}
            <GText v="titleS" color={on ? activeText : C.ink500} numberOfLines={1} adjustsFontSizeToFit>
              {o.label}
            </GText>
          </Pressable>
        );
      })}
    </View>
  );
}
