import type { Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { getAddress } from 'viem';

import { indexerGraphql } from '@/lib/api/indexer';
import { erc20Abi } from '@/lib/chain/abis/erc20';
import { pancakeV3PoolAbi } from '@/lib/chain/abis/pancake-v3-pool';
import { publicClient } from '@/lib/chain/clients';

import { buildPortfolio, valuationPool, type HeldToken, type LiveRead, type Portfolio } from './portfolio';

/** Balances and prices move with every trade; the same pace as a token's market figures. */
const PORTFOLIO_POLL_MS = 15_000;
/** The most tokens listed. A wallet holding more says so. */
export const PORTFOLIO_LIMIT = 200;

const HOLDINGS_QUERY = /* GraphQL */ `
  query Holdings($wallet: String!, $limit: Int!) {
    holders(where: { holder: $wallet, balance_gt: "0" }, orderBy: "balance", orderDirection: "desc", limit: $limit) {
      items {
        token
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const TOKENS_QUERY = /* GraphQL */ `
  query HeldTokens($tokens: [String!]!) {
    tokens(where: { address_in: $tokens }, limit: 1000) {
      items {
        address
        symbol
        name
        decimals
      }
    }
    pools(where: { token_in: $tokens }, limit: 1000) {
      items {
        address
        token
        pairToken
        pairSymbol
        pairDecimals
        tokenIsToken0
      }
    }
  }
`;

interface HoldingsResponse {
  holders: { items: { token: string }[]; pageInfo: { hasNextPage: boolean } };
}

interface TokensResponse {
  tokens: { items: { address: string; symbol: string | null; name: string | null; decimals: number }[] };
  pools: {
    items: {
      address: string;
      token: string;
      pairToken: string;
      pairSymbol: string | null;
      pairDecimals: number;
      tokenIsToken0: boolean;
    }[];
  };
}

export interface PortfolioView extends Portfolio {
  /** True when the wallet holds more indexed tokens than PORTFOLIO_LIMIT. */
  more: boolean;
}

/**
 * The wallet's Brew tokens. The indexer says which tokens the wallet holds;
 * the balance and price of each are then read live from the chain, so what is
 * shown is current even if the indexer is behind.
 */
export function usePortfolio(wallet: Address | null) {
  return useQuery({
    queryKey: ['portfolio', wallet],
    enabled: wallet !== null,
    refetchInterval: PORTFOLIO_POLL_MS,
    queryFn: async (): Promise<PortfolioView> => {
      if (wallet === null) throw new Error('No wallet.');
      const held = await indexerGraphql<HoldingsResponse>(HOLDINGS_QUERY, { wallet, limit: PORTFOLIO_LIMIT });
      const tokens = held.holders.items.map((item) => item.token);
      if (tokens.length === 0) return { holdings: [], totals: [], unvalued: 0, more: false };

      const details = await indexerGraphql<TokensResponse>(TOKENS_QUERY, { tokens });
      const heldTokens: HeldToken[] = details.tokens.items.map((token) => ({
        token: token.address as Address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        pools: details.pools.items
          .filter((pool) => pool.token === token.address)
          .map((pool) => ({
            address: pool.address as Address,
            pairToken: pool.pairToken as Address,
            pairSymbol: pool.pairSymbol,
            pairDecimals: pool.pairDecimals,
            tokenIsToken0: pool.tokenIsToken0,
          })),
      }));

      // One multicall: each token's balance, then each valuation pool's price.
      const owner = getAddress(wallet);
      const balanceCalls = heldTokens.map(
        (token) => ({ address: token.token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }) as const,
      );
      const pools = heldTokens.map((token) => valuationPool(token.pools));
      const priceCalls = pools
        .filter((pool) => pool !== null)
        .map((pool) => ({ address: pool.address, abi: pancakeV3PoolAbi, functionName: 'slot0' }) as const);
      const [balances, prices] = await Promise.all([
        publicClient.multicall({ allowFailure: true, contracts: balanceCalls }),
        publicClient.multicall({ allowFailure: true, contracts: priceCalls }),
      ]);

      const reads = new Map<Address, LiveRead>();
      let priceIndex = 0;
      heldTokens.forEach((token, index) => {
        const balance = balances[index];
        let sqrtPriceX96: bigint | null = null;
        if (pools[index] !== null) {
          const price = prices[priceIndex++];
          sqrtPriceX96 = price?.status === 'success' ? price.result[0] : null;
        }
        reads.set(token.token, {
          balance: balance?.status === 'success' ? balance.result : null,
          sqrtPriceX96,
        });
      });

      return { ...buildPortfolio(heldTokens, reads), more: held.holders.pageInfo.hasNextPage };
    },
  });
}
