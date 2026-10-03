import { useLoginWithOAuth, usePrivy } from '@privy-io/expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { appleSignInEnabled } from '@/lib/api/privy';
import { Spacing } from '@/theme';

import { useAuthStore } from './auth-store';

type Provider = 'google' | 'apple';

/**
 * The opening screen's body. Signed out, it offers Google and Apple, the only
 * ways in. While the wallet and profile are being set up after a sign-in it
 * shows progress, and if that fails, the reason with a way to retry or leave.
 */
export function SignInOptions() {
  const scheme = useColorScheme();
  const status = useAuthStore((state) => state.status);
  const linkError = useAuthStore((state) => state.error);
  const retry = useAuthStore((state) => state.retry);
  const { logout } = usePrivy();
  const { login, state } = useLoginWithOAuth();
  const [failure, setFailure] = useState<string | null>(null);

  const busy = state.status === 'loading';

  async function signIn(provider: Provider) {
    setFailure(null);
    try {
      await login({ provider });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Sign-in did not complete.');
    }
  }

  if (status === 'linking') {
    return (
      <View style={styles.block}>
        <ActivityIndicator />
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Setting up your wallet…
        </ThemedText>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.block}>
        <ThemedText type="smallBold" style={styles.center}>
          Could not finish signing in
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {linkError ?? 'Something went wrong.'}
        </ThemedText>
        <Button label="Try again" onPress={retry} />
        <Button label="Use a different account" onPress={() => void logout()} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {!appleSignInEnabled ? null : Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={Spacing.three}
          style={[styles.apple, busy && styles.busy]}
          onPress={() => {
            if (!busy) void signIn('apple');
          }}
        />
      ) : (
        <Button label="Continue with Apple" onPress={() => void signIn('apple')} disabled={busy} />
      )}
      <Button label="Continue with Google" onPress={() => void signIn('google')} loading={busy} />
      {failure ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {failure}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  apple: {
    height: 48,
  },
  busy: {
    opacity: 0.5,
  },
  center: {
    textAlign: 'center',
  },
});
