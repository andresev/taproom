/**
 * Spot-price maths for a PancakeSwap V3 pool, in exact integers.
 *
 * A pool stores `sqrtPriceX96`: the square root of (token1 per token0, in base
 * units), times 2^96. Everything here works from that value with bigint
 * arithmetic, so no price or market cap passes through a float.
 */

const Q192 = 2n ** 192n;

/** Decimals of the fixed-point price returned by {@link spotPriceE36}. */
export const PRICE_DECIMALS = 36;

function assertPrice(sqrtPriceX96: bigint): void {
  if (sqrtPriceX96 <= 0n) throw new RangeError(`Invalid sqrtPriceX96: ${sqrtPriceX96}`);
}

/**
 * What `tokenAmount` (base units of the launched token) is worth in the pair
 * asset (base units) at the pool's spot price. Rounds down. This is a spot
 * valuation, not what a swap of that size would return: it ignores the pool
 * fee and price impact.
 */
export function quoteAtSpot(sqrtPriceX96: bigint, tokenIsToken0: boolean, tokenAmount: bigint): bigint {
  assertPrice(sqrtPriceX96);
  const squared = sqrtPriceX96 * sqrtPriceX96;
  return tokenIsToken0 ? (tokenAmount * squared) / Q192 : (tokenAmount * Q192) / squared;
}

/**
 * Pair asset per one whole token, as a fixed-point integer with
 * {@link PRICE_DECIMALS} decimals. That many decimals keeps the price of a
 * token worth a billionth of a billionth of its pair asset from rounding to zero.
 */
export function spotPriceE36(
  sqrtPriceX96: bigint,
  tokenIsToken0: boolean,
  tokenDecimals: number,
  pairDecimals: number,
): bigint {
  // One whole token, scaled up by 10^36, valued in pair base units, then scaled down by the pair's decimals.
  const scaled = quoteAtSpot(sqrtPriceX96, tokenIsToken0, 10n ** BigInt(tokenDecimals + PRICE_DECIMALS));
  return scaled / 10n ** BigInt(pairDecimals);
}
