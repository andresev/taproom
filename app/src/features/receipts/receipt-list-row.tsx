import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, formatUtcDateTime, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { MinTouch, Spacing } from '@/theme';

import type { ReceiptListItem } from './receipt-list';

/** One of the user's buys; tapping it opens its receipt. */
export function ReceiptListRow({ item }: { item: ReceiptListItem }) {
  const theme = useTheme();
  const symbol = item.tokenSymbol ?? shortAddress(item.token);

  return (
    <Link href={{ pathname: '/receipt/[id]', params: { id: item.id } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.card : 'transparent' }]}>
        <TokenAvatar address={item.token} symbol={item.tokenSymbol} size={36} />
        <View style={styles.text}>
          <ThemedText type="mono">{symbol}</ThemedText>
          <ThemedText type="monoSmall" themeColor="textSecondary" numberOfLines={1}>
            {formatTokenAmount(item.amountBought, item.tokenDecimals, 0)} for{' '}
            {formatTokenAmount(item.amountPaid, item.pairDecimals)} {pairAssetLabel(item.pairSymbol, '')}
          </ThemedText>
          <ThemedText type="monoSmall" themeColor="textSecondary">
            {formatUtcDateTime(item.boughtAt)}
          </ThemedText>
        </View>
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderBottomWidth: 1,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
