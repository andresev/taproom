import { quoteAtSpot, spotPriceE36 } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { erc20Abi } from '@/lib/chain/abis/erc20';
import { pancakeV3PoolAbi } from '@/lib/chain/abis/pancake-v3-pool';
import { publicClient } from '@/lib/chain/clients';

import type { TokenDetails, TokenPool } from './types';

/** Prices move with every swap; a little slower than the trade list is plenty. */
const MARKET_POLL_MS = 15_000;

/**
 * A token's live market figures, read straight from the chain. Each is null on
 * its own if its read failed: an unknown figure is shown as unknown, never as zero.
 */
export interface TokenMarket {
  pool: TokenPool;
  /** Pair asset per whole token, fixed point with 36 decimals (shared/src/price.ts). */
  priceE36: bigint | null;
  /** Spot price times current total supply, in pair-asset base units. */
  marketCap: bigint | null;
  /** Current total supply, base units. */
  totalSupply: bigint | null;
  /** What the pool holds right now, base units of each side. */
  poolPairBalance: bigint | null;
  poolTokenBalance: bigint | null;
}

/**
 * Price, market cap and pool balances for the token's first pool, in one
 * multicall. Disabled when the token has no pool.
 */
export function useTokenMarket(token: TokenDetails) {
  const [pool] = token.pools;

  return useQuery({
    queryKey: ['token', token.address, 'market', pool?.address],
    enabled: pool !== undefined,
    refetchInterval: MARKET_POLL_MS,
    queryFn: async (): Promise<TokenMarket | null> => {
      if (!pool) return null;
      const [slot0, supply, tokenBalance, pairBalance] = await publicClient.multicall({
        allowFailure: true,
        contracts: [
          { address: pool.address, abi: pancakeV3PoolAbi, functionName: 'slot0' },
          { address: token.address, abi: erc20Abi, functionName: 'totalSupply' },
          { address: token.address, abi: erc20Abi, functionName: 'balanceOf', args: [pool.address] },
          { address: pool.pairToken, abi: erc20Abi, functionName: 'balanceOf', args: [pool.address] },
        ],
      });

      const sqrtPriceX96 = slot0.status === 'success' && slot0.result[0] > 0n ? slot0.result[0] : null;
      const totalSupply = supply.status === 'success' ? supply.result : null;

      return {
        pool,
        priceE36:
          sqrtPriceX96 === null
            ? null
            : spotPriceE36(sqrtPriceX96, pool.tokenIsToken0, token.decimals, pool.pairDecimals),
        marketCap:
          sqrtPriceX96 === null || totalSupply === null
            ? null
            : quoteAtSpot(sqrtPriceX96, pool.tokenIsToken0, totalSupply),
        totalSupply,
        poolPairBalance: pairBalance.status === 'success' ? pairBalance.result : null,
        poolTokenBalance: tokenBalance.status === 'success' ? tokenBalance.result : null,
      };
    },
  });
}
