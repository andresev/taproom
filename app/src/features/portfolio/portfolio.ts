import { ADDRESSES, quoteAtSpot, type Address } from '@repo/shared';

/**
 * Pure maths for the Portfolio tab: which indexed Brew tokens the wallet holds,
 * read live, and what they are worth at each pool's current price. Values are in
 * each token's pair asset and are only ever added within the same pair asset.
 */

export interface HeldPool {
  address: Address;
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  tokenIsToken0: boolean;
}

/** A token the indexer says the wallet holds, with its pools. */
export interface HeldToken {
  token: Address;
  symbol: string | null;
  name: string | null;
  decimals: number;
  pools: HeldPool[];
}

/** What was read from the chain for one token. Null where the read failed. */
export interface LiveRead {
  balance: bigint | null;
  sqrtPriceX96: bigint | null;
}

export interface Holding {
  token: Address;
  symbol: string | null;
  name: string | null;
  decimals: number;
  /** Null when the live read failed: shown as unknown, never as zero. */
  balance: bigint | null;
  /** The balance at the pool's current price, in its pair asset. Null when unknown. */
  value: { pairToken: Address; pairSymbol: string | null; pairDecimals: number; amount: bigint } | null;
}

export interface PairTotal {
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  /** Sum of the holdings valued in this pair asset. */
  amount: bigint;
  holdings: number;
}

export interface Portfolio {
  holdings: Holding[];
  /** One per pair asset, largest first by number of holdings. Never added together. */
  totals: PairTotal[];
  /** Holdings whose value could not be worked out, so the totals leave them out. */
  unvalued: number;
}

/**
 * The pool a holding is valued in: the WBNB pool when the token has one, since
 * that is the pool it can be sold through (docs/0017), otherwise its first pool.
 */
export function valuationPool(pools: HeldPool[]): HeldPool | null {
  return pools.find((pool) => pool.pairToken === ADDRESSES.wbnb) ?? pools[0] ?? null;
}

export function buildPortfolio(held: HeldToken[], reads: Map<Address, LiveRead>): Portfolio {
  const holdings: Holding[] = [];
  for (const token of held) {
    const read = reads.get(token.token) ?? { balance: null, sqrtPriceX96: null };
    // Sold since the indexer last saw it: not a holding any more.
    if (read.balance === 0n) continue;
    const pool = valuationPool(token.pools);
    const value =
      pool && read.balance !== null && read.sqrtPriceX96 !== null && read.sqrtPriceX96 > 0n
        ? {
            pairToken: pool.pairToken,
            pairSymbol: pool.pairSymbol,
            pairDecimals: pool.pairDecimals,
            amount: quoteAtSpot(read.sqrtPriceX96, pool.tokenIsToken0, read.balance),
          }
        : null;
    holdings.push({ token: token.token, symbol: token.symbol, name: token.name, decimals: token.decimals, balance: read.balance, value });
  }

  const totals = new Map<Address, PairTotal>();
  for (const holding of holdings) {
    if (!holding.value) continue;
    const total = totals.get(holding.value.pairToken) ?? {
      pairToken: holding.value.pairToken,
      pairSymbol: holding.value.pairSymbol,
      pairDecimals: holding.value.pairDecimals,
      amount: 0n,
      holdings: 0,
    };
    total.amount += holding.value.amount;
    total.holdings += 1;
    totals.set(holding.value.pairToken, total);
  }

  const orderedTotals = [...totals.values()].sort(
    (a, b) => b.holdings - a.holdings || (a.pairToken < b.pairToken ? -1 : 1),
  );
  const rank = new Map(orderedTotals.map((total, index) => [total.pairToken, index]));
  // Grouped by pair asset in the totals' order, largest value first within each; unvalued last.
  holdings.sort((a, b) => {
    if (!a.value || !b.value) return a.value ? -1 : b.value ? 1 : (a.token < b.token ? -1 : 1);
    const byPair = (rank.get(a.value.pairToken) ?? 0) - (rank.get(b.value.pairToken) ?? 0);
    if (byPair !== 0) return byPair;
    return a.value.amount === b.value.amount ? (a.token < b.token ? -1 : 1) : a.value.amount > b.value.amount ? -1 : 1;
  });

  return { holdings, totals: orderedTotals, unvalued: holdings.filter((holding) => !holding.value).length };
}
