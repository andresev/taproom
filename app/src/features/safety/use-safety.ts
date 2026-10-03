import type { Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { indexerPost } from '@/lib/api/indexer';

import type { SafetyFacts } from './facts';
import { checksFromFacts } from './rules';
import { scoreToken } from './score';
import type { SafetyScore } from './types';

/** The indexer caches facts for a minute, so asking more often gains nothing. */
const SAFETY_STALE_MS = 60_000;

/** A feed shows many tokens at once, so its rows refresh their score far less often. */
const SAFETY_FEED_STALE_MS = 5 * 60_000;

/**
 * A token's safety score, from the facts the indexer's /safety route gathers.
 *
 * `score` is null only while the first fetch is in flight. If the fetch fails
 * it is still a score: every input becomes Unknown, which scores as Caution,
 * never as Safe.
 *
 * `live` (the default) keeps the score fresh for a screen where the user can
 * trade. Feed rows pass `live: false`: they fetch once and keep it for five minutes.
 */
export function useSafety(token: Address, { live = true }: { live?: boolean } = {}): { score: SafetyScore | null } {
  const facts = useQuery({
    queryKey: ['safety', token],
    staleTime: live ? SAFETY_STALE_MS : SAFETY_FEED_STALE_MS,
    refetchInterval: live ? SAFETY_STALE_MS : false,
    queryFn: () => indexerPost<SafetyFacts>('/safety', { token }),
  });

  if (facts.isPending) return { score: null };
  return { score: scoreToken(checksFromFacts(facts.data ?? null)) };
}
