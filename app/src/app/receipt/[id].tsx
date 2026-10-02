import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/components/screen-states';
import { ThemedView } from '@/components/themed-view';
import { ReceiptView } from '@/features/receipts/receipt-view';

/** `${txHash}-${logIndex}`, the indexer's trade id. */
const TRADE_ID = /^0x[0-9a-f]{64}-\d+$/;

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView style={styles.container}>
      {TRADE_ID.test(id) ? <ReceiptView tradeId={id} /> : <ErrorState message="That is not a valid receipt link." />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
