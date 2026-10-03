import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { MinTouch, Spacing } from '@/theme';

import type { Holding } from './portfolio';

/** One token the wallet holds. Tapping it opens the token page, where it can be sold. */
export function HoldingRow({ holding }: { holding: Holding }) {
  const theme = useTheme();
  const symbol = holding.symbol ?? shortAddress(holding.token);

  return (
    <Link href={{ pathname: '/token/[address]', params: { address: holding.token } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, { borderTopColor: theme.border, backgroundColor: pressed ? theme.cardPressed : 'transparent' }]}>
        <TokenAvatar address={holding.token} symbol={holding.symbol} size={36} />
        <View style={styles.names}>
          <ThemedText type="mono" numberOfLines={1}>
            {symbol}
          </ThemedText>
          <ThemedText type="monoSmall" themeColor="textSecondary" numberOfLines={1}>
            {holding.balance === null ? 'Balance unknown' : `${formatTokenAmount(holding.balance, holding.decimals, 0)} ${symbol}`}
          </ThemedText>
        </View>
        <ThemedText type="mono" themeColor={holding.value ? 'text' : 'textSecondary'}>
          {holding.value
            ? `≈ ${formatTokenAmount(holding.value.amount, holding.value.pairDecimals)} ${pairAssetLabel(holding.value.pairSymbol, shortAddress(holding.value.pairToken))}`
            : 'Value unknown'}
        </ThemedText>
        <Icon name="chevron" color={theme.textSecondary} size={16} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.twoHalf,
    borderTopWidth: 1,
  },
  names: {
    flex: 1,
    minWidth: 0,
  },
});
