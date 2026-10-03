import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Tag } from '@/components/chip';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { SafetyPill } from '@/features/safety/safety-pill';
import { useSafety } from '@/features/safety/use-safety';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Radius, Spacing } from '@/theme';

import type { TokenActivity } from './types';

type Props = {
  activity: TokenActivity;
  /** Display names of followed wallets by lowercase address. A named wallet is shown by its name. */
  names?: Map<string, string | null>;
};

/**
 * One line of the tap list: the token, what it is brewed with, the newest trade
 * (who, which way, how much, when) and its safety rating. The whole row opens
 * the token page, where the rating's reasons and the buy review are.
 */
export function FeedRow({ activity, names }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { score } = useSafety(activity.tokenAddress, { live: false });
  const symbol = activity.tokenSymbol ?? shortAddress(activity.tokenAddress);
  const { latest } = activity;
  const pair = latest ? pairAssetLabel(latest.pairSymbol) : activity.volume ? pairAssetLabel(activity.volume.pairSymbol) : null;
  const open = () => router.push({ pathname: '/token/[address]', params: { address: activity.tokenAddress } });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${activity.tokenName ?? symbol}, open token page`}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.card : 'transparent' }]}>
      <TokenAvatar address={activity.tokenAddress} symbol={activity.tokenSymbol} />

      <View style={styles.middle}>
        <View style={styles.nameLine}>
          <ThemedText type="bodyStrong" numberOfLines={1} style={styles.name}>
            {activity.tokenName ?? symbol}
          </ThemedText>
          <ThemedText type="monoSmall" themeColor="textSecondary" numberOfLines={1}>
            {symbol}
          </ThemedText>
        </View>

        {latest ? (
          <View style={styles.actionLine}>
            <Icon
              name={latest.side === 'buy' ? 'up' : 'down'}
              color={latest.side === 'buy' ? theme.buy : theme.sell}
              size={14}
              strokeWidth={2.5}
            />
            <ThemedText type="monoSmall" themeColor="textSecondary" numberOfLines={1} style={styles.action}>
              {names?.get(latest.wallet) ?? shortAddress(latest.wallet)}{' '}
              <ThemedText type="monoSmall" style={{ color: latest.side === 'buy' ? theme.buy : theme.sell }}>
                {latest.side === 'buy' ? 'bought' : 'sold'}
              </ThemedText>{' '}
              {formatTokenAmount(latest.pairAmount, latest.pairDecimals)} {pair} · {formatTimeAgo(latest.time)}
            </ThemedText>
          </View>
        ) : activity.launch ? (
          <ThemedText type="monoSmall" themeColor="textSecondary" numberOfLines={1}>
            {names?.get(activity.launch.wallet) ?? shortAddress(activity.launch.wallet)} launched ·{' '}
            {formatTimeAgo(activity.launch.time)}
          </ThemedText>
        ) : null}

        <View style={styles.tags}>
          {pair ? <Tag label={pair} /> : null}
          {score ? (
            <SafetyPill level={score.level} />
          ) : (
            // The rating is still loading: an empty outline, never a guess.
            <View style={[styles.pending, { borderColor: theme.border }]} />
          )}
        </View>
      </View>

      <Button label="Buy" kind="quiet" onPress={open} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf + 1,
    borderBottomWidth: 1,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  actionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 1,
  },
  action: {
    flexShrink: 1,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  pending: {
    width: 76,
    height: 26,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
