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
import { useTheme } from '@/hooks/use-theme';
import { normalizeAddress } from '@/lib/chain/address';
import { Spacing } from '@/theme';

function WalletPage({ address }: { address: Address }) {
  const theme = useTheme();
  const record = useTraderRecord(address);
  // Keep showing the last good record if a background refresh fails.
  const view = record.data;

  return (
    <FlatList
      data={view?.record.positions ?? []}
      keyExtractor={(position) => position.facts.token}
      renderItem={({ item }) => <PositionRow position={item} />}
      ListHeaderComponent={
        <View style={[styles.header, view && view.record.positions.length > 0 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null]}>
          <WalletHeader address={address} />
          {record.isPending ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading trader record…
            </ThemedText>
          ) : !view ? (
            <ErrorState
              title="Could not load this record"
              message={`${record.error?.message ?? 'The record could not be read.'} A record is never shown without the period it covers.`}
              onRetry={() => void record.refetch()}
            />
          ) : (
            <RecordSummary record={view.record} coverage={view.coverage} />
          )}
        </View>
      }
      ListEmptyComponent={
        view ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No Brew trades indexed for this wallet in the period covered.
          </ThemedText>
        ) : null
      }
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={record.isRefetching && !record.isFetchedAfterMount}
          onRefresh={() => void record.refetch()}
          tintColor={theme.textSecondary}
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
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  empty: {
    paddingHorizontal: Spacing.three,
    textAlign: 'center',
  },
});
