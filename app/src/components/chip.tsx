import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { MinTouch, Radius, Spacing, Type } from '@/theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A small selectable pill for option groups: a time window, a slippage choice. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={styles.target}>
      <View
        style={[
          styles.chip,
          { backgroundColor: selected ? theme.cardPressed : 'transparent', borderColor: selected ? theme.accentText : theme.border },
        ]}>
        <ThemedText style={[styles.label, { color: selected ? theme.text : theme.textSecondary }]}>{label}</ThemedText>
      </View>
    </Pressable>
  );
}

/** A label, not a control: what a token is brewed with (BNB, USDT, BREW), a status word. */
export function Tag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { borderColor: theme.border }]}>
      <ThemedText style={[styles.tagLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // The pill is 34 tall; the pressable around it keeps the 44pt target.
  target: {
    minHeight: MinTouch,
    justifyContent: 'center',
  },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.twoHalf + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  label: {
    ...Type.label,
  },
  tag: {
    paddingHorizontal: Spacing.two + 1,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tagLabel: {
    ...Type.monoSmall,
    fontSize: 12,
    lineHeight: 16,
  },
});
