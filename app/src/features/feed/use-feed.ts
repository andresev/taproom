import { useQuery } from '@tanstack/react-query';

import { indexerPost } from '@/lib/api/indexer';

import { toTokenActivities, type ActivityResponse } from './activity-api';
import type { FeedSort } from './feed-filters';
import type { TokenActivity } from './types';

/** v1 polls; switch to realtime once the feed works end to end (CLAUDE.md). */
const FEED_POLL_MS = 10_000;

/** Start of the feed window as unix seconds. */
const windowStart = (windowSeconds: number) => Math.floor(Date.now() / 1000) - windowSeconds;

/**
 * Per-token totals of buys, sells and launches by `wallets` (lowercase
 * addresses) over the last `windowSeconds`, ranked by `sort` on the indexer and
 * refreshed every 10 seconds while the screen is mounted. Disabled for an empty
 * list: the caller shows activity from everyone instead.
 */
export function useFeed(wallets: readonly string[], windowSeconds: number, sort: FeedSort) {
  const sorted = [...wallets].sort();

  return useQuery({
    queryKey: ['feed', 'activity', 'following', sorted, windowSeconds, sort],
    enabled: sorted.length > 0,
    refetchInterval: FEED_POLL_MS,
    queryFn: async (): Promise<TokenActivity[]> =>
      toTokenActivities(
        await indexerPost<ActivityResponse>('/activity', { since: windowStart(windowSeconds), sort, wallets: sorted }),
      ),
  });
}

/**
 * The same totals for every wallet. Shown while the user is signed out or
 * follows nobody; needs no session.
 */
export function useLatestFeed(enabled: boolean, windowSeconds: number, sort: FeedSort) {
  return useQuery({
    queryKey: ['feed', 'activity', 'everyone', windowSeconds, sort],
    enabled,
    refetchInterval: FEED_POLL_MS,
    queryFn: async (): Promise<TokenActivity[]> =>
      toTokenActivities(
        await indexerPost<ActivityResponse>('/activity', { since: windowStart(windowSeconds), sort }),
      ),
  });
}
