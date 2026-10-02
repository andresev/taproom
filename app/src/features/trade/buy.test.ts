import type { Address } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { SWAP_DEADLINE_SECONDS, buildBuyParams, minimumReceived, parseBnbAmount, priceImpactBps } from './buy';

const wbnb = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' as Address;
const token = '0xa908182208fd07b4d790faef7bbdab26afa2fa2f' as Address;
const buyer = '0x00000000000000000000000000000000000000a1' as Address;

describe('parseBnbAmount', () => {
  it('reads a BNB amount as wei', () => {
    expect(parseBnbAmount('0.001')).toBe(1_000_000_000_000_000n);
    expect(parseBnbAmount(' 1 ')).toBe(10n ** 18n);
  });

  it('rejects zero, negatives, text and too many decimals', () => {
    for (const bad of ['', '0', '0.0', '-1', 'abc', '1e18', '0.0000000000000000001', '1,5']) {
      expect(parseBnbAmount(bad), bad).toBeNull();
    }
  });
});

describe('minimumReceived', () => {
  // A real quote: 0.001 BNB for RSUN on BSC, 2026-10-02.
  const quote = 123634286611924632966934n;

  it('takes the slippage allowance off the quote, rounding down', () => {
    expect(minimumReceived(quote, 50)).toBe(123016115178865009802099n);
    expect(minimumReceived(1000n, 300)).toBe(970n);
    expect(minimumReceived(999n, 50)).toBe(994n);
  });

  it('is the quote itself at zero slippage', () => {
    expect(minimumReceived(quote, 0)).toBe(quote);
  });

  it('refuses slippage that is negative, fractional or above the cap', () => {
    for (const bad of [-1, 0.5, 5001, Number.NaN]) {
      expect(() => minimumReceived(quote, bad), String(bad)).toThrow(RangeError);
    }
  });
});

describe('priceImpactBps', () => {
  // Spot price of 0.000001 pair per token, both 18 decimals: 1 pair buys 1,000,000 tokens.
  const spot = 10n ** 30n;
  const onePair = 10n ** 18n;
  const millionTokens = 1_000_000n * 10n ** 18n;

  it('is zero when the quote matches spot', () => {
    expect(priceImpactBps(onePair, millionTokens, spot, 18, 18)).toBe(0);
  });

  it('measures the shortfall against spot, fee included', () => {
    expect(priceImpactBps(onePair, (millionTokens * 99n) / 100n, spot, 18, 18)).toBe(100);
    expect(priceImpactBps(onePair, millionTokens / 2n, spot, 18, 18)).toBe(5000);
  });

  it('never reports a negative impact', () => {
    expect(priceImpactBps(onePair, millionTokens * 2n, spot, 18, 18)).toBe(0);
  });

  it('accounts for different decimals', () => {
    // Pair with 6 decimals: one whole pair unit is 10^6.
    expect(priceImpactBps(10n ** 6n, millionTokens, spot, 18, 6)).toBe(0);
  });

  it('is null without a usable spot price or amount', () => {
    expect(priceImpactBps(onePair, millionTokens, 0n, 18, 18)).toBeNull();
    expect(priceImpactBps(0n, millionTokens, spot, 18, 18)).toBeNull();
  });
});

describe('buildBuyParams', () => {
  const base = { wbnb, token, fee: 10000, recipient: buyer, amountIn: 10n ** 15n, amountOutMinimum: 5n, nowSeconds: 1_790_000_000 };

  it('pays WBNB in, receives the token, to the buyer, with a deadline', () => {
    expect(buildBuyParams(base)).toEqual({
      tokenIn: wbnb,
      tokenOut: token,
      fee: 10000,
      recipient: buyer,
      deadline: BigInt(1_790_000_000 + SWAP_DEADLINE_SECONDS),
      amountIn: 10n ** 15n,
      amountOutMinimum: 5n,
      sqrtPriceLimitX96: 0n,
    });
  });

  it('refuses a swap with no minimum, which would accept any price', () => {
    expect(() => buildBuyParams({ ...base, amountOutMinimum: 0n })).toThrow(/Minimum received/);
  });

  it('refuses a zero amount', () => {
    expect(() => buildBuyParams({ ...base, amountIn: 0n })).toThrow(/Amount/);
  });
});
