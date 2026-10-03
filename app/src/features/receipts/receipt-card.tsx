import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '@/hooks/use-theme';
import {
  formatMultiple,
  formatTokenAmount,
  formatUtcDateTime,
  pairAssetLabel,
  shortAddress,
} from '@/lib/chain/format';
import { Fonts, Spacing } from '@/theme';

import type { Receipt } from './receipt';
import { receiptPageUrl } from './receipt-link';

// The card is shared as an image, so it has its own fixed colours rather than
// the device theme: a paper slip that looks the same from any phone.
const PAPER = '#F1ECDD';
const INK = '#22231D';
const MUTED = '#5E6054';
/** How many punched holes run along the slip's top and bottom edges. */
const HOLES = 17;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** A row of holes half over the slip's edge, in the colour of the screen behind it. */
function Perforation({ edge, color }: { edge: 'top' | 'bottom'; color: string }) {
  return (
    <View style={[styles.perforation, edge === 'top' ? styles.perforationTop : styles.perforationBottom]} pointerEvents="none">
      {Array.from({ length: HOLES }, (_, index) => (
        <View key={index} style={[styles.hole, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/**
 * The shareable receipt, drawn as a printed bar tab. It only prints the receipt
 * it is given; it has no inputs and no state, so nothing on it can be edited.
 * It states that the wallet bought the token at that time and price, and nothing
 * about still holding it or making a profit. When a public receipt page is
 * configured, the slip carries its address and a QR code for it.
 */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const theme = useTheme();
  const pageUrl = receiptPageUrl(receipt.id);
  const symbol = receipt.token.symbol ?? shortAddress(receipt.token.address);
  const pair = pairAssetLabel(receipt.pair.symbol);
  const cap = (value: bigint) => `${formatTokenAmount(value, receipt.pair.decimals, 2)} ${pair}`;

  return (
    <View style={styles.slip}>
      <Perforation edge="top" color={theme.background} />
      <Perforation edge="bottom" color={theme.background} />

      <View style={styles.between}>
        <Text style={styles.brand}>taproom</Text>
        <Text style={styles.kind}>RECEIPT</Text>
      </View>
      <View style={styles.dash} />

      <View style={styles.between}>
        <Text style={styles.symbol} numberOfLines={1}>
          {symbol}
        </Text>
        {receipt.token.name && receipt.token.name !== receipt.token.symbol ? (
          <Text style={styles.name} numberOfLines={1}>
            {receipt.token.name}
          </Text>
        ) : null}
      </View>
      <Line label="WALLET" value={shortAddress(receipt.wallet, 6)} />
      <Line label="BOUGHT" value={formatUtcDateTime(receipt.boughtAt)} />
      <Line label="AMOUNT" value={`${formatTokenAmount(receipt.amountBought, receipt.token.decimals)} ${symbol}`} />
      <Line label="PAID" value={`${formatTokenAmount(receipt.amountPaid, receipt.pair.decimals, 6)} ${pair}`} />
      <View style={styles.dash} />

      <Line label="MCAP AT ENTRY" value={cap(receipt.entryMarketCap)} />
      <Line label="MCAP NOW" value={receipt.currentMarketCap === null ? 'Unknown' : cap(receipt.currentMarketCap)} />
      <View style={styles.between}>
        <Text style={styles.label}>NOW ÷ ENTRY</Text>
        <Text style={styles.multiple}>{receipt.multiple === null ? '—' : formatMultiple(receipt.multiple)}</Text>
      </View>
      <View style={styles.dash} />

      <Line label="TX" value={shortAddress(receipt.txHash, 8)} />
      {pageUrl ? (
        <View style={styles.verify}>
          {/* Dark on light with a quiet zone: what every QR scanner reads. */}
          <QRCode value={pageUrl} size={88} color={INK} backgroundColor={PAPER} quietZone={2} ecl="M" />
          <View style={styles.verifyText}>
            <Text style={styles.check}>Check this receipt</Text>
            <Text style={styles.link}>{pageUrl.replace(/^https?:\/\//, '')}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.dash} />

      <Text style={styles.footer}>
        Shows that this wallet bought this token at this time and price. Built from chain data. Not affiliated with
        Brew.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slip: {
    width: 320,
    gap: Spacing.two,
    paddingHorizontal: Spacing.threeHalf,
    paddingVertical: Spacing.four + 2,
    backgroundColor: PAPER,
  },
  perforation: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  perforationTop: {
    top: -6,
  },
  perforationBottom: {
    bottom: -6,
  },
  hole: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.twoHalf,
  },
  brand: {
    color: INK,
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: -0.5,
  },
  kind: {
    color: MUTED,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  dash: {
    borderTopWidth: 1,
    borderTopColor: MUTED,
    borderStyle: 'dashed',
    marginVertical: Spacing.half,
  },
  symbol: {
    flexShrink: 1,
    color: INK,
    fontFamily: Fonts.monoSemibold,
    fontSize: 26,
  },
  name: {
    flexShrink: 1,
    color: MUTED,
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.twoHalf,
  },
  label: {
    color: MUTED,
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  value: {
    flexShrink: 1,
    color: INK,
    fontFamily: Fonts.monoMedium,
    fontSize: 12.5,
    textAlign: 'right',
  },
  multiple: {
    color: INK,
    fontFamily: Fonts.monoSemibold,
    fontSize: 40,
    lineHeight: 44,
  },
  verify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingTop: Spacing.one,
  },
  verifyText: {
    flex: 1,
    gap: Spacing.one,
  },
  check: {
    color: INK,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  link: {
    color: INK,
    fontFamily: Fonts.mono,
    fontSize: 10.5,
  },
  footer: {
    color: MUTED,
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    lineHeight: 15,
  },
});
