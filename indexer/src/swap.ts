import type { TradeSide } from "@repo/shared";

/**
 * Pure helpers that turn a PancakeSwap V3 Swap event into a trade of a Brew
 * token. No I/O, so they are unit-tested with fixtures from real transactions.
 */

/**
 * V3 pools order their two tokens by address: the numerically lower one is
 * token0. Returns whether `token` is the pool's token0 when paired with `pairToken`.
 */
export function isToken0(token: `0x${string}`, pairToken: `0x${string}`): boolean {
  const a = BigInt(token);
  const b = BigInt(pairToken);
  if (a === b) throw new Error(`A pool cannot pair ${token} with itself`);
  return a < b;
}

export interface SwapAmounts {
  /** Signed, from the pool's side: positive means the pool received token0. */
  amount0: bigint;
  amount1: bigint;
}

export interface TradeAmounts {
  side: TradeSide;
  /** Brew token bought or sold, base units, always positive. */
  amountBaseUnits: bigint;
  /** Pair token paid (buy) or received (sell), base units, always positive. */
  pairAmountBaseUnits: bigint;
}

/**
 * The trade a swap represents for the pool's Brew token. The pool sending the
 * token out is a buy; the pool taking it in is a sell. Returns null for a swap
 * that moved none of the token, or whose two amounts do not point in opposite
 * directions, since neither is a buy or a sell.
 */
export function tradeFromSwap(tokenIsToken0: boolean, { amount0, amount1 }: SwapAmounts): TradeAmounts | null {
  const tokenDelta = tokenIsToken0 ? amount0 : amount1;
  const pairDelta = tokenIsToken0 ? amount1 : amount0;

  if (tokenDelta < 0n && pairDelta > 0n) {
    return { side: "buy", amountBaseUnits: -tokenDelta, pairAmountBaseUnits: pairDelta };
  }
  if (tokenDelta > 0n && pairDelta < 0n) {
    return { side: "sell", amountBaseUnits: tokenDelta, pairAmountBaseUnits: -pairDelta };
  }
  return null;
}

/** Primary key of a trade: one transaction can contain several swaps. */
export function tradeId(txHash: `0x${string}`, logIndex: number): string {
  return `${txHash.toLowerCase()}-${logIndex}`;
}
