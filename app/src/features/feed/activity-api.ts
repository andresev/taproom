import type { Address } from '@repo/shared';

import type { TokenActivity } from './types';

/**
 * One row of the indexer's POST /activity response (indexer/src/activity.ts).
 * Amounts are base-unit integers as strings; times are unix seconds.
 */
export interface ActivityRow {
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  buys: number;
  sells: number;
  volume: { pairSymbol: string | null; pairDecimals: number; bought: string; sold: string } | null;
  walletCount: number;
  wallets: string[];
  launch: { wallet: string; time: number } | null;
  lastTime: number;
}

export interface ActivityResponse {
  items: ActivityRow[];
}

/** Share of `bought` in `bought + sold`, 0 to 1, without losing bigint precision first. */
function share(bought: bigint, sold: bigint): number | null {
  const total = bought + sold;
  if (total === 0n) return null;
  return Number((bought * 10_000n) / total) / 10_000;
}

const fromUnixSeconds = (seconds: number) => new Date(seconds * 1000);

/** Indexer rows to feed rows: exact bigint amounts, dates, and the buy share the bar draws. */
export function toTokenActivities(response: ActivityResponse): TokenActivity[] {
  return response.items.map((row) => {
    const volume = row.volume
      ? {
          pairSymbol: row.volume.pairSymbol,
          pairDecimals: row.volume.pairDecimals,
          bought: BigInt(row.volume.bought),
          sold: BigInt(row.volume.sold),
        }
      : null;
    const byCount = share(BigInt(row.buys), BigInt(row.sells));

    return {
      tokenAddress: row.tokenAddress as Address,
      tokenSymbol: row.tokenSymbol,
      tokenName: row.tokenName,
      buys: row.buys,
      sells: row.sells,
      buyShare: volume ? (share(volume.bought, volume.sold) ?? byCount) : byCount,
      volume,
      walletCount: row.walletCount,
      wallets: row.wallets as Address[],
      launch: row.launch ? { wallet: row.launch.wallet as Address, time: fromUnixSeconds(row.launch.time) } : null,
      lastTime: fromUnixSeconds(row.lastTime),
    };
  });
}
