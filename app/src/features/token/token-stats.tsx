import { PRICE_DECIMALS } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice, formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { BURN_ADDRESS, topTenShare } from './holders';
import type { TokenDetails } from './types';
import { useTokenMarket } from './use-token-market';

const UNKNOWN = 'Unknown';

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Price, market cap, liquidity and holders. Money figures are in the pair
 * asset, read live from the pool; holders come from the indexer. Anything that
 * could not be read says "Unknown".
 */
export function TokenStats({ token }: { token: TokenDetails }) {
  const market = useTokenMarket(token);
  const [pool] = token.pools;
  const pair = pool ? (pool.pairSymbol ?? shortAddress(pool.pairToken)) : '';
  const symbol = token.symbol ?? shortAddress(token.address);
  const pending = market.isPending && pool !== undefined;
  const data = market.data ?? null;
  const money = (value: string | null) => (pending ? '…' : value === null ? UNKNOWN : `${value} ${pair}`);

  const supply = data?.totalSupply ?? token.totalSupply;
  const share = topTenShare(
    token.largestHolders,
    [...token.pools.map((item) => item.address), BURN_ADDRESS],
    supply,
  );

  return (
    <View style={styles.grid}>
      <Stat
        label="Price"
        value={money(data?.priceE36 != null ? formatPrice(data.priceE36, PRICE_DECIMALS) : null)}
        detail={`per ${symbol}`}
      />
      <Stat
        label="Market cap"
        value={money(
          data?.marketCap != null && pool ? formatTokenAmount(data.marketCap, pool.pairDecimals, 2) : null,
        )}
        detail="price × total supply"
      />
      <Stat
        label="Liquidity"
        value={money(
          data?.poolPairBalance != null && pool ? formatTokenAmount(data.poolPairBalance, pool.pairDecimals) : null,
        )}
        detail={
          data?.poolTokenBalance != null
            ? `+ ${formatTokenAmount(data.poolTokenBalance, token.decimals, 0)} ${symbol} in the pool`
            : 'in the pool'
        }
      />
      <Stat
        label="Holders"
        value={token.holderCount === null ? UNKNOWN : token.holderCount.toLocaleString('en-US')}
        detail={
          share === null || token.holderCount === null
            ? undefined
            : `top 10 hold ${(share * 100).toFixed(2)}%, pool and burn address excluded`
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
