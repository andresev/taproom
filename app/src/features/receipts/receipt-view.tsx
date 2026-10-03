import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { Spacing } from '@/theme';

import { ReceiptCard } from './receipt-card';
import { receiptPageUrl } from './receipt-link';
import { useReceipt } from './use-receipt';

/** A receipt for one trade, with a button that shares the card as an image. */
export function ReceiptView({ tradeId }: { tradeId: string }) {
  const result = useReceipt(tradeId);
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (result.isPending) return <LoadingState />;
  if (result.isError && !result.data) {
    return <ErrorState message={result.error.message} onRetry={() => void result.refetch()} />;
  }
  if (!result.data?.ok) {
    return <ErrorState message={result.data?.reason ?? 'This receipt could not be built.'} />;
  }
  const { receipt } = result.data;
  const pageUrl = receiptPageUrl(receipt.id);

  async function share() {
    setFailure(null);
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share receipt' });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Could not share the receipt.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* collapsable={false} keeps this a real native view, which the capture needs on Android. */}
      <View ref={card} collapsable={false}>
        <ReceiptCard receipt={receipt} />
      </View>
      <Button label="Share receipt" onPress={() => void share()} loading={sharing} />
      {failure ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {failure}
        </ThemedText>
      ) : null}
      {pageUrl ? (
        <ExternalLink href={pageUrl}>
          <ThemedText type="linkPrimary">Open the public receipt page</ThemedText>
        </ExternalLink>
      ) : null}
      <ExternalLink href={bscscanTxUrl(receipt.txHash)}>
        <ThemedText type="linkPrimary">View the transaction on BscScan</ThemedText>
      </ExternalLink>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Every number on this card comes from the transaction and the pool. None of it can be edited.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  center: {
    textAlign: 'center',
  },
});
