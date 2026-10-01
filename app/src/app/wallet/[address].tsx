import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EmptyState, ErrorState } from '@/components/screen-states';
import { ThemedView } from '@/components/themed-view';
import { WalletHeader } from '@/features/follow/wallet-header';
import { normalizeAddress } from '@/lib/chain/address';

export default function WalletScreen() {
  const params = useLocalSearchParams<{ address: string }>();
  const address = normalizeAddress(params.address);

  if (!address) return <ErrorState message="That is not a valid wallet address." />;

  return (
    <ThemedView style={styles.container}>
      <WalletHeader address={address} />
      <EmptyState title="No activity yet" message="Wallet activity is not available yet." />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
