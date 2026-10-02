import { SafetyBadge } from '@/features/safety/safety-badge';
import { useSafety } from '@/features/safety/use-safety';

import { BURN_ADDRESS, topTenShare } from './holders';
import type { TokenDetails } from './types';

/** The token page's safety badge: the score and every reason behind it. */
export function TokenSafety({ token }: { token: TokenDetails }) {
  // Without an indexed holder count the largest-holders list cannot be trusted to be complete.
  const holderShare =
    token.holderCount === null
      ? null
      : topTenShare(
          token.largestHolders,
          [...token.pools.map((pool) => pool.address), BURN_ADDRESS],
          token.totalSupply,
        );
  const { score } = useSafety(token.address, holderShare);

  return <SafetyBadge score={score} />;
}
