import type { Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { indexerPost } from '@/lib/api/indexer';

import type { SafetyFacts } from './facts';
import { checksFromFacts } from './rules';
import { scoreToken } from './score';
import type { SafetyScore } from './types';

/** The indexer caches facts for a minute, so asking more often gains nothing. */
const SAFETY_STALE_MS = 60_000;

/**
 * A token's safety score. `topTenHolderShare` comes from the token page's own
 * data; the rest comes from the indexer's /safety route.
 *
 * `score` is null only while the first fetch is in flight. If the fetch fails
 * it is still a score: every input the indexer supplies becomes Unknown, which
 * scores as Caution, never as Safe.
 */
export function useSafety(token: Address, topTenHolderShare: number | null): { score: SafetyScore | null } {
  const facts = useQuery({
    queryKey: ['safety', token],
    staleTime: SAFETY_STALE_MS,
    refetchInterval: SAFETY_STALE_MS,
    queryFn: () => indexerPost<SafetyFacts>('/safety', { token }),
  });

  if (facts.isPending) return { score: null };
  return { score: scoreToken(checksFromFacts(facts.data ?? null, topTenHolderShare)) };
}
