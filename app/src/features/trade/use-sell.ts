import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { ADDRESSES, type Address, type TxHash } from '@repo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, getAddress } from 'viem';

import { erc20Abi } from '@/lib/chain/abis/erc20';
import { pancakeQuoterV2Abi } from '@/lib/chain/abis/pancake-quoter-v2';
import { pancakeSwapRouterAbi } from '@/lib/chain/abis/pancake-swap-router';
import { publicClient } from '@/lib/chain/clients';

import { embeddedWalletClient } from './embedded-wallet';
import { buildSellCalls } from './sell';

/** Quotes go stale as the pool trades; refresh while the sell box is open. */
const QUOTE_POLL_MS = 10_000;

/** How much of `token` the wallet holds, in base units. */
export function useTokenBalance(token: Address, wallet: Address | null) {
  return useQuery({
    queryKey: ['token-balance', token, wallet],
    enabled: wallet !== null,
    refetchInterval: 15_000,
    queryFn: (): Promise<bigint> =>
      publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [getAddress(wallet ?? '')],
      }),
  });
}

/** How much of `token` PancakeSwap's router may move for the wallet. */
export function useRouterAllowance(token: Address, wallet: Address | null) {
  return useQuery({
    queryKey: ['router-allowance', token, wallet],
    enabled: wallet !== null,
    queryFn: (): Promise<bigint> =>
      publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [getAddress(wallet ?? ''), ADDRESSES.pancakeV3SwapRouter],
      }),
  });
}

/** How much BNB (wei) `amountIn` of the token fetches right now, from PancakeSwap's quoter. Nothing is sent. */
export function useSellQuote(input: { token: Address; fee: number; amountIn: bigint | null }) {
  const { token, fee, amountIn } = input;

  return useQuery({
    queryKey: ['sell-quote', token, fee, amountIn?.toString() ?? null],
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
        args: [{ tokenIn: token, tokenOut: ADDRESSES.wbnb, amountIn, fee, sqrtPriceLimitX96: 0n }],
      });
      return result[0];
    },
  });
}

/**
 * Lets PancakeSwap's router move exactly `amount` of the token, the step a sell
 * needs first. Its own transaction, sent only from its own confirm button. The
 * allowance is the sell amount, never unlimited.
 */
export function useApproveForSell() {
  const { wallets } = useEmbeddedEthereumWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, amount }: { token: Address; amount: bigint }): Promise<TxHash> => {
      const { account, client } = await embeddedWalletClient(wallets, 'sell');
      const { request } = await publicClient.simulateContract({
        account,
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [ADDRESSES.pancakeV3SwapRouter, amount],
      });
      const hash = await client.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The approval reverted. Nothing was sold.');
      return hash;
    },
    onSuccess: (_hash, { token }) => queryClient.invalidateQueries({ queryKey: ['router-allowance', token] }),
  });
}

export interface SellRequest {
  token: Address;
  fee: number;
  /** Token base units to sell. */
  amountIn: bigint;
  /** The least BNB (wei) the seller accepts, already reduced by their chosen slippage. */
  amountOutMinimum: bigint;
}

/**
 * Sells a token for BNB from the embedded wallet, through PancakeSwap's
 * SwapRouter: the swap and the unwrap to BNB in one `multicall`. Only ever
 * called from the confirm button, after the user has seen the token, amount,
 * minimum received, slippage and safety status.
 *
 * Simulated first, so a sell that would revert (price moved past the minimum,
 * approval missing) fails here with a reason instead of costing gas.
 */
export function useSell() {
  const { wallets } = useEmbeddedEthereumWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, fee, amountIn, amountOutMinimum }: SellRequest): Promise<TxHash> => {
      const { account, client } = await embeddedWalletClient(wallets, 'sell');
      const { swap, unwrap } = buildSellCalls({
        wbnb: ADDRESSES.wbnb,
        token,
        fee,
        seller: account.toLowerCase() as Address,
        amountIn,
        amountOutMinimum,
        nowSeconds: Date.now() / 1000,
      });
      const calls = [
        encodeFunctionData({ abi: pancakeSwapRouterAbi, functionName: 'exactInputSingle', args: [swap] }),
        encodeFunctionData({
          abi: pancakeSwapRouterAbi,
          functionName: 'unwrapWETH9',
          args: [unwrap.amountMinimum, getAddress(unwrap.recipient)],
        }),
      ];
      const { request } = await publicClient.simulateContract({
        account,
        address: ADDRESSES.pancakeV3SwapRouter,
        abi: pancakeSwapRouterAbi,
        functionName: 'multicall',
        args: [calls],
      });

      const hash = await client.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The sell reverted. Your tokens were not sold.');
      return hash;
    },
    onSuccess: (_hash, { token }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['token', token] }),
        queryClient.invalidateQueries({ queryKey: ['token-balance', token] }),
        queryClient.invalidateQueries({ queryKey: ['router-allowance', token] }),
        queryClient.invalidateQueries({ queryKey: ['bnb-balance'] }),
      ]),
  });
}
