import type { Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { toTokenActivities, type ActivityResponse } from '@/features/feed/activity-api';
import type { TokenActivity } from '@/features/feed/types';
import { indexerGraphql, indexerPost } from '@/lib/api/indexer';

import { RECENT_TRADES, TOKEN_QUERY, toTokenDetails, type TokenResponse } from './token-query';
import type { TokenDetails } from './types';

/** Same cadence as the feed. */
const TOKEN_POLL_MS = 10_000;

/** A token, its pools and newest trades, refreshed every 10 seconds. Null if the indexer has no such token. */
export function useToken(address: Address) {
  return useQuery({
    queryKey: ['token', address],
    refetchInterval: TOKEN_POLL_MS,
    queryFn: async (): Promise<TokenDetails | null> =>
      toTokenDetails(await indexerGraphql<TokenResponse>(TOKEN_QUERY, { address, limit: RECENT_TRADES })),
  });
}

/**
 * One token's buy and sell totals over the last `windowSeconds`. Null when it
 * had no trades and was not launched in that window.
 */
export function useTokenActivity(address: Address, windowSeconds: number) {
  return useQuery({
    queryKey: ['token', address, 'activity', windowSeconds],
    refetchInterval: TOKEN_POLL_MS,
    queryFn: async (): Promise<TokenActivity | null> => {
      const since = Math.floor(Date.now() / 1000) - windowSeconds;
      const response = await indexerPost<ActivityResponse>('/activity', { since, sort: 'latest', token: address });
      return toTokenActivities(response)[0] ?? null;
    },
  });
}
