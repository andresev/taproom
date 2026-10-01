import { useAccount, useAppKit } from '@reown/appkit-react-native';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { shortAddress } from '@/lib/chain/format';
import { missingWalletEnv } from '@/lib/chain/wallet';
import { Spacing } from '@/theme';

import { useWalletSignIn } from './use-wallet-sign-in';

/**
 * The signed-out half of the Profile screen. Two explicit steps, so a signature
 * prompt only ever appears because the user asked for it: connect a wallet,
 * then sign in with it.
 */
export function ConnectButton() {
  const { open, disconnect } = useAppKit();
  const { address, isConnected } = useAccount();
  const signIn = useWalletSignIn();

  if (missingWalletEnv.length > 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="smallBold">Wallet connection is not set up</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Missing {missingWalletEnv.join(' and ')} in app/.env.
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isConnected || !address) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Connect a wallet to create your profile.
        </ThemedText>
        <Button label="Connect wallet" onPress={() => open()} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="code">{shortAddress(address)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Sign a message to prove this wallet is yours. It does not send a transaction or cost gas.
      </ThemedText>
      <Button label="Sign in" onPress={() => signIn.mutate()} loading={signIn.isPending} />
      {signIn.isError ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Sign-in failed: {signIn.error.message}
        </ThemedText>
      ) : null}
      <Button label="Disconnect" onPress={() => disconnect()} disabled={signIn.isPending} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
