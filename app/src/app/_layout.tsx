import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/lib/api/query-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="token/[address]" options={{ title: 'Token' }} />
          <Stack.Screen name="wallet/[address]" options={{ title: 'Wallet' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
