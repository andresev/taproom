import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { bscscanTxUrl } from '@/lib/chain/explorer';
import {
  formatMultiple,
  formatTokenAmount,
  formatUtcDateTime,
  shortAddress,
} from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { Receipt } from './receipt';
import { receiptPageUrl } from './receipt-link';

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
 * and no state, so nothing on it can be edited. When a public receipt page is
 * configured, the card carries its address and a QR code for it, so anyone
 * holding the image can check it against the chain.
 */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const pageUrl = receiptPageUrl(receipt.id);
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

      {pageUrl ? (
        <View style={styles.verify}>
          {/* Dark on light with a quiet zone: what every QR scanner reads. */}
          <View style={styles.qr}>
            <QRCode value={pageUrl} size={84} color="#000000" backgroundColor="#FFFFFF" quietZone={6} ecl="M" />
          </View>
          <View style={styles.verifyText}>
            <Text style={styles.label}>Check this receipt</Text>
            <Text style={styles.small}>{pageUrl}</Text>
          </View>
        </View>
      ) : null}

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
  verify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  qr: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  verifyText: {
    flex: 1,
    gap: Spacing.one,
  },
});
