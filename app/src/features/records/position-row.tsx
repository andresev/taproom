import type { Position, PositionLeg } from '@repo/shared';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMultiple, formatTimeAgo, formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

const STATUS = {
  open: 'Open',
  closed: 'Closed',
  'exit-only': 'Sold, no indexed buy',
} as const;

const TRANSFER_NOTE = {
  in: 'Holds more than these trades explain: tokens also arrived by transfer.',
  out: 'Holds less than these trades explain: tokens left by transfer, or a buy paid out to another address.',
} as const;

const pairLabel = (leg: { pairSymbol: string | null; pairToken: string }) =>
  leg.pairSymbol ?? shortAddress(leg.pairToken);

function LegLine({ leg, symbol, decimals }: { leg: PositionLeg; symbol: string; decimals: number }) {
  const pair = pairLabel(leg);
  const parts: string[] = [];
  if (leg.buys > 0) {
    parts.push(
      `Bought ${formatTokenAmount(leg.tokensBought, decimals)} ${symbol} for ${formatTokenAmount(leg.paid, leg.pairDecimals)} ${pair}`,
    );
  }
  if (leg.sells > 0) {
    parts.push(
      `sold ${formatTokenAmount(leg.tokensSold, decimals)} for ${formatTokenAmount(leg.received, leg.pairDecimals)} ${pair}`,
    );
  }
  const text = parts.join(', ');
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </ThemedText>
  );
}

/** One token a wallet traded: what it paid and received, and the result once closed. Losses read like gains. */
export function PositionRow({ position }: { position: Position }) {
  const theme = useTheme();
  const { facts, result } = position;
  const symbol = facts.symbol ?? shortAddress(facts.token);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.line}>
        <Link href={{ pathname: '/token/[address]', params: { address: facts.token } }}>
          <ThemedText type="smallBold">{symbol}</ThemedText>
        </Link>
        <ThemedText type="small" themeColor="textSecondary">
          {STATUS[position.status]} · {formatTimeAgo(new Date(facts.lastTradeAt * 1000))}
        </ThemedText>
      </View>

      {facts.legs.map((leg) => (
        <LegLine key={leg.pairToken} leg={leg} symbol={symbol} decimals={facts.decimals} />
      ))}

      {result ? (
        <ThemedText type="small">
          <ThemedText
            type="smallBold"
            style={{ color: result.outcome === 'win' ? theme.buy : result.outcome === 'loss' ? theme.sell : theme.text }}>
            {result.outcome === 'win' ? 'Gain' : result.outcome === 'loss' ? 'Loss' : 'Even'}
          </ThemedText>{' '}
          {result.net > 0n ? '+' : ''}
          {formatTokenAmount(result.net, result.pairDecimals)} {pairLabel(result)}
          {result.multipleHundredths !== null ? ` · ${formatMultiple(result.multipleHundredths / 100)}` : ''}
        </ThemedText>
      ) : position.status === 'closed' && position.mixedPairs ? (
        <ThemedText type="small" themeColor="textSecondary">
          Traded against more than one pair asset, so there is no single result without a price.
        </ThemedText>
      ) : null}

      {position.transfers === 'in' || position.transfers === 'out' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {TRANSFER_NOTE[position.transfers]}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
