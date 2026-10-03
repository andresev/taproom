import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, formatUtcDateTime, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { ReceiptListItem } from './receipt-list';

/** One of the user's buys; tapping it opens its receipt. */
export function ReceiptListRow({ item }: { item: ReceiptListItem }) {
  const theme = useTheme();
  const symbol = item.tokenSymbol ?? shortAddress(item.token);
  const pair = item.pairSymbol ? ` ${item.pairSymbol}` : '';

  return (
    <Link href={{ pathname: '/receipt/[id]', params: { id: item.id } }} asChild>
      <Pressable accessibilityRole="link" style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.line}>
          <ThemedText type="smallBold">{symbol}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatUtcDateTime(item.boughtAt)}
          </ThemedText>
        </View>
        <ThemedText type="small">
          Bought {formatTokenAmount(item.amountBought, item.tokenDecimals)} {symbol} for{' '}
          {formatTokenAmount(item.amountPaid, item.pairDecimals)}
          {pair}
        </ThemedText>
        <ThemedText type="linkPrimary">Receipt</ThemedText>
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
