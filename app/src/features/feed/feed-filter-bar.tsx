import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/theme';

import { FEED_WINDOWS, SORT_DESCRIPTIONS, SORT_LABELS, type FeedSort } from './feed-filters';
import { useFeedFiltersStore } from './feed-filters-store';

const SORTS: FeedSort[] = ['trending', 'latest', 'launches'];

/**
 * The feed's title and its filter settings. Collapsed, it states what is being
 * shown; "Filters" opens the options in place.
 */
export function FeedFilterBar({ scope }: { scope: string }) {
  const { sort, window, buyingOnly, setFilters } = useFeedFiltersStore();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {scope} · {SORT_LABELS[sort]} · last {window}
          {buyingOnly ? ' · buying' : ''}
        </ThemedText>
        <Chip label={open ? 'Done' : 'Filters'} selected={open} onPress={() => setOpen(!open)} />
      </View>

      {open ? (
        <View style={styles.panel}>
          <ThemedText type="small" themeColor="textSecondary">
            Sort by
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

          <ThemedText type="small" themeColor="textSecondary">
            Time window
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

          <ThemedText type="small" themeColor="textSecondary">
            Show
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  panel: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
