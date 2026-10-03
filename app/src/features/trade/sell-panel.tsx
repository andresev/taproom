import { ADDRESSES, formatBaseUnits } from '@repo/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { SafetyBadge } from '@/features/safety/safety-badge';
import type { TokenDetails } from '@/features/token/types';
import { useTokenMarket } from '@/features/token/use-token-market';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { bscscanTxUrl } from '@/lib/chain/explorer';
import { formatTokenAmount, shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { minimumReceived } from './buy';
import { ReviewRow as Row } from './review-row';
import { isApproved, parseTokenAmount, portionOf, sellPriceImpactBps } from './sell';
import { SLIPPAGE_OPTIONS_BPS, formatSlippage, isHighSlippage } from './slippage';
import { useSlippageStore } from './slippage-store';
import { useBnbBalance, useWalletAddress } from './use-buy';
import { useApproveForSell, useRouterAllowance, useSell, useSellQuote, useTokenBalance } from './use-sell';
import { useTradeSafety } from './use-trade-safety';

const BNB_DECIMALS = 18;
/** Shares of the balance offered as one-tap amounts, in basis points. */
const PORTIONS_BPS = [2500, 5000, 10_000] as const;
/** Price impact, pool fee included, above which the panel says so in plain words. */
const HIGH_IMPACT_BPS = 500;

/**
 * Sell a token for BNB. Shown only while the wallet holds some. Like a buy: set
 * the amount and slippage, then a review that shows token, amount, minimum
 * received, slippage and safety before anything is sent. A first sell of a
 * token needs an approval, which is its own step with its own button.
 */
export function SellPanel({ token }: { token: TokenDetails }) {
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

  // Nothing to sell, or not signed in: the buy panel is the only trade panel.
  if (wallet === null || holding.data === undefined || holding.data === 0n) {
    if (!sell.isSuccess) return null;
  }

  if (sell.isSuccess) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Sold {symbol}</ThemedText>
        <ExternalLink href={bscscanTxUrl(sell.data)}>
          <ThemedText type="linkPrimary">View the transaction on BscScan</ThemedText>
        </ExternalLink>
        <Button
          label="Done"
          onPress={() => {
            sell.reset();
            approve.reset();
            setReviewing(false);
            setText('');
          }}
        />
      </View>
    );
  }

  if (!bnbPool) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Sell</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Selling is only available for tokens brewed with BNB so far.
          {pool ? ` ${symbol} is brewed with ${pool.pairSymbol ?? shortAddress(pool.pairToken)}.` : ''}
        </ThemedText>
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

  const warnings = (
    <>
      {isHighSlippage(slippageBps) ? (
        <ThemedText type="smallBold" style={{ color: theme.sell }}>
          High slippage: you could receive up to {formatSlippage(slippageBps)} less than quoted.
        </ThemedText>
      ) : null}
      {impact !== null && impact >= HIGH_IMPACT_BPS ? (
        <ThemedText type="smallBold" style={{ color: theme.sell }}>
          This sell is large for the pool: the quote is {formatSlippage(impact)} below the current price, pool fee
          included.
        </ThemedText>
      ) : null}
      {noGas ? (
        <ThemedText type="small" style={{ color: theme.sell }}>
          Your wallet has no BNB to pay the network fee. Add a little BNB first.
        </ThemedText>
      ) : null}
    </>
  );

  if (reviewing && ready && amountIn !== null && minOut !== null) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Review your sell</ThemedText>
        <Row label="Token" value={`${symbol} · ${shortAddress(token.address)}`} />
        <Row label="You sell" value={selling} />
        <Row label="You receive about" value={receive} />
        <Row label="Minimum received" value={minimum} />
        <Row label="Slippage" value={formatSlippage(slippageBps)} />
        {warnings}
        <SafetyBadge score={safety.score} />

        {!approved ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Step 1 of 2: allow PancakeSwap&apos;s router to move {selling} from your wallet. This sells nothing yet,
              and allows only this amount.
            </ThemedText>
            <Button
              label={`Approve ${selling}`}
              onPress={() => approve.mutate({ token: token.address, amount: amountIn })}
              loading={approve.isPending || allowance.isFetching}
              disabled={noGas || tooMuch || allowance.data === undefined}
            />
          </>
        ) : (
          <Button
            label={`Confirm: sell ${selling}`}
            onPress={() =>
              sell.mutate({ token: token.address, fee: bnbPool.fee, amountIn, amountOutMinimum: minOut })
            }
            loading={sell.isPending}
            // The safety status must be on screen before anything can be sent.
            disabled={noGas || tooMuch || safety.score === null}
          />
        )}
        <Button label="Back" onPress={() => setReviewing(false)} disabled={sell.isPending || approve.isPending} />
        {approve.isError ? (
          <ThemedText type="small" style={{ color: theme.sell }}>
            The approval did not go through: {approve.error.message}
          </ThemedText>
        ) : null}
        {sell.isError ? (
          <ThemedText type="small" style={{ color: theme.sell }}>
            The sell did not go through: {sell.error.message}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <ThemedText type="smallBold">Sell {symbol} for BNB</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          You hold {formatTokenAmount(balance, token.decimals)}
        </ThemedText>
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={`Amount in ${symbol}`}
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel={`Amount of ${symbol} to sell`}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />
      <View style={styles.options}>
        {PORTIONS_BPS.map((bps) => {
          // The exact amount, not a rounded display, so 100% leaves nothing behind.
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
            {impact !== null ? <Row label="Price impact, fee included" value={formatSlippage(impact)} /> : null}
          </>
        )
      ) : text.trim() !== '' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Enter an amount of {symbol}.
        </ThemedText>
      ) : null}

      {warnings}
      {tooMuch ? (
        <ThemedText type="small" style={{ color: theme.sell }}>
          Your wallet does not hold that much {symbol}.
        </ThemedText>
      ) : null}

      <Button label="Review sell" onPress={() => setReviewing(true)} disabled={!ready || tooMuch} />
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
