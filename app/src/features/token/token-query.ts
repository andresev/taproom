import type { Address, TxHash } from '@repo/shared';

import type { TokenDetails } from './types';

/** How many of the newest trades the token page lists. */
export const RECENT_TRADES = 30;

/** A token, its pools and its newest trades. Bigint columns arrive as strings, block times as unix seconds. */
export const TOKEN_QUERY = /* GraphQL */ `
  query Token($address: String!, $limit: Int!) {
    token(address: $address) {
      address
      symbol
      name
      decimals
      totalSupply
      deployer
      launchTxHash
      launchedAt
    }
    pools(where: { token: $address }) {
      items {
        address
        pairToken
        pairSymbol
        pairDecimals
        fee
      }
    }
    trades(where: { token: $address }, orderBy: "blockTime", orderDirection: "desc", limit: $limit) {
      items {
        id
        txHash
        wallet
        side
        amountBaseUnits
        pairAmountBaseUnits
        blockTime
        poolInfo {
          pairSymbol
          pairDecimals
        }
      }
    }
  }
`;

export interface TokenResponse {
  token: {
    address: string;
    symbol: string | null;
    name: string | null;
    decimals: number;
    totalSupply: string;
    deployer: string;
    launchTxHash: string;
    launchedAt: string;
  } | null;
  pools: {
    items: { address: string; pairToken: string; pairSymbol: string | null; pairDecimals: number; fee: number }[];
  };
  trades: {
    items: {
      id: string;
      txHash: string;
      wallet: string;
      side: 'buy' | 'sell';
      amountBaseUnits: string;
      pairAmountBaseUnits: string;
      blockTime: string;
      poolInfo: { pairSymbol: string | null; pairDecimals: number } | null;
    }[];
  };
}

const fromUnixSeconds = (seconds: string) => new Date(Number(seconds) * 1000);

/**
 * Null when the indexer has no such token: not a Brew token, or one launched
 * before the indexed history. A trade whose pool row is missing is dropped
 * rather than shown with made-up decimals.
 */
export function toTokenDetails(response: TokenResponse): TokenDetails | null {
  const { token } = response;
  if (!token) return null;

  return {
    address: token.address as Address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    totalSupply: BigInt(token.totalSupply),
    deployer: token.deployer as Address,
    launchTxHash: token.launchTxHash as TxHash,
    launchedAt: fromUnixSeconds(token.launchedAt),
    pools: response.pools.items.map((pool) => ({
      address: pool.address as Address,
      pairToken: pool.pairToken as Address,
      pairSymbol: pool.pairSymbol,
      pairDecimals: pool.pairDecimals,
      fee: pool.fee,
    })),
    recentTrades: response.trades.items.flatMap((trade) =>
      trade.poolInfo
        ? [
            {
              id: trade.id,
              txHash: trade.txHash as TxHash,
              wallet: trade.wallet as Address,
              side: trade.side,
              amountBaseUnits: BigInt(trade.amountBaseUnits),
              pairAmountBaseUnits: BigInt(trade.pairAmountBaseUnits),
              pairSymbol: trade.poolInfo.pairSymbol,
              pairDecimals: trade.poolInfo.pairDecimals,
              time: fromUnixSeconds(trade.blockTime),
            },
          ]
        : [],
    ),
  };
}
