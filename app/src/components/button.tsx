import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Shows a spinner and blocks presses while an action is in flight. */
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, loading = false, disabled = false }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        inactive && styles.inactive,
      ]}>
      {loading ? <ActivityIndicator /> : <ThemedText type="smallBold">{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  inactive: {
    opacity: 0.5,
  },
});
