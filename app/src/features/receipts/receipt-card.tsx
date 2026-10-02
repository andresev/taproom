import { StyleSheet, Text, View } from 'react-native';

import { bscscanTxUrl } from '@/lib/chain/explorer';
import {
  formatMultiple,
  formatTokenAmount,
  formatUtcDateTime,
  shortAddress,
} from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { Receipt } from './receipt';

// The card is shared as an image, so it uses its own fixed colours instead of
// the device theme: the same receipt looks the same from any phone.
const INK = '#F5F5F0';
const MUTED = '#A6A69C';
const PAPER = '#16161A';
const RULE = '#2E2E36';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/**
 * The shareable card. It only prints the receipt it is given; it has no inputs
 * and no state, so nothing on it can be edited.
 */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const symbol = receipt.token.symbol ?? shortAddress(receipt.token.address);
  const pair = receipt.pair.symbol ?? 'pair asset';
  const cap = (value: bigint) => `${formatTokenAmount(value, receipt.pair.decimals, 2)} ${pair}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.brand}>Taproom receipt</Text>
        <Text style={styles.muted}>BNB Smart Chain</Text>
      </View>

      <View>
        <Text style={styles.symbol}>{symbol}</Text>
        {receipt.token.name && receipt.token.name !== receipt.token.symbol ? (
          <Text style={styles.muted}>{receipt.token.name}</Text>
        ) : null}
      </View>

      <View style={styles.multipleBlock}>
        <Text style={styles.multiple}>{receipt.multiple === null ? '—' : formatMultiple(receipt.multiple)}</Text>
        <Text style={styles.muted}>market cap now ÷ market cap at entry</Text>
      </View>

      <View style={styles.rule} />
      <Line
        label="Bought"
        value={`${formatTokenAmount(receipt.amountBought, receipt.token.decimals)} ${symbol}`}
      />
      <Line label="Paid" value={`${formatTokenAmount(receipt.amountPaid, receipt.pair.decimals, 6)} ${pair}`} />
      <Line label="When" value={formatUtcDateTime(receipt.boughtAt)} />
      <Line label="Wallet" value={shortAddress(receipt.wallet, 6)} />
      <View style={styles.rule} />
      <Line label="Market cap at entry" value={cap(receipt.entryMarketCap)} />
      <Line
        label="Market cap now"
        value={receipt.currentMarketCap === null ? 'Unknown' : cap(receipt.currentMarketCap)}
      />
      <View style={styles.rule} />

      <Text style={styles.small}>Transaction {shortAddress(receipt.txHash, 10)}</Text>
      <Text style={styles.small}>{bscscanTxUrl(receipt.txHash)}</Text>
      <Text style={styles.small}>
        Generated from on-chain data. Token {shortAddress(receipt.token.address, 6)}. Not affiliated with Brew.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: PAPER,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
  },
  muted: {
    color: MUTED,
    fontSize: 13,
  },
  symbol: {
    color: INK,
    fontSize: 34,
    fontWeight: '700',
  },
  multipleBlock: {
    paddingVertical: Spacing.two,
  },
  multiple: {
    color: INK,
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 60,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: RULE,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  label: {
    color: MUTED,
    fontSize: 14,
  },
  value: {
    color: INK,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  small: {
    color: MUTED,
    fontSize: 11,
  },
});
