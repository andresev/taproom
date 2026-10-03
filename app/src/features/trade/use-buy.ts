import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { ADDRESSES, type Address, type TxHash } from '@repo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAddress } from 'viem';

import { pancakeSwapRouterAbi } from '@/lib/chain/abis/pancake-swap-router';
import { publicClient } from '@/lib/chain/clients';

import { buildBuyParams } from './buy';
import { embeddedWalletClient } from './embedded-wallet';

/** The signed-in user's embedded wallet address, or null when there is none (signed out, or still loading). */
export function useWalletAddress(): Address | null {
  const { wallets } = useEmbeddedEthereumWallet();
  const address = wallets.at(0)?.address;
  return address ? (address.toLowerCase() as Address) : null;
}

/** The wallet's BNB balance in wei, refreshed with the quote. */
export function useBnbBalance(address: Address | null) {
  return useQuery({
    queryKey: ['bnb-balance', address],
    enabled: address !== null,
    refetchInterval: 15_000,
    queryFn: async (): Promise<bigint> => publicClient.getBalance({ address: getAddress(address ?? '') }),
  });
}

export interface BuyRequest {
  token: Address;
  fee: number;
  /** Wei of BNB to spend. */
  amountIn: bigint;
  /** The least the buyer accepts, already reduced by their chosen slippage. */
  amountOutMinimum: bigint;
}

/**
 * Buys a token with BNB from the embedded wallet, through PancakeSwap's
 * SwapRouter. Only ever called from the confirm button, after the user has
 * seen the token, amount, minimum received, slippage and safety status.
 *
 * The swap is simulated first, so one that would revert (price moved past the
 * minimum, not enough BNB) fails here with a reason instead of costing gas.
 */
export function useBuy() {
  const { wallets } = useEmbeddedEthereumWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, fee, amountIn, amountOutMinimum }: BuyRequest): Promise<TxHash> => {
      const { account, client } = await embeddedWalletClient(wallets, 'buy');

      const params = buildBuyParams({
        wbnb: ADDRESSES.wbnb,
        token,
        fee,
        recipient: account,
        amountIn,
        amountOutMinimum,
        nowSeconds: Date.now() / 1000,
      });
      const { request } = await publicClient.simulateContract({
        account,
        address: ADDRESSES.pancakeV3SwapRouter,
        abi: pancakeSwapRouterAbi,
        functionName: 'exactInputSingle',
        args: [params],
        value: amountIn,
      });

      const hash = await client.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('The swap reverted. Your BNB was not exchanged.');
      return hash;
    },
    onSuccess: (_hash, { token }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['token', token] }),
        queryClient.invalidateQueries({ queryKey: ['bnb-balance'] }),
      ]),
  });
}
