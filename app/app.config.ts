import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const APPLE_SIGN_IN_ENTITLEMENT = 'com.apple.developer.applesignin';

/**
 * Removes the Sign in with Apple entitlement. Expo applies expo-apple-authentication's
 * own plugin whenever the package is installed, listed in app.json or not, and that
 * plugin adds the entitlement unconditionally, so it has to be taken out again.
 */
const withoutAppleSignIn: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults[APPLE_SIGN_IN_ENTITLEMENT];
    return mod;
  });

/**
 * app.json, plus one switch for development builds signed with a free Apple ID,
 * which cannot carry the Sign in with Apple entitlement (docs/0019).
 * EXPO_PUBLIC_APPLE_SIGN_IN=false leaves the entitlement out of the iOS project;
 * src/lib/api/privy.ts hides the Apple button to match. Release builds leave the
 * variable unset: an app offering Google sign-in must also offer Apple's.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.EXPO_PUBLIC_APPLE_SIGN_IN !== 'false') return base;
  return withoutAppleSignIn({
    ...base,
    ios: { ...base.ios, usesAppleSignIn: false },
    plugins: (base.plugins ?? []).filter((plugin) => plugin !== 'expo-apple-authentication'),
  });
};
