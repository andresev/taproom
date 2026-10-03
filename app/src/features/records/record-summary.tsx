import type { TraderRecord } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Radius, Spacing, type ThemeColor } from '@/theme';

import type { CoverageNote } from './coverage-note';

function Count({ label, value, color }: { label: string; value: number; color?: ThemeColor }) {
  return (
    <View style={styles.count}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="mono" themeColor={color}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * The top of a trader record: counts, totals, and what the record covers. Gains
 * and losses sit side by side in the same size. Totals are per pair asset and
 * never added across them. The coverage lines are always shown.
 */
export function RecordSummary({ record, coverage }: { record: TraderRecord; coverage: CoverageNote }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.head}>
        <ThemedText type="bodyStrong">Trader record</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {coverage.complete ? 'from chain data only' : 'partial history'}
        </ThemedText>
      </View>

      <View style={styles.counts}>
        <Count label="CLOSED" value={record.closed} />
        <Count label="GAINS" value={record.wins} color="buy" />
        <Count label="LOSSES" value={record.losses} color="sell" />
        <Count label="OPEN" value={record.open} />
      </View>

      {record.totals.map((total) => {
        const pair = pairAssetLabel(total.pairSymbol, shortAddress(total.pairToken));
        return (
          <View key={total.pairToken} style={[styles.total, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              In {pair} · {total.positions} closed
            </ThemedText>
            <ThemedText type="mono" themeColor={total.net > 0n ? 'buy' : total.net < 0n ? 'sell' : 'text'}>
              net {total.net > 0n ? '+' : ''}
              {formatTokenAmount(total.net, total.pairDecimals)} {pair}
            </ThemedText>
          </View>
        );
      })}

      {record.even > 0 || record.closedWithoutResult > 0 || record.exitOnly > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {[
            record.even > 0 ? `${record.even} closed even` : null,
            record.closedWithoutResult > 0 ? `${record.closedWithoutResult} closed across several pair assets` : null,
            record.exitOnly > 0 ? `${record.exitOnly} sold with no indexed buy` : null,
          ]
            .filter((part) => part !== null)
            .join(' · ')}
          .
        </ThemedText>
      ) : null}

      <View style={[styles.coverage, { borderTopColor: theme.border }]}>
        <Icon name="info" color={theme.textSecondary} size={16} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.coverageText}>
          {coverage.lines.join(' ')} Network fees are not included. A trade counts for the wallet that sent it.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    padding: Spacing.three - 2,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  counts: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  count: {
    flex: 1,
    gap: Spacing.half,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two + 2,
    borderTopWidth: 1,
  },
  coverage: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two + 2,
    borderTopWidth: 1,
  },
  coverageText: {
    flex: 1,
  },
});
