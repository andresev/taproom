import { ADDRESSES, formatBaseUnits } from '@repo/shared';
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
import { formatTokenAmount, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Fonts, Radius, Spacing } from '@/theme';

import { minimumReceived } from './buy';
import { isApproved, parseTokenAmount, portionOf, sellPriceImpactBps } from './sell';
import { SLIPPAGE_OPTIONS_BPS, formatSlippage, isHighSlippage } from './slippage';
import { useSlippageStore } from './slippage-store';
import { Note, Outcome, ReviewRow, SheetTitle, Warning } from './trade-ui';
import { useBnbBalance, useWalletAddress } from './use-buy';
import { useApproveForSell, useRouterAllowance, useSell, useSellQuote, useTokenBalance } from './use-sell';
import { useTradeSafety } from './use-trade-safety';

const BNB_DECIMALS = 18;
/** Shares of the balance offered as one-tap amounts, in basis points. */
const PORTIONS_BPS = [2500, 5000, 10_000] as const;
/** Price impact, pool fee included, above which the sheet says so in plain words. */
const HIGH_IMPACT_BPS = 500;

/**
 * Sell a token for BNB, inside the bottom sheet. Like a buy: set the amount and
 * slippage, then a review that shows token, amount, minimum received, slippage
 * and safety before anything is sent. A first sell of a token needs an approval,
 * which is its own step with its own button. Then pending, done or failed.
 */
