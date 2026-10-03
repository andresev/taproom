import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { Holding } from './portfolio';

/** One token the wallet holds. Tapping it opens the token page, where it can be sold. */
export function HoldingRow({ holding }: { holding: Holding }) {
  const theme = useTheme();
  const symbol = holding.symbol ?? shortAddress(holding.token);
  const pair = holding.value?.pairSymbol ?? (holding.value ? shortAddress(holding.value.pairToken) : '');

  return (
    <Link href={{ pathname: '/token/[address]', params: { address: holding.token } }} asChild>
      <Pressable accessibilityRole="link" style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.line}>
          <ThemedText type="smallBold">{symbol}</ThemedText>
          <ThemedText type="smallBold">
            {holding.value ? `≈ ${formatTokenAmount(holding.value.amount, holding.value.pairDecimals, 6)} ${pair}` : 'Value unknown'}
          </ThemedText>
        </View>
        <View style={styles.line}>
          <ThemedText type="small" themeColor="textSecondary">
            {holding.balance === null ? 'Balance unknown' : `${formatTokenAmount(holding.balance, holding.decimals)} ${symbol}`}
          </ThemedText>
          <ThemedText type="linkPrimary">Trade</ThemedText>
        </View>
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
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
