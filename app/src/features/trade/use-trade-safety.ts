import { useSafety } from '@/features/safety/use-safety';
import { BURN_ADDRESS, topTenShare } from '@/features/token/holders';
import type { TokenDetails } from '@/features/token/types';
import { useTokenMarket } from '@/features/token/use-token-market';

/**
 * The safety score a buy or sell review shows before its confirm button. The
 * holder share uses the live total supply when it has been read.
 */
export function useTradeSafety(token: TokenDetails) {
  const market = useTokenMarket(token);
  const holderShare =
    token.holderCount === null
      ? null
      : topTenShare(
          token.largestHolders,
          [...token.pools.map((item) => item.address), BURN_ADDRESS],
          market.data?.totalSupply ?? token.totalSupply,
        );
  return useSafety(token.address, holderShare);
}
