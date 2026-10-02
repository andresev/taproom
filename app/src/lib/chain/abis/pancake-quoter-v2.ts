import { parseAbi } from 'viem';

/**
 * PancakeSwap QuoterV2. From the published source (pancake-v3-contracts,
 * v3-periphery/contracts/interfaces/IQuoterV2.sol). It is not a view function:
 * it is only ever called with `eth_call` (viem's `simulateContract`), never sent.
 */
export const pancakeQuoterV2Abi = parseAbi([
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
]);
