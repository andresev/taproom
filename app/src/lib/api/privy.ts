import { bsc } from 'viem/chains';

/**
 * Privy configuration for the embedded wallet (docs/0007). Both IDs are public
 * and ship in the bundle. The Privy app secret is never used by the app.
 */
const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;

if (!appId || !clientId) {
  throw new Error('Missing EXPO_PUBLIC_PRIVY_APP_ID / EXPO_PUBLIC_PRIVY_CLIENT_ID — see app/.env.example');
}

export const privyAppId = appId;
export const privyClientId = clientId;

/**
 * Development switch: lets the app open without signing in, while sign-in
 * providers are still being set up. Only honoured in development builds, so a
 * release build always requires sign-in whatever the env file says.
 */
export const skipSignIn = __DEV__ && process.env.EXPO_PUBLIC_SKIP_SIGN_IN === 'true';

/** BSC only. The embedded wallet defaults to the first chain listed. */
export const privyChains = [bsc] as const;
