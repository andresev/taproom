import { ADDRESSES, PRICE_DECIMALS } from '@repo/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { SafetyCard } from '@/features/safety/safety-card';
import type { TokenDetails } from '@/features/token/types';
import { useTokenMarket } from '@/features/token/use-token-market';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { formatPrice, formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Fonts, Radius, Spacing } from '@/theme';

import { minimumReceived, parseBnbAmount, priceImpactBps } from './buy';
import { SLIPPAGE_OPTIONS_BPS, formatSlippage, isHighSlippage } from './slippage';
import { useSlippageStore } from './slippage-store';
import { Note, Outcome, ReviewRow, SheetTitle, Warning } from './trade-ui';
import { useBnbBalance, useBuy, useWalletAddress } from './use-buy';
import { useBuyQuote } from './use-buy-quote';
import { useTradeSafety } from './use-trade-safety';

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1'];
const BNB_DECIMALS = 18;
/** Price impact, pool fee included, above which the sheet says so in plain words. */
const HIGH_IMPACT_BPS = 500;

/**
 * Buy a token with BNB, inside the bottom sheet. Two steps: set the amount and
 * slippage, then a review that shows token, amount, minimum received, slippage
 * and safety before the one button that sends anything. After that the sheet
 * shows the buy as pending, done or failed. Slippage only changes when the user
 * taps it.
 */
export function BuySheet({ token, onClose }: { token: TokenDetails; onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
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
  const safety = useTradeSafety(token);

  if (!pool || pool.pairToken !== ADDRESSES.wbnb) {
    return (
      <View style={styles.body}>
        <SheetTitle title="Buy" token={token} />
        <Note>
          Buying is only available for tokens brewed with BNB so far.
          {pool ? ` ${symbol} is brewed with ${pairAssetLabel(pool.pairSymbol, shortAddress(pool.pairToken))}.` : ''}
        </Note>
        <Button label="Close" onPress={onClose} size="large" />
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

  if (buy.isPending) {
    return (
      <View style={styles.body}>
        <Outcome kind="pending" title="Sending your buy">
          {pay} for {symbol}. This usually takes a few seconds.
        </Outcome>
        <ReviewRow label="Minimum received" value={minimum} />
        <Button label="Waiting for confirmation" onPress={() => undefined} disabled size="large" />
      </View>
    );
  }

  if (buy.isSuccess) {
    const { hash, tradeId } = buy.data;
    return (
      <View style={styles.body}>
        <Outcome kind="success" title={`Bought ${symbol}`}>
          The buy is confirmed on BNB Smart Chain.
        </Outcome>
        <ReviewRow label="You paid" value={pay} />
        <ReviewRow label="Transaction" value={shortAddress(hash)} />
        <ExternalLink href={bscscanTxUrl(hash)} style={styles.link}>
          <ThemedText type="label" style={{ color: theme.accentText }}>
            View the transaction on BscScan
          </ThemedText>
        </ExternalLink>
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="Done" onPress={onClose} size="large" />
          </View>
          {tradeId ? (
            <View style={styles.grow}>
              <Button
                label="View receipt"
                kind="primary"
                icon="receipt"
                size="large"
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/receipt/[id]', params: { id: tradeId } });
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (buy.isError) {
    return (
      <View style={styles.body}>
        <Outcome kind="failed" title="The buy did not go through">
          {buy.error.message}
        </Outcome>
        <ReviewRow label="You tried to pay" value={pay} />
        <ReviewRow label="Minimum received" value={minimum} />
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="Close" onPress={onClose} size="large" />
          </View>
          <View style={styles.grow}>
            <Button label="Try again" kind="primary" onPress={() => buy.reset()} size="large" />
          </View>
        </View>
      </View>
    );
  }

  const warnings = (
    <>
      {isHighSlippage(slippageBps) && minOut !== null ? (
        <Warning title={`High slippage: ${formatSlippage(slippageBps)}`}>
          You could receive up to {formatSlippage(slippageBps)} less than quoted: as little as {minimum}.
        </Warning>
      ) : null}
      {impact !== null && impact >= HIGH_IMPACT_BPS ? (
        <Warning title="Large for this pool">
          The quote is {formatSlippage(impact)} worse than the current price, pool fee included.
        </Warning>
      ) : null}
    </>
  );

  if (reviewing && ready) {
    return (
      <View style={styles.body}>
        <SheetTitle title="Review buy" token={token} />
        <ReviewRow label="You pay" value={pay} />
        <ReviewRow label="You receive about" value={receive} />
        <ReviewRow label="Minimum received" value={minimum} />
        <ReviewRow label="Slippage" value={formatSlippage(slippageBps)} color={isHighSlippage(slippageBps) ? 'danger' : undefined} />
        {warnings}
        <SafetyCard score={safety.score} />
        {insufficient ? <Note color="danger">Your wallet does not hold that much BNB.</Note> : null}
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="Back" onPress={() => setReviewing(false)} size="large" />
          </View>
          <View style={styles.grow}>
            <Button
              label="Confirm buy"
              kind="primary"
              size="large"
              onPress={() =>
                buy.mutate({ token: token.address, pool: pool.address, fee: pool.fee, amountIn, amountOutMinimum: minOut })
              }
              // The safety rating must be on screen before anything can be sent.
              disabled={wallet === null || insufficient || safety.score === null}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <SheetTitle title={`Buy ${symbol}`} token={token} />
      {balance.data !== undefined ? (
        <Note>
          Your wallet holds {formatTokenAmount(balance.data, BNB_DECIMALS)} BNB.
        </Note>
      ) : null}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Amount in BNB"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel="Amount in BNB"
        style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
      />
      <View style={styles.options}>
        {QUICK_AMOUNTS.map((amount) => (
          <Chip key={amount} label={`${amount} BNB`} selected={text === amount} onPress={() => setText(amount)} />
        ))}
      </View>

      <ThemedText type="caption" themeColor="textSecondary">
        SLIPPAGE
      </ThemedText>
      <View style={styles.options}>
        {SLIPPAGE_OPTIONS_BPS.map((bps) => (
          <Chip key={bps} label={formatSlippage(bps)} selected={slippageBps === bps} onPress={() => setSlippageBps(bps)} />
        ))}
      </View>

      {amountIn !== null ? (
        quote.isPending ? (
          <Note>Getting a quote…</Note>
        ) : quote.isError ? (
          <Note>A quote is not available for this amount. Try a smaller one.</Note>
        ) : (
          <View>
            <ReviewRow label="You receive about" value={receive} />
            <ReviewRow label="Minimum received" value={minimum} />
            {market.data?.priceE36 != null ? (
              <ReviewRow label="Current price" value={`${formatPrice(market.data.priceE36, PRICE_DECIMALS)} BNB`} />
            ) : null}
            {impact !== null ? <ReviewRow label="Price impact, fee included" value={formatSlippage(impact)} /> : null}
          </View>
        )
      ) : text.trim() !== '' ? (
        <Note>Enter an amount of BNB, for example 0.01.</Note>
      ) : null}

      {warnings}
      {insufficient ? <Note color="danger">Your wallet does not hold that much BNB.</Note> : null}
      {wallet === null ? <Note>Buying needs your in-app wallet, which is created when you sign in.</Note> : null}

      <Button
        label={wallet === null ? 'Sign in to buy' : 'Review buy'}
        kind="primary"
        size="large"
        onPress={() => setReviewing(true)}
        disabled={wallet === null || !ready || insufficient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
    fontFamily: Fonts.monoMedium,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    paddingTop: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  link: {
    paddingVertical: Spacing.two,
  },
});
