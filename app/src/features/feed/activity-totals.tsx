import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { TokenActivity } from './types';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The buy/sell bar with its numbers underneath: "65 buys · 8.082 WBNB" against
 * "32 sells · 3.813 WBNB". Amounts are left off when the trades used different
 * pair assets. Used by the feed rows and the token page.
 */
export function ActivityTotals({ activity }: { activity: Pick<TokenActivity, 'buys' | 'sells' | 'buyShare' | 'volume'> }) {
  const theme = useTheme();
  const { volume, buyShare } = activity;
  const pair = volume?.pairSymbol ? ` ${volume.pairSymbol}` : '';

  if (buyShare === null) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No trades yet
      </ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityBar buyShare={buyShare} />
      <View style={styles.totals}>
        <ThemedText type="small" style={{ color: theme.buy }}>
          {plural(activity.buys, 'buy')}
          {volume ? ` · ${formatTokenAmount(volume.bought, volume.pairDecimals)}${pair}` : ''}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.sell }}>
          {plural(activity.sells, 'sell')}
          {volume ? ` · ${formatTokenAmount(volume.sold, volume.pairDecimals)}${pair}` : ''}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  // Long amounts wrap the sell total onto its own line instead of running off the card.
  totals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: Spacing.three,
  },
});
