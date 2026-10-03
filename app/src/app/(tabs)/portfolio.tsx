import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HoldingRow } from '@/features/portfolio/holding-row';
import { PortfolioSummary } from '@/features/portfolio/portfolio-summary';
import { usePortfolio } from '@/features/portfolio/use-portfolio';
import { useWalletAddress } from '@/features/trade/use-buy';
import { Spacing } from '@/theme';

function Portfolio() {
  const wallet = useWalletAddress();
  const portfolio = usePortfolio(wallet);

  if (wallet === null) {
    return <EmptyState title="No wallet" message="Your in-app wallet is created when you sign in." />;
  }
  if (portfolio.isPending) return <LoadingState />;
  // Keep showing the last good holdings if a background refresh fails.
  if (portfolio.isError && !portfolio.data) {
    return <ErrorState message={portfolio.error.message} onRetry={() => void portfolio.refetch()} />;
  }

  return (
    <FlatList
      data={portfolio.data.holdings}
      keyExtractor={(holding) => holding.token}
      renderItem={({ item }) => <HoldingRow holding={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <ThemedText type="subtitle">Portfolio</ThemedText>
          <PortfolioSummary wallet={wallet} portfolio={portfolio.data} />
        </View>
      }
      ListEmptyComponent={
        <ThemedText type="small" themeColor="textSecondary">
          No Brew tokens in this wallet yet. Tokens you buy in Taproom show up here.
        </ThemedText>
      }
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={portfolio.isRefetching && !portfolio.isFetchedAfterMount}
          onRefresh={() => void portfolio.refetch()}
        />
      }
    />
  );
}

export default function PortfolioScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Portfolio />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
