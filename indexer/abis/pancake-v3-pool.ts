import { parseAbi } from "viem";

/**
 * PancakeSwap V3 pool. Its Swap event has two more fields than Uniswap V3's
 * (the protocol fee amounts), so the Uniswap ABI must not be used here. Checked
 * by decoding the swap in the launch transaction linked from brew-factory.ts.
 *
 * Amounts are from the pool's side: positive means the pool received that token.
 */
export const pancakeV3PoolAbi = parseAbi([
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint128 protocolFeesToken0, uint128 protocolFeesToken1)",
]);

/**
 * The pool's fee tier, in hundredths of a basis point. Read for multi-pair v2
 * pools, whose PoolAdded event does not carry it. Checked on a live pool.
 */
export const pancakeV3PoolFeeAbi = parseAbi(["function fee() view returns (uint24)"]);
