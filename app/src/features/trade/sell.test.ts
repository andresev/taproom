import type { Address } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { SWAP_DEADLINE_SECONDS } from './buy';
import { buildSellCalls, isApproved, parseTokenAmount, portionOf, sellPriceImpactBps } from './sell';

const wbnb = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' as Address;
const token = '0xa908182208fd07b4d790faef7bbdab26afa2fa2f' as Address;
const seller = '0x00000000000000000000000000000000000000a1' as Address;

// A real round trip on RSUN's WBNB pool (BSC, 2026-10-02), simulated: 0.001 BNB bought
// this many tokens, and selling them all back returned 0.000980101221506712 BNB.
const bought = 123634286611924632966934n;
const returned = 980101221506712n;

describe('parseTokenAmount', () => {
  it('reads an amount in the token’s decimals', () => {
    expect(parseTokenAmount('1.5', 18)).toBe(1_500_000_000_000_000_000n);
    expect(parseTokenAmount(' 2 ', 6)).toBe(2_000_000n);
  });

  it('rejects zero, negatives, text and more decimals than the token has', () => {
    for (const bad of ['', '0', '-1', 'abc', '1e5', '0.0000001']) {
      expect(parseTokenAmount(bad, 6), bad).toBeNull();
    }
  });
});

describe('portionOf', () => {
  it('takes a share of the balance, rounding down', () => {
    expect(portionOf(1000n, 2500)).toBe(250n);
    expect(portionOf(999n, 5000)).toBe(499n);
  });

  it('is the whole balance at 100%, so nothing is left behind', () => {
    expect(portionOf(bought, 10_000)).toBe(bought);
  });

  it('refuses shares that are not between 0 and 100%', () => {
    for (const bad of [0, -1, 10_001, 0.5]) expect(() => portionOf(1000n, bad), String(bad)).toThrow(RangeError);
  });
});

describe('sellPriceImpactBps', () => {
  it('is zero when the quote matches the spot price', () => {
    // 1,000 tokens at 0.002 pair per token is worth 2 pair-asset units.
    const price = 2n * 10n ** 33n; // 0.002 × 1e36
    expect(sellPriceImpactBps(1000n * 10n ** 18n, 2n * 10n ** 18n, price, 18, 18)).toBe(0);
  });

  it('includes the pool fee and the price move', () => {
    const price = 2n * 10n ** 33n;
    // The quote pays 1.9 instead of 2: 5% less.
    expect(sellPriceImpactBps(1000n * 10n ** 18n, 19n * 10n ** 17n, price, 18, 18)).toBe(500);
  });

  it('handles tokens and pair assets with different decimals', () => {
    // 1,000 six-decimal tokens at 0.002 of an 18-decimal asset each.
    expect(sellPriceImpactBps(1000n * 10n ** 6n, 2n * 10n ** 18n, 2n * 10n ** 33n, 6, 18)).toBe(0);
  });

  it('is null without a spot price or an amount', () => {
    expect(sellPriceImpactBps(1000n, 10n, 0n, 18, 18)).toBeNull();
    expect(sellPriceImpactBps(0n, 10n, 10n ** 36n, 18, 18)).toBeNull();
  });
});

describe('buildSellCalls', () => {
  const now = 1_790_900_000;
  const calls = buildSellCalls({
    wbnb,
    token,
    fee: 10_000,
    seller,
    amountIn: bought,
    amountOutMinimum: returned,
    nowSeconds: now,
  });

  it('swaps the token for WBNB kept by the router, with the minimum and a deadline', () => {
    expect(calls.swap).toEqual({
      tokenIn: token,
      tokenOut: wbnb,
      fee: 10_000,
      recipient: '0x0000000000000000000000000000000000000000',
      deadline: BigInt(now + SWAP_DEADLINE_SECONDS),
      amountIn: bought,
      amountOutMinimum: returned,
      sqrtPriceLimitX96: 0n,
    });
  });

  it('unwraps to BNB for the seller, with the same minimum', () => {
    expect(calls.unwrap).toEqual({ amountMinimum: returned, recipient: seller });
  });

  it('refuses a sell with no minimum, or of nothing', () => {
    const base = { wbnb, token, fee: 10_000, seller, nowSeconds: now };
    expect(() => buildSellCalls({ ...base, amountIn: bought, amountOutMinimum: 0n })).toThrow(RangeError);
    expect(() => buildSellCalls({ ...base, amountIn: 0n, amountOutMinimum: 1n })).toThrow(RangeError);
  });
});

describe('isApproved', () => {
  it('needs an allowance at least as large as the sell', () => {
    expect(isApproved(bought, bought)).toBe(true);
    expect(isApproved(bought - 1n, bought)).toBe(false);
    expect(isApproved(0n, 1n)).toBe(false);
  });
});
