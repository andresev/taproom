import { StyleSheet, View } from 'react-native';

import { Tag } from '@/components/chip';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { bscscanTokenUrl } from '@/lib/chain/explorer';
import { pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { TokenDetails } from './types';

/** Who the token is: its picture, name, ticker and contract, and what it is brewed with. */
export function TokenHeader({ token }: { token: TokenDetails }) {
  const symbol = token.symbol ?? shortAddress(token.address);
  const pairs = [...new Set(token.pools.map((pool) => pairAssetLabel(pool.pairSymbol, shortAddress(pool.pairToken))))];

  return (
    <View style={styles.container}>
      <TokenAvatar address={token.address} symbol={token.symbol} size={44} />
      <View style={styles.names}>
        <ThemedText type="subhead" numberOfLines={1}>
          {token.name ?? symbol}
        </ThemedText>
        <ExternalLink href={bscscanTokenUrl(token.address)}>
          <ThemedText type="monoSmall" themeColor="textSecondary">
            {symbol} · {shortAddress(token.address)}
          </ThemedText>
        </ExternalLink>
      </View>
      <View style={styles.pairs}>
        {pairs.map((pair) => (
          <Tag key={pair} label={pair} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  pairs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    maxWidth: 120,
  },
});
