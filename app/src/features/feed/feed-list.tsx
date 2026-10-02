import type { UseQueryResult } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { useFollowing } from '@/features/follow/use-follows';
import { useSession } from '@/features/profile/use-session';
import { Spacing } from '@/theme';

import { FeedFilterBar } from './feed-filter-bar';
import { WINDOW_SECONDS, applyFeedFilters } from './feed-filters';
import { useFeedFiltersStore } from './feed-filters-store';
import { TokenActivityRow } from './token-activity-row';
import type { TokenActivity } from './types';
import { useFeed, useLatestFeed } from './use-feed';

type FeedItemsProps = {
  feed: UseQueryResult<TokenActivity[]>;
  hint?: string;
  emptyTitle: string;
  emptyMessage: string;
  /** Display names of followed wallets, by lowercase address. When given, rows name who traded. */
  names?: Map<string, string | null>;
};

function FeedItems({ feed, hint, emptyTitle, emptyMessage, names }: FeedItemsProps) {
  const sort = useFeedFiltersStore((state) => state.sort);
  const buyingOnly = useFeedFiltersStore((state) => state.buyingOnly);

  if (feed.isPending) return <LoadingState />;
  // Keep showing the last good feed if a background refresh fails.
  if (feed.isError && !feed.data) {
    return <ErrorState message={feed.error.message} onRetry={() => void feed.refetch()} />;
  }
  if (!feed.data || feed.data.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  const shown = applyFeedFilters(feed.data, { sort, buyingOnly });
  if (shown.length === 0) {
    return <EmptyState title="No tokens match" message="Nothing in this window fits the current filters." />;
  }

  return (
    <FlatList
      data={shown}
      keyExtractor={(item) => item.tokenAddress}
      renderItem={({ item }) => <TokenActivityRow activity={item} names={names} />}
      ListHeaderComponent={
        hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null
      }
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={feed.isRefetching && !feed.isFetchedAfterMount} onRefresh={() => void feed.refetch()} />
      }
    />
  );
}

/**
 * The Feed tab: what the wallets you follow are buying, selling and launching on
 * Brew, one row per token. Signed out, or following nobody, it shows activity
 * from every wallet instead. Opens sorted by Trending.
 */
export function FeedList() {
  const { session, isLoading } = useSession();
  const following = useFollowing(session?.user.id);
  const wallets = (following.data ?? []).map((wallet) => wallet.address);
  const showEveryone = !isLoading && (!session || (following.isSuccess && wallets.length === 0));
  const windowSeconds = WINDOW_SECONDS[useFeedFiltersStore((state) => state.window)];
  const sort = useFeedFiltersStore((state) => state.sort);
  const feed = useFeed(wallets, windowSeconds, sort);
  const everyone = useLatestFeed(showEveryone, windowSeconds, sort);

  if (isLoading) return <LoadingState />;
  if (showEveryone) {
    return (
      <View style={styles.container}>
        <FeedFilterBar scope="Brew" />
        <FeedItems
          feed={everyone}
          hint="Follow wallets on Discover to see only their activity here."
          emptyTitle="Nothing indexed yet"
          emptyMessage="No Brew launches or trades have been indexed in this window."
        />
      </View>
    );
  }
  if (following.isPending) return <LoadingState />;
  if (following.isError) {
    return <ErrorState message={following.error.message} onRetry={() => void following.refetch()} />;
  }

  return (
    <View style={styles.container}>
      <FeedFilterBar scope="Following" />
      <FeedItems
        feed={feed}
        emptyTitle="Nothing yet"
        emptyMessage="The wallets you follow have no indexed Brew trades or launches in this window."
        names={new Map(following.data.map((wallet) => [wallet.address as string, wallet.displayName]))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
