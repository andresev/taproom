import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A small selectable pill for option groups and toggles. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={Spacing.one}
      style={[styles.chip, { backgroundColor: selected ? theme.text : theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.background : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
  },
});
