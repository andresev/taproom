import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenActivity } from '@/features/token/token-activity';
import { TokenHeader } from '@/features/token/token-header';
import { TokenSafety } from '@/features/token/token-safety';
import { TokenStats } from '@/features/token/token-stats';
import { TokenTradeRow } from '@/features/token/token-trade-row';
import { useToken } from '@/features/token/use-token';
import { BuyPanel } from '@/features/trade/buy-panel';
import { SellPanel } from '@/features/trade/sell-panel';
import { normalizeAddress } from '@/lib/chain/address';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';
import type { Address } from '@repo/shared';

function TokenPage({ address }: { address: Address }) {
  const token = useToken(address);

  if (token.isPending) return <LoadingState />;
  // Keep showing the last good data if a background refresh fails.
  if (token.isError && !token.data) {
    return <ErrorState message={token.error.message} onRetry={() => void token.refetch()} />;
  }
  if (!token.data) {
    return (
      <EmptyState
        title="Token not indexed"
        message="This is not a Brew token Taproom has indexed. It may have launched before the indexed history, or through a Brew factory that is not indexed yet."
      />
    );
  }

  const details = token.data;
  const symbol = details.symbol ?? shortAddress(details.address);

  return (
    <>
      <Stack.Screen options={{ title: symbol }} />
      <FlatList
        data={details.recentTrades}
        keyExtractor={(trade) => trade.id}
        renderItem={({ item }) => <TokenTradeRow trade={item} tokenSymbol={symbol} tokenDecimals={details.decimals} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TokenHeader token={details} />
            <TokenSafety token={details} />
            <BuyPanel token={details} />
            <SellPanel token={details} />
            <TokenStats token={details} />
            <TokenActivity address={details.address} />
            <ThemedText type="smallBold">Recent trades</ThemedText>
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            No trades indexed yet.
          </ThemedText>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={token.isRefetching && !token.isFetchedAfterMount}
            onRefresh={() => void token.refetch()}
          />
        }
      />
    </>
  );
}

export default function TokenScreen() {
  const params = useLocalSearchParams<{ address: string }>();
  const address = normalizeAddress(params.address);

  return (
    <ThemedView style={styles.container}>
      {address ? <TokenPage address={address} /> : <ErrorState message="That is not a valid token address." />}
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
