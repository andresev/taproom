import type { Address } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ActivityTotals } from '@/features/feed/activity-totals';
import { FEED_WINDOWS, WINDOW_SECONDS } from '@/features/feed/feed-filters';
import { useFeedFiltersStore } from '@/features/feed/feed-filters-store';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { useTokenActivity } from './use-token';

/**
 * Buying versus selling over a chosen window. The window is the same setting
 * as the feed's, so the page opens on whatever the feed was showing.
 */
export function TokenActivity({ address }: { address: Address }) {
  const theme = useTheme();
  const window = useFeedFiltersStore((state) => state.window);
  const setFilters = useFeedFiltersStore((state) => state.setFilters);
  const activity = useTokenActivity(address, WINDOW_SECONDS[window]);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">Activity · last {window}</ThemedText>
      <View style={styles.options}>
        {FEED_WINDOWS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={window === option}
            onPress={() => setFilters({ window: option })}
          />
        ))}
      </View>

      {activity.isPending ? (
        <ThemedText type="small" themeColor="textSecondary">
          Loading…
        </ThemedText>
      ) : activity.isError ? (
        <ThemedText type="small" themeColor="textSecondary">
          Could not load activity: {activity.error.message}
        </ThemedText>
      ) : activity.data ? (
        <>
          <ActivityTotals activity={activity.data} />
          <ThemedText type="small" themeColor="textSecondary">
            {activity.data.walletCount} {activity.data.walletCount === 1 ? 'wallet' : 'wallets'} traded
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No trades in this window.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
