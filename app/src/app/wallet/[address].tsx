import type { Address } from '@repo/shared';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WalletHeader } from '@/features/follow/wallet-header';
import { PositionRow } from '@/features/records/position-row';
import { RecordSummary } from '@/features/records/record-summary';
import { useTraderRecord } from '@/features/records/use-trader-record';
import { normalizeAddress } from '@/lib/chain/address';
import { Spacing } from '@/theme';

function RecordStatus({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {text}
    </ThemedText>
  );
}

function WalletPage({ address }: { address: Address }) {
  const record = useTraderRecord(address);
  // Keep showing the last good record if a background refresh fails.
  const view = record.data;

  return (
    <FlatList
      data={view?.record.positions ?? []}
      keyExtractor={(position) => position.facts.token}
      renderItem={({ item }) => <PositionRow position={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <WalletHeader address={address} />
          {record.isPending ? (
            <RecordStatus text="Loading trader record…" />
          ) : !view ? (
            <ErrorState message={record.error?.message ?? 'Could not load the trader record.'} onRetry={() => void record.refetch()} />
          ) : (
            <RecordSummary record={view.record} coverage={view.coverage} />
          )}
        </View>
      }
      ListEmptyComponent={
        view ? <RecordStatus text="No Brew trades indexed for this wallet in the period covered." /> : null
      }
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={record.isRefetching && !record.isFetchedAfterMount}
          onRefresh={() => void record.refetch()}
        />
      }
    />
  );
}

export default function WalletScreen() {
  const params = useLocalSearchParams<{ address: string }>();
  const address = normalizeAddress(params.address);

  return (
    <ThemedView style={styles.container}>
      {address ? <WalletPage address={address} /> : <ErrorState message="That is not a valid wallet address." />}
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
