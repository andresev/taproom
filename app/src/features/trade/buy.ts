import { PRICE_DECIMALS, toBaseUnits, type Address } from '@repo/shared';

import { MAX_SLIPPAGE_BPS } from './slippage';

/**
 * Pure maths for a buy. No I/O: everything here is unit-tested, and it is the
 * only place that turns a quote into the numbers a user confirms.
 */

/** How long a signed swap stays valid. After this the router rejects it instead of filling at a stale price. */
export const SWAP_DEADLINE_SECONDS = 5 * 60;

const BNB_DECIMALS = 18;
const BPS = 10_000n;

/** The amount typed into the buy box, in wei. Null for anything that is not a positive BNB amount. */
export function parseBnbAmount(text: string): bigint | null {
  try {
    const wei = toBaseUnits(text.trim(), BNB_DECIMALS);
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

/**
 * The least the buyer accepts: the quoted amount less the slippage allowance,
 * rounded down. The router reverts the swap if it would deliver less.
 */
export function minimumReceived(quotedAmountOut: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > MAX_SLIPPAGE_BPS) {
    throw new RangeError(`Invalid slippage: ${slippageBps} bps`);
  }
  if (quotedAmountOut < 0n) throw new RangeError('Quoted amount cannot be negative');
  return (quotedAmountOut * (BPS - BigInt(slippageBps))) / BPS;
}

/**
 * How much worse the quote is than the pool's spot price, in basis points,
 * pool fee included. On a thin pool a small buy can move the price a lot, and
 * this is the number that shows it. Null when there is no spot price to compare.
 */
export function priceImpactBps(
  amountIn: bigint,
  quotedAmountOut: bigint,
  spotPriceE36: bigint,
  tokenDecimals: number,
  pairDecimals: number,
): number | null {
  if (amountIn <= 0n || spotPriceE36 <= 0n) return null;
  // What `amountIn` would buy at the spot price with no fee and no price movement.
  const atSpot =
    (amountIn * 10n ** BigInt(PRICE_DECIMALS + tokenDecimals)) / (spotPriceE36 * 10n ** BigInt(pairDecimals));
  if (atSpot <= 0n) return null;
  if (quotedAmountOut >= atSpot) return 0;
  return Number(((atSpot - quotedAmountOut) * BPS) / atSpot);
}

export interface BuyParams {
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
 * The router's `exactInputSingle` argument for buying `token` with BNB.
 * `nowSeconds` is passed in so the deadline is testable.
 */
export function buildBuyParams(input: {
  wbnb: Address;
  token: Address;
  fee: number;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  nowSeconds: number;
}): BuyParams {
  if (input.amountIn <= 0n) throw new RangeError('Amount must be positive');
  // A zero minimum would accept any price at all; refuse to build that swap.
  if (input.amountOutMinimum <= 0n) throw new RangeError('Minimum received must be positive');
  return {
    tokenIn: input.wbnb,
    tokenOut: input.token,
    fee: input.fee,
    recipient: input.recipient,
    deadline: BigInt(Math.floor(input.nowSeconds) + SWAP_DEADLINE_SECONDS),
    amountIn: input.amountIn,
    amountOutMinimum: input.amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  };
}
