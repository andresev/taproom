import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { bscscanTokenUrl, bscscanTxUrl } from '@/lib/chain/explorer';
import { formatPoolFee, formatTimeAgo, formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { TokenDetails } from './types';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.factValue}>{children}</View>
    </View>
  );
}

/** Who the token is: name, contract, launcher, supply and what it was brewed with. */
export function TokenHeader({ token }: { token: TokenDetails }) {
  const symbol = token.symbol ?? shortAddress(token.address);

  return (
    <View style={styles.container}>
      <View style={styles.title}>
        <ThemedText type="subtitle">{symbol}</ThemedText>
        {token.name && token.name !== token.symbol ? (
          <ThemedText type="default" themeColor="textSecondary">
            {token.name}
          </ThemedText>
        ) : null}
      </View>

      <Fact label="Contract">
        <ExternalLink href={bscscanTokenUrl(token.address)}>
          <ThemedText type="code">{shortAddress(token.address, 6)}</ThemedText>
        </ExternalLink>
      </Fact>
      <Fact label="Launched by">
        <Link href={{ pathname: '/wallet/[address]', params: { address: token.deployer } }}>
          <ThemedText type="code">{shortAddress(token.deployer, 6)}</ThemedText>
        </Link>
      </Fact>
      <Fact label="Launched">
        <ExternalLink href={bscscanTxUrl(token.launchTxHash)}>
          <ThemedText type="small">{formatTimeAgo(token.launchedAt)} ago</ThemedText>
        </ExternalLink>
      </Fact>
      <Fact label="Total supply">
        <ThemedText type="small">
          {formatTokenAmount(token.totalSupply, token.decimals, 0)} {symbol}
        </ThemedText>
      </Fact>
      {token.pools.map((pool) => (
        <Fact key={pool.address} label="Brewed with">
          <ThemedText type="small">
            {pool.pairSymbol ?? shortAddress(pool.pairToken)} · {formatPoolFee(pool.fee)} pool fee
          </ThemedText>
        </Fact>
      ))}

      {/* The swap flow, with its safety check before signing, is MVP step 5. */}
      <Button label="Buy (coming soon)" onPress={() => {}} disabled />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  title: {
    gap: Spacing.half,
    paddingBottom: Spacing.one,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  factValue: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
});
