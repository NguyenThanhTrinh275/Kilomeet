import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 3, native: 5 }),
  placeholderTextColor = '#64748B',
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      className={cn(
        'text-foreground border-border bg-card flex min-h-20 w-full flex-row rounded-xl border px-4 py-3 text-base shadow-sm shadow-black/5',
        Platform.select({
          web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.editable === false && 'opacity-50',
        className
      )}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
