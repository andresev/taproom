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

/**
 * The pool's `slot0`, for the price now. PancakeSwap's `feeProtocol` is a uint32,
 * not Uniswap's uint8; same ABI as app/src/lib/chain/abis/pancake-v3-pool.ts,
 * which was checked against a live Brew pool.
 */
export const pancakeV3PoolSlot0Abi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)",
]);
