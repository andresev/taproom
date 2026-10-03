import type { Address } from '@repo/shared';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useBnbBalance } from '@/features/trade/use-buy';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { PortfolioView } from './use-portfolio';
import { PORTFOLIO_LIMIT } from './use-portfolio';

/**
 * The top of the Portfolio tab: the wallet, its BNB, and what its Brew tokens
 * are worth at current prices, one total per pair asset, never added together.
 */
export function PortfolioSummary({ wallet, portfolio }: { wallet: Address; portfolio: PortfolioView }) {
  const theme = useTheme();
  const bnb = useBnbBalance(wallet);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.line}>
        <ThemedText type="smallBold">Your wallet</ThemedText>
        <ThemedText type="code" themeColor="textSecondary">
          {shortAddress(wallet, 6)}
        </ThemedText>
      </View>
      <ThemedText type="small">
        BNB:{' '}
        {bnb.data === undefined ? (bnb.isError ? 'unknown' : '…') : `${formatTokenAmount(bnb.data, 18, 6)} BNB`}
      </ThemedText>

      {portfolio.totals.map((total) => (
        <ThemedText key={total.pairToken} type="small">
          Brew tokens valued in {total.pairSymbol ?? shortAddress(total.pairToken)}: ≈{' '}
          {formatTokenAmount(total.amount, total.pairDecimals, 6)} {total.pairSymbol ?? ''} ({total.holdings}{' '}
          {total.holdings === 1 ? 'token' : 'tokens'})
        </ThemedText>
      ))}
      {portfolio.unvalued > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {portfolio.unvalued} {portfolio.unvalued === 1 ? 'token has' : 'tokens have'} no value right now: its price
          could not be read.
        </ThemedText>
      ) : null}
      {portfolio.more ? (
        <ThemedText type="small" themeColor="textSecondary">
          Your wallet holds more than {PORTFOLIO_LIMIT} Brew tokens; only the largest balances are listed.
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Values use each pool&apos;s current price. Selling returns less, after the pool fee and the price moving as you
        sell. Only Brew tokens Taproom indexes are listed.
      </ThemedText>
      <Link href={{ pathname: '/wallet/[address]', params: { address: wallet } }}>
        <ThemedText type="linkPrimary">Your trader record</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
