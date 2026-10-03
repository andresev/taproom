import { PRICE_DECIMALS, toBaseUnits, type Address } from '@repo/shared';

import { SWAP_DEADLINE_SECONDS } from './buy';

/**
 * Pure maths for a sell: a token back into BNB. No I/O: everything here is
 * unit-tested, and it is the only place that turns a quote into the numbers a
 * user confirms (docs/0017).
 */

const BPS = 10_000n;
/** The router sends the swap's WBNB to itself when the recipient is the zero address, then unwraps it. */
const ROUTER_KEEPS_OUTPUT = '0x0000000000000000000000000000000000000000' as Address;

/** The amount typed into the sell box, in the token's base units. Null unless it is positive and fits the token. */
export function parseTokenAmount(text: string, decimals: number): bigint | null {
  try {
    const units = toBaseUnits(text.trim(), decimals);
    return units > 0n ? units : null;
  } catch {
    return null;
  }
}

/** A share of a balance, rounded down: 2,500 bps is a quarter. 10,000 is exactly the balance, nothing left over. */
export function portionOf(balance: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps <= 0 || bps > 10_000) throw new RangeError(`Invalid share: ${bps} bps`);
  return bps === 10_000 ? balance : (balance * BigInt(bps)) / BPS;
}

/**
 * How much less the quote pays than the tokens are worth at the pool's spot
 * price, in basis points, pool fee included. Null when there is no spot price.
 */
export function sellPriceImpactBps(
  amountIn: bigint,
  quotedAmountOut: bigint,
  spotPriceE36: bigint,
  tokenDecimals: number,
  pairDecimals: number,
): number | null {
  if (amountIn <= 0n || spotPriceE36 <= 0n) return null;
  // What `amountIn` would fetch at the spot price with no fee and no price movement.
  const atSpot =
    (amountIn * spotPriceE36 * 10n ** BigInt(pairDecimals)) / 10n ** BigInt(PRICE_DECIMALS + tokenDecimals);
  if (atSpot <= 0n) return null;
  if (quotedAmountOut >= atSpot) return 0;
  return Number(((atSpot - quotedAmountOut) * BPS) / atSpot);
}

export interface SellSwapParams {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  recipient: Address;
  deadline: bigint;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
}

/**
 * The two router calls of one sell, sent together through the router's
 * `multicall`: swap the token for WBNB, kept by the router, then unwrap it and
 * pay the seller BNB. Both carry the same minimum, so the sell reverts if the
 * seller would get less. `nowSeconds` is passed in so the deadline is testable.
 */
export function buildSellCalls(input: {
  wbnb: Address;
  token: Address;
  fee: number;
  seller: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  nowSeconds: number;
}): { swap: SellSwapParams; unwrap: { amountMinimum: bigint; recipient: Address } } {
  if (input.amountIn <= 0n) throw new RangeError('Amount must be positive');
  // A zero minimum would accept any price at all; refuse to build that sell.
  if (input.amountOutMinimum <= 0n) throw new RangeError('Minimum received must be positive');
  return {
    swap: {
      tokenIn: input.token,
      tokenOut: input.wbnb,
      fee: input.fee,
      recipient: ROUTER_KEEPS_OUTPUT,
      deadline: BigInt(Math.floor(input.nowSeconds) + SWAP_DEADLINE_SECONDS),
      amountIn: input.amountIn,
      amountOutMinimum: input.amountOutMinimum,
      sqrtPriceLimitX96: 0n,
    },
    unwrap: { amountMinimum: input.amountOutMinimum, recipient: input.seller },
  };
}

/** Whether the router may already move `amountIn` of the token for the seller, so no approval is needed first. */
export function isApproved(allowance: bigint, amountIn: bigint): boolean {
  return allowance >= amountIn;
}
