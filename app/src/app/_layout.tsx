// Must stay the first import: it installs the polyfills WalletConnect needs.
import '@walletconnect/react-native-compat';

import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { WagmiProvider } from 'wagmi';

import { useWalletSessionGuard } from '@/features/profile/use-wallet-sign-in';
import { queryClient } from '@/lib/api/query-client';
import { appKit, wagmiAdapter } from '@/lib/chain/wallet';

function WalletSessionGuard() {
  useWalletSessionGuard();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppKitProvider instance={appKit}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="token/[address]" options={{ title: 'Token', headerBackTitle: 'Back' }} />
              <Stack.Screen name="wallet/[address]" options={{ title: 'Wallet', headerBackTitle: 'Back' }} />
            </Stack>
            <WalletSessionGuard />
            {/* Reown: with Expo Router the modal needs an absolutely positioned wrapper on Android. */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <AppKit />
            </View>
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  );
}
