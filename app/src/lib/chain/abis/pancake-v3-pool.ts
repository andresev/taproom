import { parseAbi } from 'viem';

/**
 * PancakeSwap V3 pool's `slot0`. Its `feeProtocol` is a uint32, where Uniswap
 * V3's is a uint8, so the Uniswap ABI fails to decode it. Checked against a
 * live Brew pool (0x2bf04ebf…8695), which returned feeProtocol 209718400.
 */
export const pancakeV3PoolAbi = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
]);
