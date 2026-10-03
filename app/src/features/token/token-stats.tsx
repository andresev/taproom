import { PRICE_DECIMALS } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { formatPrice, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import type { TokenDetails } from './types';
import { useTokenMarket } from './use-token-market';

const UNKNOWN = 'Unknown';

/**
 * Price, then market cap, liquidity and holders. Money figures are in the pair
 * asset, read live from the pool; holders come from the indexer. Anything that
 * could not be read says "Unknown", never zero.
 */
export function TokenStats({ token }: { token: TokenDetails }) {
  const market = useTokenMarket(token);
  const [pool] = token.pools;
  const pair = pool ? pairAssetLabel(pool.pairSymbol, shortAddress(pool.pairToken)) : '';
  const symbol = token.symbol ?? shortAddress(token.address);
  const pending = market.isPending && pool !== undefined;
  const data = market.data ?? null;
  const money = (value: string | null) => (pending ? '…' : value === null ? UNKNOWN : `${value} ${pair}`);
  const price = data?.priceE36 != null ? formatPrice(data.priceE36, PRICE_DECIMALS) : null;

  return (
    <View style={styles.container}>
      <View style={styles.price}>
        <ThemedText type="monoLarge" numberOfLines={1} adjustsFontSizeToFit>
          {pending ? '…' : (price ?? UNKNOWN)}
          {price !== null ? (
            <ThemedText type="mono" themeColor="textSecondary">
              {' '}
              {pair}
            </ThemedText>
          ) : null}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Price per {symbol}, from the pool right now
        </ThemedText>
      </View>

      <View style={styles.tiles}>
        <StatTile
          label="Market cap"
          value={money(data?.marketCap != null && pool ? formatTokenAmount(data.marketCap, pool.pairDecimals, 2) : null)}
        />
        <StatTile
          label="Liquidity"
          value={money(
            data?.poolPairBalance != null && pool ? formatTokenAmount(data.poolPairBalance, pool.pairDecimals) : null,
          )}
        />
        <StatTile
          label="Holders"
          value={token.holderCount === null ? UNKNOWN : token.holderCount.toLocaleString('en-US')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.twoHalf,
  },
  price: {
    gap: Spacing.half,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
