import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { MinTouch, Spacing } from '@/theme';

import type { TokenTrade } from './types';

const VERB = { buy: 'bought', sell: 'sold' } as const;

type Props = {
  trade: TokenTrade;
  tokenDecimals: number;
};

/**
 * One trade: who, which way, how much, when. The trader opens their wallet
 * screen, and a buy links to its receipt.
 */
export function TokenTradeRow({ trade, tokenDecimals }: Props) {
  const theme = useTheme();
  const color = trade.side === 'buy' ? theme.buy : theme.sell;

  return (
    <View style={[styles.row, { borderTopColor: theme.border }]}>
      <Icon name={trade.side === 'buy' ? 'up' : 'down'} color={color} size={16} strokeWidth={2.5} />
      <ThemedText type="monoSmall" style={styles.text}>
        <Link href={{ pathname: '/wallet/[address]', params: { address: trade.wallet } }}>
          <ThemedText type="monoSmall" style={[styles.link, { textDecorationColor: theme.textSecondary }]}>
            {shortAddress(trade.wallet)}
          </ThemedText>
        </Link>{' '}
        <ThemedText type="monoSmall" style={{ color }}>
          {VERB[trade.side]}
        </ThemedText>{' '}
        {formatTokenAmount(trade.amountBaseUnits, tokenDecimals, 0)} for{' '}
        {formatTokenAmount(trade.pairAmountBaseUnits, trade.pairDecimals)} {pairAssetLabel(trade.pairSymbol, '')}
      </ThemedText>
      {trade.side === 'buy' ? (
        <Link href={{ pathname: '/receipt/[id]', params: { id: trade.id } }} style={styles.receipt}>
          <ThemedText type="label" style={{ color: theme.accentText }}>
            Receipt
          </ThemedText>
        </Link>
      ) : null}
      <ThemedText type="monoSmall" themeColor="textSecondary">
        {formatTimeAgo(trade.time)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinTouch,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  text: {
    flex: 1,
  },
  link: {
    textDecorationLine: 'underline',
  },
  receipt: {
    paddingVertical: Spacing.two,
  },
});
