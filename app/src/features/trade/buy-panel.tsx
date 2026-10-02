import { ADDRESSES, PRICE_DECIMALS } from '@repo/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { SafetyBadge } from '@/features/safety/safety-badge';
import { scoreToken } from '@/features/safety/score';
import type { TokenDetails } from '@/features/token/types';
import { useTokenMarket } from '@/features/token/use-token-market';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { formatPrice, formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { minimumReceived, parseBnbAmount, priceImpactBps } from './buy';
import { SLIPPAGE_OPTIONS_BPS, formatSlippage, isHighSlippage } from './slippage';
import { useSlippageStore } from './slippage-store';
import { useBnbBalance, useBuy, useWalletAddress } from './use-buy';
import { useBuyQuote } from './use-buy-quote';

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1'];
const BNB_DECIMALS = 18;
/** Price impact, pool fee included, above which the panel says so in plain words. */
const HIGH_IMPACT_BPS = 500;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * Buy a token with BNB. Two steps: set the amount and slippage, then a review
 * that shows token, amount, minimum received, slippage and safety before the
 * one button that sends anything. Slippage only changes when the user taps it.
 */
export function BuyPanel({ token }: { token: TokenDetails }) {
  const theme = useTheme();
  const [pool] = token.pools;
  const symbol = token.symbol ?? shortAddress(token.address);

  const [text, setText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const slippageBps = useSlippageStore((state) => state.slippageBps);
  const setSlippageBps = useSlippageStore((state) => state.setSlippageBps);

  const amountIn = parseBnbAmount(useDebouncedValue(text, 300));
  const wallet = useWalletAddress();
  const balance = useBnbBalance(wallet);
  const market = useTokenMarket(token);
  const quote = useBuyQuote({ token: token.address, fee: pool?.fee ?? 0, amountIn: pool ? amountIn : null });
  const buy = useBuy();

  // Step 6 has not built the checks yet, so every input is Unknown, which scores as Caution, never Safe.
  const safety = scoreToken([]);

  if (!pool || pool.pairToken !== ADDRESSES.wbnb) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Buy</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Buying is only available for tokens brewed with BNB so far.
          {pool ? ` ${symbol} is brewed with ${pool.pairSymbol ?? shortAddress(pool.pairToken)}.` : ''}
        </ThemedText>
      </View>
    );
  }

  if (buy.isSuccess) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Bought {symbol}</ThemedText>
        <ExternalLink href={bscscanTxUrl(buy.data)}>
          <ThemedText type="linkPrimary">View the transaction on BscScan</ThemedText>
        </ExternalLink>
        <Button
          label="Buy more"
          onPress={() => {
            buy.reset();
            setReviewing(false);
            setText('');
          }}
        />
      </View>
    );
  }

  const quoted = quote.data ?? null;
  const minOut = quoted !== null ? minimumReceived(quoted, slippageBps) : null;
  const impact =
    quoted !== null && amountIn !== null && market.data?.priceE36 != null
      ? priceImpactBps(amountIn, quoted, market.data.priceE36, token.decimals, pool.pairDecimals)
      : null;
  const insufficient = amountIn !== null && balance.data !== undefined && balance.data < amountIn;
  const ready = amountIn !== null && quoted !== null && minOut !== null && minOut > 0n;

  const pay = amountIn !== null ? `${formatTokenAmount(amountIn, BNB_DECIMALS, 6)} BNB` : '—';
  const receive = quoted !== null ? `${formatTokenAmount(quoted, token.decimals)} ${symbol}` : '—';
  const minimum = minOut !== null ? `${formatTokenAmount(minOut, token.decimals)} ${symbol}` : '—';

  const warnings = (
    <>
      {isHighSlippage(slippageBps) ? (
        <ThemedText type="smallBold" style={{ color: theme.sell }}>
          High slippage: you could receive up to {formatSlippage(slippageBps)} less than quoted.
        </ThemedText>
      ) : null}
      {impact !== null && impact >= HIGH_IMPACT_BPS ? (
        <ThemedText type="smallBold" style={{ color: theme.sell }}>
          This buy is large for the pool: the quote is {formatSlippage(impact)} worse than the current price, pool
          fee included.
        </ThemedText>
      ) : null}
    </>
  );

  if (reviewing && ready) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Review your buy</ThemedText>
        <Row label="Token" value={`${symbol} · ${shortAddress(token.address)}`} />
        <Row label="You pay" value={pay} />
        <Row label="You receive about" value={receive} />
        <Row label="Minimum received" value={minimum} />
        <Row label="Slippage" value={formatSlippage(slippageBps)} />
        {warnings}
        <SafetyBadge score={safety} note="Safety checks are not built yet, so every input is Unknown." />
        <Button
          label={`Confirm: buy ${symbol} for ${pay}`}
          onPress={() =>
            buy.mutate({ token: token.address, fee: pool.fee, amountIn, amountOutMinimum: minOut })
          }
          loading={buy.isPending}
          disabled={wallet === null || insufficient}
        />
        <Button label="Back" onPress={() => setReviewing(false)} disabled={buy.isPending} />
        {buy.isError ? (
          <ThemedText type="small" style={{ color: theme.sell }}>
            The buy did not go through: {buy.error.message}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <ThemedText type="smallBold">Buy {symbol} with BNB</ThemedText>
        {balance.data !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary">
            Balance {formatTokenAmount(balance.data, BNB_DECIMALS)} BNB
          </ThemedText>
        ) : null}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Amount in BNB"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel="Amount in BNB"
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />
      <View style={styles.options}>
        {QUICK_AMOUNTS.map((amount) => (
          <Chip key={amount} label={`${amount} BNB`} selected={text === amount} onPress={() => setText(amount)} />
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Slippage
      </ThemedText>
      <View style={styles.options}>
        {SLIPPAGE_OPTIONS_BPS.map((bps) => (
          <Chip
            key={bps}
            label={formatSlippage(bps)}
            selected={slippageBps === bps}
            onPress={() => setSlippageBps(bps)}
          />
        ))}
      </View>

      {amountIn !== null ? (
        quote.isPending ? (
          <ThemedText type="small" themeColor="textSecondary">
            Getting a quote…
          </ThemedText>
        ) : quote.isError ? (
          <ThemedText type="small" themeColor="textSecondary">
            A quote is not available for this amount. Try a smaller one.
          </ThemedText>
        ) : (
          <>
            <Row label="You receive about" value={receive} />
            <Row label="Minimum received" value={minimum} />
            {market.data?.priceE36 != null ? (
              <Row
                label="Current price"
                value={`${formatPrice(market.data.priceE36, PRICE_DECIMALS)} BNB per ${symbol}`}
              />
            ) : null}
            {impact !== null ? <Row label="Price impact, fee included" value={formatSlippage(impact)} /> : null}
          </>
        )
      ) : text.trim() !== '' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Enter an amount of BNB, for example 0.01.
        </ThemedText>
      ) : null}

      {warnings}
      {insufficient ? (
        <ThemedText type="small" style={{ color: theme.sell }}>
          Your wallet does not hold that much BNB.
        </ThemedText>
      ) : null}

      <Button
        label={wallet === null ? 'Sign in to buy' : 'Review buy'}
        onPress={() => setReviewing(true)}
        disabled={wallet === null || !ready || insufficient}
      />
      {wallet === null ? (
        <ThemedText type="small" themeColor="textSecondary">
          Buying needs your in-app wallet, which is created when you sign in.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
});
