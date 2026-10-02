import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { ActivityTotals } from './activity-totals';
import type { TokenActivity } from './types';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "alice, 0x1677…47d9 +2": at most two followed wallets by name, then how many more. */
function walletList(activity: TokenActivity, names: Map<string, string | null>): string {
  // A followed wallet that launched the token but has not traded it still belongs in the list.
  const deployer = activity.launch && names.has(activity.launch.wallet) ? [activity.launch.wallet] : [];
  const wallets = [...new Set([...activity.wallets, ...deployer])];
  const shown = wallets.slice(0, 2).map((wallet) => names.get(wallet) ?? shortAddress(wallet));
  const more = wallets.length - shown.length;
  return more > 0 ? `${shown.join(', ')} +${more}` : shown.join(', ');
}

/** "Launched 2h ago", or "Launched just now" inside the first few seconds. */
function launchedAgo(time: Date): string {
  const ago = formatTimeAgo(time);
  return ago === 'now' ? 'Launched just now' : `Launched ${ago} ago`;
}

type Props = {
  activity: TokenActivity;
  /** Display names of followed wallets by lowercase address. When given, the row names who traded. */
  names?: Map<string, string | null>;
};

/** One token's recent activity as a single row with a buy/sell bar; opens the token page. */
export function TokenActivityRow({ activity, names }: Props) {
  const theme = useTheme();
  const symbol = activity.tokenSymbol ?? shortAddress(activity.tokenAddress);

  return (
    <Link href={{ pathname: '/token/[address]', params: { address: activity.tokenAddress } }} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View style={[styles.row, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
            <View style={styles.line}>
              <ThemedText type="smallBold" style={styles.grow} numberOfLines={1}>
                {symbol}
                {activity.tokenName && activity.tokenName !== activity.tokenSymbol ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {'  '}
                    {activity.tokenName}
                  </ThemedText>
                ) : null}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatTimeAgo(activity.lastTime)}
              </ThemedText>
            </View>

            <ActivityTotals activity={activity} />

            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {activity.launch ? `${launchedAgo(activity.launch.time)} · ` : ''}
              {names ? walletList(activity, names) : plural(activity.walletCount, 'wallet')}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  grow: {
    flexShrink: 1,
  },
});
