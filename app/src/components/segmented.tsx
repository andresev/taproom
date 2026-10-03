import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type } from '@/theme';

/** A switch between a few views of one screen: Trending and Following. */
export function Segmented<Value extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.cardPressed }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.segment, selected && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={[styles.label, { color: selected ? theme.text : theme.textSecondary }]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.control + 2,
  },
  segment: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control - 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    ...Type.label,
    fontSize: 14,
  },
});
