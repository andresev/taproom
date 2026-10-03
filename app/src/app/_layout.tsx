import { PrivyProvider } from '@privy-io/expo';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { LoadingState } from '@/components/screen-states';
import { useAuthStore } from '@/features/profile/auth-store';
import { useAuthBridge } from '@/features/profile/use-auth-bridge';
import { privyAppId, privyChains, privyClientId, skipSignIn } from '@/lib/api/privy';
import { queryClient } from '@/lib/api/query-client';
import { Colors, FontAssets, Fonts } from '@/theme';

/**
 * The whole app sits behind sign-in. Until Privy has started there is nothing
 * to decide, so a spinner shows. After that, only a fully signed-in user (Privy
 * session, wallet and Supabase profile) gets past the sign-in screen.
 */
function Screens() {
  useAuthBridge();
  const status = useAuthStore((state) => state.status);
  // `skipSignIn` is a development-only switch (lib/api/privy.ts).
  const signedIn = status === 'ready' || skipSignIn;

  if (status === 'loading') return <LoadingState />;

  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontFamily: Fonts.semibold, fontSize: 17 } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="token/[address]" options={{ title: 'Token', headerBackTitle: 'Back' }} />
        <Stack.Screen name="wallet/[address]" options={{ title: 'Wallet', headerBackTitle: 'Back' }} />
        <Stack.Screen name="receipt/[id]" options={{ title: 'Receipt', headerBackTitle: 'Back' }} />
        <Stack.Screen name="receipts" options={{ title: 'Your receipts', headerBackTitle: 'Back' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts(FontAssets);
  // Dark is the default look; light only when the phone asks for it (docs/0020).
  const dark = colorScheme !== 'light';
  const colors = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accentText,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: Fonts.regular, fontWeight: '400' as const },
      medium: { fontFamily: Fonts.medium, fontWeight: '500' as const },
      bold: { fontFamily: Fonts.semibold, fontWeight: '600' as const },
      heavy: { fontFamily: Fonts.bold, fontWeight: '700' as const },
    },
  };

  // Text set in a font that has not loaded falls back to the system one; wait for it.
  if (!fontsLoaded) return null;

  return (
    <PrivyProvider appId={privyAppId} clientId={privyClientId} supportedChains={[...privyChains]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <Screens />
        </ThemeProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
