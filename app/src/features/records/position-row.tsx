import type { Position, PositionLeg } from '@repo/shared';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { useTheme } from '@/hooks/use-theme';
import { formatMultiple, formatTimeAgo, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Spacing, type ThemeColor } from '@/theme';

const STATUS = {
  open: 'Open',
  closed: 'Closed',
  'exit-only': 'Sold, no indexed buy',
} as const;

const TRANSFER_NOTE = {
  in: 'Holds more than these trades explain: tokens also arrived by transfer.',
  out: 'Holds less than these trades explain: tokens left by transfer, or a buy paid out to another address.',
} as const;

const pairName = (leg: { pairSymbol: string | null; pairToken: string }) =>
  pairAssetLabel(leg.pairSymbol, shortAddress(leg.pairToken));
const money = (amount: bigint, leg: PositionLeg) => `${formatTokenAmount(amount, leg.pairDecimals)} ${pairName(leg)}`;

/** One column of a position: a small label over a figure in mono type. */
function Cell({ label, value, color }: { label: string; value: string; color?: ThemeColor }) {
  return (
    <View style={styles.cell}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="monoSmall" themeColor={color}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * One token a wallet traded: what it paid going in, what it received coming out,
 * and the result once the position is closed. A loss is set in the same size and
 * weight as a gain.
 */
export function PositionRow({ position }: { position: Position }) {
  const theme = useTheme();
  const { facts, result } = position;
  const symbol = facts.symbol ?? shortAddress(facts.token);
  const entries = facts.legs.filter((leg) => leg.buys > 0);
  const exits = facts.legs.filter((leg) => leg.sells > 0);
  const list = (legs: PositionLeg[], amount: (leg: PositionLeg) => bigint) =>
    legs.length > 0 ? legs.map((leg) => money(amount(leg), leg)).join('\n') : '—';

  const outcome = result
    ? {
        text: `${result.outcome === 'win' ? 'Gain' : result.outcome === 'loss' ? 'Loss' : 'Even'} ${result.net > 0n ? '+' : ''}${formatTokenAmount(result.net, result.pairDecimals)} ${pairName(result)}${
          result.multipleHundredths !== null ? ` · ${formatMultiple(result.multipleHundredths / 100)}` : ''
        }`,
        color: (result.outcome === 'win' ? 'buy' : result.outcome === 'loss' ? 'sell' : 'text') as ThemeColor,
      }
    : position.status === 'open'
      ? { text: 'Still open', color: 'textSecondary' as ThemeColor }
      : { text: 'No single result', color: 'textSecondary' as ThemeColor };

  return (
    <Link href={{ pathname: '/token/[address]', params: { address: facts.token } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.card : 'transparent' }]}>
        <View style={styles.head}>
          <TokenAvatar address={facts.token} symbol={facts.symbol} size={32} />
          <ThemedText type="mono" style={styles.symbol} numberOfLines={1}>
            {symbol}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {STATUS[position.status]} · {formatTimeAgo(new Date(facts.lastTradeAt * 1000))}
          </ThemedText>
        </View>

        <View style={styles.cells}>
          <Cell label="ENTRY" value={list(entries, (leg) => leg.paid)} />
          <Cell label="EXIT" value={list(exits, (leg) => leg.received)} />
          <Cell label="RESULT" value={outcome.text} color={outcome.color} />
        </View>

        {position.status === 'closed' && position.mixedPairs ? (
          <ThemedText type="small" themeColor="textSecondary">
            Traded against more than one pair asset. They cannot be compared without a price.
          </ThemedText>
        ) : null}
        {position.transfers === 'in' || position.transfers === 'out' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {TRANSFER_NOTE[position.transfers]}
          </ThemedText>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf + 1,
    borderBottomWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  symbol: {
    flex: 1,
  },
  cells: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cell: {
    flex: 1,
    gap: Spacing.half,
  },
});
