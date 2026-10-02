import { parseAbi } from "viem";

/**
 * PancakeSwap V3 SwapRouter's single-pool swap, used only to simulate a buy and
 * a sell for the safety check. Same signature as the app's copy in
 * app/src/lib/chain/abis/pancake-swap-router.ts; see there for its source.
 */
export const pancakeSwapRouterAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);
