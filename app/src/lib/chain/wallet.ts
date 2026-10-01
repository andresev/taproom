import '@walletconnect/react-native-compat';

import { createAppKit } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';
import { bsc } from 'wagmi/chains';

import { appKitStorage } from './appkit-storage';

/**
 * Wallet connection (Reown AppKit over WalletConnect, with wagmi). The app only
 * ever asks a wallet to sign; it never sees a private key or seed phrase.
 *
 * Both values are public and ship in the bundle. Unlike the Supabase client,
 * missing values do not throw at import: the rest of the app works without a
 * wallet, and the Profile screen reports what is missing.
 */
const projectId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID ?? '';

/** The app's public origin: AppKit metadata and the sign-in message's URI (see lib/chain/siwe). */
export const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? '';

/** Names of the env vars that must be set before a wallet can connect; empty when ready. */
export const missingWalletEnv: readonly string[] = [
  ...(projectId ? [] : ['EXPO_PUBLIC_REOWN_PROJECT_ID']),
  ...(appUrl ? [] : ['EXPO_PUBLIC_APP_URL']),
];

export const wagmiAdapter = new WagmiAdapter({ projectId, networks: [bsc] });

export const appKit = createAppKit({
  projectId,
  networks: [bsc],
  defaultNetwork: bsc,
  adapters: [wagmiAdapter],
  storage: appKitStorage,
  metadata: {
    name: 'Taproom',
    description: 'Social trading for Brew tokens on BNB Smart Chain. Not affiliated with Brew.',
    url: appUrl,
    icons: [],
    redirect: { native: 'taproom://' },
  },
  // Swaps go through Taproom's own flow so the safety score is always shown before
  // signing. Social logins create embedded wallets, which is outside the no-custody rule.
  features: { swaps: false, onramp: false, socials: false },
});
