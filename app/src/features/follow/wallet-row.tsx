import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { WalletSummary } from './types';

/** One wallet in a search result or follow list; opens the wallet screen. */
export function WalletRow({ wallet }: { wallet: WalletSummary }) {
  const theme = useTheme();

  return (
    <Link href={{ pathname: '/wallet/[address]', params: { address: wallet.address } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <ThemedText type="smallBold">{wallet.displayName ?? shortAddress(wallet.address)}</ThemedText>
        <ThemedText type="code" themeColor="textSecondary">
          {shortAddress(wallet.address, 6)}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
});
