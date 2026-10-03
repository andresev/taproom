import type { TraderRecord } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { CoverageNote } from './coverage-note';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The top of a trader record: what it covers, then counts and totals. Totals are
 * per pair asset and never added across them. Losses are counted beside gains.
 */
export function RecordSummary({ record, coverage }: { record: TraderRecord; coverage: CoverageNote }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">Trader record{coverage.complete ? '' : ' · partial history'}</ThemedText>
      {coverage.lines.map((line) => (
        <ThemedText key={line} type="small" themeColor="textSecondary">
          {line}
        </ThemedText>
      ))}

      <ThemedText type="small">
        {plural(record.closed, 'closed position', 'closed positions')}: {record.wins} with a gain, {record.losses}{' '}
        with a loss{record.even > 0 ? `, ${record.even} even` : ''}
        {record.closedWithoutResult > 0 ? `, ${record.closedWithoutResult} across several pair assets` : ''}.
      </ThemedText>
      <ThemedText type="small">
        {plural(record.open, 'open position', 'open positions')}
        {record.exitOnly > 0 ? `, ${plural(record.exitOnly, 'sale', 'sales')} with no indexed buy` : ''}.
      </ThemedText>

      {record.totals.map((total) => {
        const pair = total.pairSymbol ?? shortAddress(total.pairToken);
        return (
          <ThemedText key={total.pairToken} type="small">
            In {pair} ({plural(total.positions, 'position', 'positions')}): paid{' '}
            {formatTokenAmount(total.paid, total.pairDecimals)}, received{' '}
            {formatTokenAmount(total.received, total.pairDecimals)},{' '}
            <ThemedText
              type="smallBold"
              style={{ color: total.net > 0n ? theme.buy : total.net < 0n ? theme.sell : theme.text }}>
              net {total.net > 0n ? '+' : ''}
              {formatTokenAmount(total.net, total.pairDecimals)}
            </ThemedText>
          </ThemedText>
        );
      })}

      <ThemedText type="small" themeColor="textSecondary">
        Computed from indexed trades only. Network fees are not included. A trade counts for the wallet that sent the
        transaction.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
