import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { GoldFill } from '@/components/gold';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Brand, MinTouch, Radius, Spacing, Type } from '@/theme';

/**
 * - `primary`: the one gold action on a screen, filled with the logo's brushed gold.
 * - `secondary`: everything else (the default).
 * - `destructive`: an action that removes or ends something.
 * - `quiet`: an outlined action in gold text, for a repeated action such as a row's Buy.
 */
export type ButtonKind = 'primary' | 'secondary' | 'destructive' | 'quiet';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  /** Shows a spinner and blocks presses while an action is in flight. */
  loading?: boolean;
  disabled?: boolean;
  /** 52 for a screen's main action, 44 otherwise. */
  size?: 'regular' | 'large';
};

export function Button({ label, onPress, kind = 'secondary', icon, loading = false, disabled = false, size = 'regular' }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const colors = {
    primary: { fill: theme.accent, text: theme.onAccent, border: Brand.fillBorder },
    secondary: { fill: theme.card, text: theme.text, border: theme.border },
    destructive: { fill: 'transparent', text: theme.danger, border: theme.danger },
    quiet: { fill: 'transparent', text: theme.accentText, border: theme.border },
  }[kind];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        size === 'large' && styles.large,
        { backgroundColor: pressed && kind !== 'primary' ? theme.cardPressed : colors.fill, borderColor: colors.border },
        pressed && kind === 'primary' && styles.pressedPrimary,
        inactive && styles.inactive,
      ]}>
      {kind === 'primary' ? <GoldFill /> : null}
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} color={colors.text} size={18} /> : null}
          <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTouch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    // Clips the primary button's gold fill to the corners.
    overflow: 'hidden',
  },
  large: {
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    ...Type.bodyStrong,
  },
  pressedPrimary: {
    opacity: 0.85,
  },
  inactive: {
    opacity: 0.45,
  },
});
