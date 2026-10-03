import type { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { BSC_CHAIN_ID, type Address } from '@repo/shared';
import { createWalletClient, custom, getAddress, numberToHex, type WalletClient } from 'viem';
import { bsc } from 'viem/chains';

type EmbeddedWallets = ReturnType<typeof useEmbeddedEthereumWallet>['wallets'];

/**
 * A viem wallet client for the user's embedded wallet, on BSC. Only called from
 * a confirm button: every transaction it signs is one the user just confirmed.
 */
export async function embeddedWalletClient(
  wallets: EmbeddedWallets,
  action: string,
): Promise<{ account: Address; client: WalletClient }> {
  const wallet = wallets.at(0);
  if (!wallet) throw new Error(`Sign in to ${action}.`);
  const account = getAddress(wallet.address);

  const provider = await wallet.getProvider();
  await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: numberToHex(BSC_CHAIN_ID) }] });

  return { account, client: createWalletClient({ account, chain: bsc, transport: custom(provider) }) };
}
