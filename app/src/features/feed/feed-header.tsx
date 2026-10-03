import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { GoldTitle } from '@/components/gold';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { MinTouch, Spacing } from '@/theme';

import { FEED_WINDOWS, SORT_DESCRIPTIONS, SORT_LABELS, type FeedScope, type FeedSort } from './feed-filters';
import { useFeedFiltersStore } from './feed-filters-store';

const SORTS: FeedSort[] = ['trending', 'latest', 'launches'];
const SCOPES: readonly { value: FeedScope; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'following', label: 'Following' },
];

/**
 * The top of the Feed tab: the "On tap" title, the switch between everyone's
 * activity and the wallets the user follows, and the sort and time-window
 * options behind "Filters". The line under the title always states what is shown.
 */
export function FeedHeader() {
  const theme = useTheme();
  const { scope, sort, window, buyingOnly, setFilters } = useFeedFiltersStore();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <GoldTitle text="On tap" size={26} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Brew tokens · {SORT_LABELS[sort].toLowerCase()} · last {window}
            {buyingOnly ? ' · more buying' : ''}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={styles.filters}>
          <ThemedText type="label" style={{ color: theme.accentText }}>
            {open ? 'Done' : 'Filters'}
          </ThemedText>
        </Pressable>
      </View>

      <Segmented options={SCOPES} value={scope} onChange={(next) => setFilters({ scope: next })} />

      {open ? (
        <View style={styles.panel}>
          <ThemedText type="caption" themeColor="textSecondary">
            SORT BY
          </ThemedText>
          <View style={styles.options}>
            {SORTS.map((option) => (
              <Chip
                key={option}
                label={SORT_LABELS[option]}
                selected={sort === option}
                onPress={() => setFilters({ sort: option })}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {SORT_DESCRIPTIONS[sort]}
          </ThemedText>

          <ThemedText type="caption" themeColor="textSecondary">
            TIME WINDOW
          </ThemedText>
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

          <ThemedText type="caption" themeColor="textSecondary">
            SHOW
          </ThemedText>
          <View style={styles.options}>
            <Chip label="All tokens" selected={!buyingOnly} onPress={() => setFilters({ buyingOnly: false })} />
            <Chip
              label="More buying than selling"
              selected={buyingOnly}
              onPress={() => setFilters({ buyingOnly: true })}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
  filters: {
    minHeight: MinTouch,
    minWidth: MinTouch,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  panel: {
    gap: Spacing.one,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
