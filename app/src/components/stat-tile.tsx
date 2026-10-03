import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

/** One labelled figure: market cap, liquidity, holders. The value is in mono type. */
export function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="mono" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.twoHalf,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
});
