import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { formatPoolFee, formatTimeAgo, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Radius, Spacing } from '@/theme';

import type { TokenDetails as Details } from './types';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.fact, { borderTopColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.value}>{children}</View>
    </View>
  );
}

/** The token's launch facts: who launched it and when, its supply and its pools. */
export function TokenDetails({ token }: { token: Details }) {
  const theme = useTheme();
  const symbol = token.symbol ?? shortAddress(token.address);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText type="bodyStrong" style={styles.title}>
        Launch
      </ThemedText>
      <Fact label="Launched by">
        <Link href={{ pathname: '/wallet/[address]', params: { address: token.deployer } }}>
          <ThemedText type="mono" style={[styles.link, { textDecorationColor: theme.textSecondary }]}>
            {shortAddress(token.deployer)}
          </ThemedText>
        </Link>
      </Fact>
      <Fact label="Launched">
        <ExternalLink href={bscscanTxUrl(token.launchTxHash)}>
          <ThemedText type="mono" style={[styles.link, { textDecorationColor: theme.textSecondary }]}>
            {formatTimeAgo(token.launchedAt)} ago
          </ThemedText>
        </ExternalLink>
      </Fact>
      <Fact label="Total supply">
        <ThemedText type="mono">{formatTokenAmount(token.totalSupply, token.decimals, 0)} {symbol}</ThemedText>
      </Fact>
      {token.pools.map((pool) => (
        <Fact key={pool.address} label="Brewed with">
          <ThemedText type="mono">
            {pairAssetLabel(pool.pairSymbol, shortAddress(pool.pairToken))} · {formatPoolFee(pool.fee)} fee
          </ThemedText>
        </Fact>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingTop: Spacing.twoHalf,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  title: {
    paddingBottom: Spacing.two,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 44,
    borderTopWidth: 1,
  },
  value: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
