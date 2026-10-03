import type { Address } from '@repo/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenActivity } from '@/features/token/token-activity';
import { TokenDetails } from '@/features/token/token-details';
import { TokenHeader } from '@/features/token/token-header';
import { TokenSafety } from '@/features/token/token-safety';
import { TokenStats } from '@/features/token/token-stats';
import { TokenTradeRow } from '@/features/token/token-trade-row';
import { useToken } from '@/features/token/use-token';
import { BuySheet } from '@/features/trade/buy-sheet';
import { SellSheet } from '@/features/trade/sell-sheet';
import { useTheme } from '@/hooks/use-theme';
import { normalizeAddress } from '@/lib/chain/address';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

function TokenPage({ address }: { address: Address }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const token = useToken(address);
  // Which sheet is open. Closing it unmounts the sheet, so the next one starts fresh.
  const [sheet, setSheet] = useState<'buy' | 'sell' | null>(null);

  if (token.isPending) return <LoadingState />;
  // Keep showing the last good data if a background refresh fails.
  if (token.isError && !token.data) {
    return (
      <ErrorState
        title="Could not load this token"
        message={`${token.error.message} Nothing was bought or sold.`}
        onRetry={() => void token.refetch()}
      />
    );
  }
  if (!token.data) {
    return (
      <EmptyState
        title="Token not indexed"
        message="This is not a Brew token Taproom has indexed. It may have launched before the indexed history, or through a Brew factory that is not covered yet."
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
        renderItem={({ item }) => <TokenTradeRow trade={item} tokenDecimals={details.decimals} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TokenHeader token={details} />
            <TokenStats token={details} />
            <TokenSafety token={details} />
            <TokenActivity address={details.address} />
            <TokenDetails token={details} />
            <ThemedText type="bodyStrong">Recent trades</ThemedText>
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
            tintColor={theme.textSecondary}
          />
        }
      />

      <View
        style={[
          styles.bar,
          { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.twoHalf },
        ]}>
        <View style={styles.grow}>
          <Button label="Buy" kind="primary" size="large" onPress={() => setSheet('buy')} />
        </View>
        <View style={styles.grow}>
          <Button label="Sell" size="large" onPress={() => setSheet('sell')} />
        </View>
      </View>

      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === 'buy' ? <BuySheet token={details} onClose={() => setSheet(null)} /> : null}
        {sheet === 'sell' ? <SellSheet token={details} onClose={() => setSheet(null)} /> : null}
      </BottomSheet>
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.twoHalf,
    borderTopWidth: 1,
  },
  grow: {
    flex: 1,
  },
});
