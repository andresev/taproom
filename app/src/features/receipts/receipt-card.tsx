import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Wordmark } from '@/components/wordmark';
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
// the device theme: a black slip with a gold edge that looks the same from any
// phone, in the logo's colours.
const CARD = '#0B0B0A';
const INK = '#F4F0E4';
const MUTED = '#B5AF9C';
const GOLD = '#E6C780';
const EDGE = '#8C6A22';
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
 * The shareable receipt, drawn as a bar tab in black and gold. It only prints the receipt
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

      <View style={styles.header}>
        <Wordmark size={18} on="dark" tile={false} />
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
          {/* Dark on light with a quiet zone: what every QR scanner reads, so it is not inverted to match the card. */}
          <QRCode value={pageUrl} size={88} color={CARD} backgroundColor={INK} quietZone={4} ecl="M" />
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
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: EDGE,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.twoHalf,
  },
  kind: {
    color: GOLD,
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
    color: GOLD,
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
