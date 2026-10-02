import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Buy versus sell split: the buy share fills from the left, selling takes the
 * rest. `buyShare` is 0 to 1. Decorative only; the row states the same numbers
 * as text, so screen readers skip the bar.
 */
export function ActivityBar({ buyShare }: { buyShare: number }) {
  const theme = useTheme();
  const share = Math.min(1, Math.max(0, buyShare));

  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {share > 0 ? <View style={{ flex: share, backgroundColor: theme.buy }} /> : null}
      {share < 1 ? <View style={{ flex: 1 - share, backgroundColor: theme.sell }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
});
