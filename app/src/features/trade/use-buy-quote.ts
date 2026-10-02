import { ADDRESSES, type Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { pancakeQuoterV2Abi } from '@/lib/chain/abis/pancake-quoter-v2';
import { publicClient } from '@/lib/chain/clients';

/** Quotes go stale as the pool trades; refresh while the buy box is open. */
const QUOTE_POLL_MS = 10_000;

/**
 * How many tokens `amountIn` wei of BNB buys right now, from PancakeSwap's
 * quoter (an `eth_call`; nothing is sent). Disabled until there is an amount.
 */
export function useBuyQuote(input: { token: Address; fee: number; amountIn: bigint | null }) {
  const { token, fee, amountIn } = input;

  return useQuery({
    queryKey: ['buy-quote', token, fee, amountIn?.toString() ?? null],
    enabled: amountIn !== null,
    refetchInterval: QUOTE_POLL_MS,
    // A failed quote usually means the pool cannot fill this size; retrying at once will not help.
    retry: false,
    queryFn: async (): Promise<bigint> => {
      if (amountIn === null) throw new Error('No amount to quote.');
      const { result } = await publicClient.simulateContract({
        address: ADDRESSES.pancakeV3Quoter,
        abi: pancakeQuoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [{ tokenIn: ADDRESSES.wbnb, tokenOut: token, amountIn, fee, sqrtPriceLimitX96: 0n }],
      });
      return result[0];
    },
  });
}
