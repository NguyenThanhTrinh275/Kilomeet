import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { View, type TextInputProps } from 'react-native';

type FormFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  multiline?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'>;

function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  multiline,
  leftIcon,
  rightElement,
  containerClassName,
  inputClassName,
  ...inputProps
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className={cn('gap-1.5', containerClassName)}>
          {label ? <Label>{label}</Label> : null}
          {multiline ? (
            <Textarea
              value={value == null ? '' : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              className={cn(error && 'border-destructive', inputClassName)}
              {...inputProps}
            />
          ) : leftIcon || rightElement ? (
            <View
              className={cn(
                'flex-row items-center bg-card rounded-xl px-4 h-12 border border-border',
                error && 'border-destructive'
              )}>
              {leftIcon ? <View className="mr-3">{leftIcon}</View> : null}
              <Input
                value={value == null ? '' : String(value)}
                onChangeText={onChange}
                onBlur={onBlur}
                className={cn('flex-1 border-0 bg-transparent px-0 h-full shadow-none', inputClassName)}
                {...inputProps}
              />
              {rightElement ? <View className="ml-2">{rightElement}</View> : null}
            </View>
          ) : (
            <Input
              value={value == null ? '' : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              className={cn(error && 'border-destructive', inputClassName)}
              {...inputProps}
            />
          )}
          {error?.message ? (
            <Text className="text-destructive text-xs">{error.message}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

export { FormInput };
