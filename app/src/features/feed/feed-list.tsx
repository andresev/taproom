import type { UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { useFollowing } from '@/features/follow/use-follows';
import { useSession } from '@/features/profile/use-session';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { WINDOW_SECONDS, applyFeedFilters } from './feed-filters';
import { useFeedFiltersStore } from './feed-filters-store';
import { FeedHeader } from './feed-header';
import { FeedRow } from './feed-row';
import type { TokenActivity } from './types';
import { useFeed, useLatestFeed } from './use-feed';

type FeedItemsProps = {
  feed: UseQueryResult<TokenActivity[]>;
  emptyTitle: string;
  emptyMessage: string;
  /** Display names of followed wallets, by lowercase address. When given, rows name who traded. */
  names?: Map<string, string | null>;
};

function FeedItems({ feed, emptyTitle, emptyMessage, names }: FeedItemsProps) {
  const theme = useTheme();
  const sort = useFeedFiltersStore((state) => state.sort);
  const buyingOnly = useFeedFiltersStore((state) => state.buyingOnly);

  if (feed.isPending) return <LoadingState />;
  // Keep showing the last good feed if a background refresh fails.
  if (feed.isError && !feed.data) {
    return (
      <ErrorState
        title="Could not load the feed"
        message={`${feed.error.message} Your wallet and funds are not affected.`}
        onRetry={() => void feed.refetch()}
      />
    );
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
      renderItem={({ item }) => <FeedRow activity={item} names={names} />}
      style={[styles.list, { borderTopColor: theme.border }]}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching && !feed.isFetchedAfterMount}
          onRefresh={() => void feed.refetch()}
          tintColor={theme.textSecondary}
        />
      }
    />
  );
}

/**
 * The Feed tab, "On tap": one row per Brew token. Trending shows every wallet's
 * activity; Following shows only the wallets the user follows, and names them.
 */
export function FeedList() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const following = useFollowing(session?.user.id);
  const wallets = (following.data ?? []).map((wallet) => wallet.address);
  const scope = useFeedFiltersStore((state) => state.scope);
  const windowSeconds = WINDOW_SECONDS[useFeedFiltersStore((state) => state.window)];
  const sort = useFeedFiltersStore((state) => state.sort);
  const followed = useFeed(scope === 'following' ? wallets : [], windowSeconds, sort);
  const everyone = useLatestFeed(scope === 'trending', windowSeconds, sort);

  let body;
  if (scope === 'trending') {
    body = (
      <FeedItems
        feed={everyone}
        emptyTitle="Nothing indexed yet"
        emptyMessage="No Brew launches or trades have been indexed in this window."
      />
    );
  } else if (isLoading || (session && following.isPending)) {
    body = <LoadingState />;
  } else if (following.isError) {
    body = <ErrorState message={following.error.message} onRetry={() => void following.refetch()} />;
  } else if (wallets.length === 0) {
    body = (
      <EmptyState
        title="Nothing on tap yet"
        message="Follow a wallet to see what it buys, sells and launches."
        action={{ label: 'Find wallets', onPress: () => router.push('/discover') }}
      />
    );
  } else {
    body = (
      <FeedItems
        feed={followed}
        emptyTitle="Nothing in this window"
        emptyMessage="The wallets you follow have no indexed Brew trades or launches in this window."
        names={new Map((following.data ?? []).map((wallet) => [wallet.address as string, wallet.displayName]))}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FeedHeader />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    borderTopWidth: 1,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
});
