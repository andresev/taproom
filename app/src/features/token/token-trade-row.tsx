import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { formatTimeAgo, formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { TokenTrade } from './types';

const VERB = { buy: 'bought', sell: 'sold' } as const;

type Props = {
  trade: TokenTrade;
  tokenSymbol: string;
  tokenDecimals: number;
};

/** One trade: who, which way, how much, when, with links to the wallet and the transaction. */
export function TokenTradeRow({ trade, tokenSymbol, tokenDecimals }: Props) {
  const theme = useTheme();
  const pair = trade.pairSymbol ? ` ${trade.pairSymbol}` : '';

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.line}>
        <Link href={{ pathname: '/wallet/[address]', params: { address: trade.wallet } }}>
          <ThemedText type="code">{shortAddress(trade.wallet)}</ThemedText>
        </Link>
        <ExternalLink href={bscscanTxUrl(trade.txHash)}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTimeAgo(trade.time)} · BscScan
          </ThemedText>
        </ExternalLink>
      </View>
      <ThemedText type="small">
        <ThemedText type="smallBold" style={{ color: trade.side === 'buy' ? theme.buy : theme.sell }}>
          {VERB[trade.side]}
        </ThemedText>{' '}
        {formatTokenAmount(trade.amountBaseUnits, tokenDecimals)} {tokenSymbol} for{' '}
        {formatTokenAmount(trade.pairAmountBaseUnits, trade.pairDecimals)}
        {pair}
      </ThemedText>
    </View>
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
