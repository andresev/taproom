import { parseAbi } from 'viem';

/**
 * PancakeSwap V3 SwapRouter: the one swap the app makes. From the published
 * source (pancake-v3-contracts, v3-periphery/contracts/interfaces/ISwapRouter.sol)
 * and checked by simulating a buy against the live contract.
 *
 * Paying with BNB: send the BNB as the transaction value and name WBNB as
 * `tokenIn`; the router wraps it.
 */
export const pancakeSwapRouterAbi = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
