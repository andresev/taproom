import type { Address } from '@repo/shared';
import { Link } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HoldingRow } from '@/features/portfolio/holding-row';
import type { Holding } from '@/features/portfolio/portfolio';
import { PORTFOLIO_LIMIT, usePortfolio } from '@/features/portfolio/use-portfolio';
import { useBnbBalance, useWalletAddress } from '@/features/trade/use-buy';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Radius, Spacing } from '@/theme';

/** One card of holdings: those valued in one pair asset, or those with no value. */
function Group({ title, total, holdings }: { title: string; total?: string; holdings: Holding[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.groupHead}>
        <ThemedText type="bodyStrong">{title}</ThemedText>
        {total ? <ThemedText type="mono">{total}</ThemedText> : null}
      </View>
      {holdings.map((holding) => (
        <HoldingRow key={holding.token} holding={holding} />
      ))}
    </View>
  );
}

function Portfolio({ wallet }: { wallet: Address }) {
  const theme = useTheme();
  const portfolio = usePortfolio(wallet);
  const bnb = useBnbBalance(wallet);

  if (portfolio.isPending) return <LoadingState />;
  // Keep showing the last good holdings if a background refresh fails.
  if (portfolio.isError && !portfolio.data) {
    return <ErrorState message={portfolio.error.message} onRetry={() => void portfolio.refetch()} />;
  }

  const { holdings, totals, unvalued, more } = portfolio.data;
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={portfolio.isRefetching && !portfolio.isFetchedAfterMount}
          onRefresh={() => void portfolio.refetch()}
          tintColor={theme.textSecondary}
        />
      }>
      <ThemedText type="title">Portfolio</ThemedText>
      <View style={styles.tiles}>
        <StatTile
          label="BNB in wallet"
          value={bnb.data === undefined ? (bnb.isError ? 'Unknown' : '…') : `${formatTokenAmount(bnb.data, 18)} BNB`}
        />
        <StatTile label="Brew tokens held" value={String(holdings.length)} />
      </View>

      {holdings.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No Brew tokens in this wallet yet. Tokens you buy in Tapped show up here.
        </ThemedText>
      ) : null}

      {totals.map((total) => {
        const pair = pairAssetLabel(total.pairSymbol, shortAddress(total.pairToken));
        return (
          <Group
            key={total.pairToken}
            title={`Valued in ${pair}`}
            total={`≈ ${formatTokenAmount(total.amount, total.pairDecimals)} ${pair}`}
            holdings={holdings.filter((holding) => holding.value?.pairToken === total.pairToken)}
          />
        );
      })}
      {unvalued > 0 ? (
        <Group title="Price could not be read" holdings={holdings.filter((holding) => holding.value === null)} />
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Values use each pool&apos;s current price and are not added across pair assets. Selling returns less, after the
        pool fee and price impact. Only Brew tokens Tapped indexes are listed
        {more ? `, and only the ${PORTFOLIO_LIMIT} largest balances` : ''}.
      </ThemedText>
      <Link href={{ pathname: '/wallet/[address]', params: { address: wallet } }} style={styles.link}>
        <ThemedText type="label" style={{ color: theme.accentText }}>
          Your trader record
        </ThemedText>
      </Link>
    </ScrollView>
  );
}

export default function PortfolioScreen() {
  const wallet = useWalletAddress();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {wallet ? (
          <Portfolio wallet={wallet} />
        ) : (
          <EmptyState title="No wallet" message="Your in-app wallet is created when you sign in." />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  group: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.twoHalf,
  },
  link: {
    paddingVertical: Spacing.two,
  },
});
