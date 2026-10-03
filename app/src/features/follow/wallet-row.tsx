import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { FollowButton } from './follow-button';
import type { WalletSummary } from './types';
import { WalletAvatar } from './wallet-header';

/** One wallet in a search result or follow list: opens the wallet screen, with Follow on the right. */
export function WalletRow({ wallet }: { wallet: WalletSummary }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/wallet/[address]', params: { address: wallet.address } })}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.card : 'transparent' }]}>
      <WalletAvatar name={wallet.displayName} />
      <View style={styles.names}>
        {wallet.displayName ? (
          <ThemedText type="bodyStrong" numberOfLines={1}>
            {wallet.displayName}
          </ThemedText>
        ) : null}
        <ThemedText type={wallet.displayName ? 'monoSmall' : 'mono'} themeColor={wallet.displayName ? 'textSecondary' : 'text'}>
          {shortAddress(wallet.address)}
        </ThemedText>
      </View>
      <FollowButton address={wallet.address} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderBottomWidth: 1,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
});