export function SellSheet({ token, onClose }: { token: TokenDetails; onClose: () => void }) {
  const theme = useTheme();
  const [pool] = token.pools;
  const symbol = token.symbol ?? shortAddress(token.address);

  const [text, setText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const slippageBps = useSlippageStore((state) => state.slippageBps);
  const setSlippageBps = useSlippageStore((state) => state.setSlippageBps);

  const amountIn = parseTokenAmount(useDebouncedValue(text, 300), token.decimals);
  const wallet = useWalletAddress();
  const holding = useTokenBalance(token.address, wallet);
  const bnb = useBnbBalance(wallet);
  const allowance = useRouterAllowance(token.address, wallet);
  const market = useTokenMarket(token);
  const bnbPool = pool?.pairToken === ADDRESSES.wbnb ? pool : undefined;
  const quote = useSellQuote({ token: token.address, fee: bnbPool?.fee ?? 0, amountIn: bnbPool ? amountIn : null });
  const approve = useApproveForSell();
  const sell = useSell();
  const safety = useTradeSafety(token);

  if (!bnbPool) {
    return (
      <View style={styles.body}>
        <SheetTitle title="Sell" token={token} />
        <Note>
          Selling is only available for tokens brewed with BNB so far.
          {pool ? ` ${symbol} is brewed with ${pairAssetLabel(pool.pairSymbol, shortAddress(pool.pairToken))}.` : ''}
        </Note>
        <Button label="Close" onPress={onClose} size="large" />
      </View>
    );
  }

  const balance = holding.data ?? 0n;
  const quoted = quote.data ?? null;
  const minOut = quoted !== null ? minimumReceived(quoted, slippageBps) : null;
  const impact =
    quoted !== null && amountIn !== null && market.data?.priceE36 != null
      ? sellPriceImpactBps(amountIn, quoted, market.data.priceE36, token.decimals, bnbPool.pairDecimals)
      : null;
  const tooMuch = amountIn !== null && amountIn > balance;
  // Every transaction costs a little BNB, a sell included.
  const noGas = bnb.data !== undefined && bnb.data === 0n;
  const approved = amountIn !== null && allowance.data !== undefined && isApproved(allowance.data, amountIn);
  const ready = amountIn !== null && quoted !== null && minOut !== null && minOut > 0n;

  const selling = amountIn !== null ? `${formatTokenAmount(amountIn, token.decimals)} ${symbol}` : '—';
  const receive = quoted !== null ? `${formatTokenAmount(quoted, BNB_DECIMALS, 6)} BNB` : '—';
  const minimum = minOut !== null ? `${formatTokenAmount(minOut, BNB_DECIMALS, 6)} BNB` : '—';

  if (approve.isPending || sell.isPending) {
    return (
      <View style={styles.body}>
        <Outcome kind="pending" title={approve.isPending ? 'Sending your approval' : 'Sending your sell'}>
          {approve.isPending
            ? `Allowing PancakeSwap's router to move ${selling}. Nothing is sold yet.`
            : `${selling} for BNB. This usually takes a few seconds.`}
        </Outcome>
        <ReviewRow label="Minimum received" value={minimum} />
        <Button label="Waiting for confirmation" onPress={() => undefined} disabled size="large" />
      </View>
    );
  }

  if (sell.isSuccess) {
    return (
      <View style={styles.body}>
        <Outcome kind="success" title={`Sold ${symbol}`}>
          The sell is confirmed on BNB Smart Chain.
        </Outcome>
        <ReviewRow label="You sold" value={selling} />
        <ReviewRow label="Transaction" value={shortAddress(sell.data)} />
        <ExternalLink href={bscscanTxUrl(sell.data)} style={styles.link}>
          <ThemedText type="label" style={{ color: theme.accentText }}>
            View the transaction on BscScan
          </ThemedText>
        </ExternalLink>
        <Button label="Done" kind="primary" onPress={onClose} size="large" />
      </View>
    );
  }

  if (sell.isError || approve.isError) {
    const approval = approve.isError && !sell.isError;
    return (
      <View style={styles.body}>
        <Outcome kind="failed" title={approval ? 'The approval did not go through' : 'The sell did not go through'}>
          {(sell.error ?? approve.error)?.message ?? 'Nothing was sold.'}
        </Outcome>
        <ReviewRow label="You tried to sell" value={selling} />
        <ReviewRow label="Minimum received" value={minimum} />
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="Close" onPress={onClose} size="large" />
          </View>
          <View style={styles.grow}>
            <Button
              label="Try again"
              kind="primary"
              size="large"
              onPress={() => {
                sell.reset();
                approve.reset();
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (wallet === null || (holding.data !== undefined && balance === 0n)) {
    return (
      <View style={styles.body}>
        <SheetTitle title={`Sell ${symbol}`} token={token} />
        <Note>
          {wallet === null
            ? 'Selling needs your in-app wallet, which is created when you sign in.'
            : `Your wallet holds no ${symbol}.`}
        </Note>
        <Button label="Close" onPress={onClose} size="large" />
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
          The quote is {formatSlippage(impact)} below the current price, pool fee included.
        </Warning>
      ) : null}
      {noGas ? (
        <Note color="danger">Your wallet has no BNB to pay the network fee. Add a little BNB first.</Note>
      ) : null}
    </>
  );

  if (reviewing && ready && amountIn !== null && minOut !== null) {
    return (
      <View style={styles.body}>
        <SheetTitle title="Review sell" token={token} />
        <ReviewRow label="You sell" value={selling} />
        <ReviewRow label="You receive about" value={receive} />
        <ReviewRow label="Minimum received" value={minimum} />
        <ReviewRow label="Slippage" value={formatSlippage(slippageBps)} color={isHighSlippage(slippageBps) ? 'danger' : undefined} />
        {warnings}
        <SafetyCard score={safety.score} />
        {!approved ? (
          <Note>
            Step 1 of 2: allow PancakeSwap&apos;s router to move {selling} from your wallet. This sells nothing yet, and
            allows only this amount.
          </Note>
        ) : null}
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="Back" onPress={() => setReviewing(false)} size="large" />
          </View>
          <View style={styles.grow}>
            {!approved ? (
              <Button
                label="Approve"
                kind="primary"
                size="large"
                onPress={() => approve.mutate({ token: token.address, amount: amountIn })}
                loading={allowance.isFetching}
                disabled={noGas || tooMuch || allowance.data === undefined}
              />
            ) : (
              <Button
                label="Confirm sell"
                kind="primary"
                size="large"
                onPress={() => sell.mutate({ token: token.address, fee: bnbPool.fee, amountIn, amountOutMinimum: minOut })}
                // The safety rating must be on screen before anything can be sent.
                disabled={noGas || tooMuch || safety.score === null}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <SheetTitle title={`Sell ${symbol}`} token={token} />
      <Note>
        Your wallet holds {formatTokenAmount(balance, token.decimals)} {symbol}.
      </Note>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={`Amount in ${symbol}`}
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel={`Amount of ${symbol} to sell`}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
      />
      <View style={styles.options}>
        {PORTIONS_BPS.map((bps) => {
          // The exact amount, not a rounded display, so All leaves nothing behind.
          const exact = formatBaseUnits(portionOf(balance, bps), token.decimals);
          return (
            <Chip
              key={bps}
              label={bps === 10_000 ? 'All' : `${bps / 100}%`}
              selected={text === exact}
              onPress={() => setText(exact)}
            />
          );
        })}
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
            {impact !== null ? <ReviewRow label="Price impact, fee included" value={formatSlippage(impact)} /> : null}
          </View>
        )
      ) : text.trim() !== '' ? (
        <Note>Enter an amount of {symbol}.</Note>
      ) : null}

      {warnings}
      {tooMuch ? <Note color="danger">Your wallet does not hold that much {symbol}.</Note> : null}

      <Button label="Review sell" kind="primary" size="large" onPress={() => setReviewing(true)} disabled={!ready || tooMuch} />
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
