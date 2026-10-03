import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { sessionWalletAddress, useSession } from '@/features/profile/use-session';
import { RECEIPT_LIST_LIMIT } from '@/features/receipts/receipt-list';
import { ReceiptListRow } from '@/features/receipts/receipt-list-row';
import { useMyReceipts } from '@/features/receipts/use-my-receipts';
import { Spacing } from '@/theme';

/** The signed-in user's own receipts: every indexed buy from their wallet. */
export default function MyReceiptsScreen() {
  const { session, isLoading } = useSession();
  const wallet = sessionWalletAddress(session);
  const receipts = useMyReceipts(wallet);

  if (isLoading) return <LoadingState />;
  if (!wallet) {
    return <EmptyState title="No wallet" message="Sign in to see receipts for your wallet's buys." />;
  }
  if (receipts.isPending) return <LoadingState />;
  // Keep showing the last good list if a background refresh fails.
  if (receipts.isError && !receipts.data) {
    return <ErrorState message={receipts.error.message} onRetry={() => void receipts.refetch()} />;
  }

  const { items, more, coverage } = receipts.data;
  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReceiptListRow item={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              A receipt proves that your wallet bought a token at that time and price. Only buys the indexer has seen
              can have one.
            </ThemedText>
            {coverage.lines.map((line) => (
              <ThemedText key={line} type="small" themeColor="textSecondary">
                {line}
              </ThemedText>
            ))}
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            No buys from your wallet in the indexed history.
          </ThemedText>
        }
        ListFooterComponent={
          more ? (
            <ThemedText type="small" themeColor="textSecondary">
              Showing your newest {RECEIPT_LIST_LIMIT} buys.
            </ThemedText>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={receipts.isRefetching && !receipts.isFetchedAfterMount}
            onRefresh={() => void receipts.refetch()}
          />
        }
      />
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
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
});
