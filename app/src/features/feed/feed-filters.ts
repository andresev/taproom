import type { TokenActivity } from './types';

export type FeedSort = 'trending' | 'latest' | 'launches';
export type FeedWindow = '1h' | '6h' | '24h' | '7d' | '30d';

/** Whose activity the feed shows: every wallet's, or only the wallets the user follows. */
export type FeedScope = 'trending' | 'following';

export interface FeedFilters {
  scope: FeedScope;
  sort: FeedSort;
  window: FeedWindow;
  /** Only tokens with more buying than selling in the window. */
  buyingOnly: boolean;
}

/** What the Feed tab shows until the user changes it. */
export const DEFAULT_FEED_FILTERS: FeedFilters = { scope: 'trending', sort: 'trending', window: '24h', buyingOnly: false };

export const WINDOW_SECONDS: Record<FeedWindow, number> = {
  '1h': 60 * 60,
  '6h': 6 * 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
};

/** In the order the options are shown. */
export const FEED_WINDOWS: FeedWindow[] = ['1h', '6h', '24h', '7d', '30d'];

export const SORT_LABELS: Record<FeedSort, string> = {
  trending: 'Trending',
  latest: 'Latest',
  launches: 'New launches',
};

/** Shown under the sort options so "Trending" is a stated rule, not a recommendation. */
export const SORT_DESCRIPTIONS: Record<FeedSort, string> = {
  trending: 'Most wallets trading in the window, then most trades.',
  latest: 'Most recently traded or launched first.',
  launches: 'Only tokens launched in the window, newest first.',
};

const byLatest = (a: TokenActivity, b: TokenActivity) => b.lastTime.getTime() - a.lastTime.getTime();

/**
 * Trending is a count of distinct wallets, because amounts in different pair
 * assets cannot be compared without prices and a single wallet can make any
 * number of trades. Ties go to the token with more trades, then the more recent.
 */
const byTrending = (a: TokenActivity, b: TokenActivity) =>
  b.walletCount - a.walletCount || b.buys + b.sells - (a.buys + a.sells) || byLatest(a, b);

const byLaunch = (a: TokenActivity, b: TokenActivity) =>
  (b.launch?.time.getTime() ?? 0) - (a.launch?.time.getTime() ?? 0) || byLatest(a, b);

/**
 * Filters and orders one window's token activity. The indexer already ranks by
 * the same rules; ordering again here keeps the list right after a filter
 * change, before the next response arrives. Does not mutate `activities`.
 */
export function applyFeedFilters(
  activities: readonly TokenActivity[],
  { sort, buyingOnly }: Pick<FeedFilters, 'sort' | 'buyingOnly'>,
): TokenActivity[] {
  const kept = activities.filter(
    (activity) =>
      (!buyingOnly || (activity.buyShare !== null && activity.buyShare > 0.5)) &&
      (sort !== 'launches' || activity.launch !== null),
  );
  return kept.sort(sort === 'trending' ? byTrending : sort === 'launches' ? byLaunch : byLatest);
}
