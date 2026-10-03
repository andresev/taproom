import type { Address } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { buildPortfolio, valuationPool, type HeldPool, type HeldToken, type LiveRead } from './portfolio';

const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' as Address;
const BREW = '0xfa6d9b504848606eb9aec04ccc161d169b3f2159' as Address;

// RSUN's real WBNB pool and price (shared/src/price.test.ts): the whole 1bn supply
// is worth 8006489484138914645 wei of WBNB at this sqrtPriceX96.
const rsunPool: HeldPool = {
  address: '0x2bf04ebf4e269305b7856cd44d36bf76605f8695' as Address,
  pairToken: WBNB,
  pairSymbol: 'WBNB',
  pairDecimals: 18,
  tokenIsToken0: true,
};
const rsunPrice = 7089255887273613681284658n;
const supply = 1_000_000_000n * 10n ** 18n;

const rsun: HeldToken = {
  token: '0xa908182208fd07b4d790faef7bbdab26afa2fa2f' as Address,
  symbol: 'RSUN',
  name: 'RISING SUN',
  decimals: 18,
  pools: [rsunPool],
};
const other = (token: string, symbol: string, pools: HeldPool[]): HeldToken => ({
  token: token as Address,
  symbol,
  name: symbol,
  decimals: 18,
  pools,
});
const brewPool = (address: string, tokenIsToken0 = true): HeldPool => ({
  address: address as Address,
  pairToken: BREW,
  pairSymbol: 'BREW',
  pairDecimals: 18,
  tokenIsToken0,
});

describe('buildPortfolio', () => {
  it('values a holding at the pool price, in its pair asset', () => {
    const reads = new Map<Address, LiveRead>([[rsun.token, { balance: supply / 100n, sqrtPriceX96: rsunPrice }]]);
    const portfolio = buildPortfolio([rsun], reads);
    // 1% of supply is 1% of the market cap, give or take integer rounding.
    expect(portfolio.holdings[0]?.value).toMatchObject({ pairSymbol: 'WBNB', amount: 80064894841389146n });
    expect(portfolio.totals).toEqual([
      { pairToken: WBNB, pairSymbol: 'WBNB', pairDecimals: 18, amount: 80064894841389146n, holdings: 1 },
    ]);
    expect(portfolio.unvalued).toBe(0);
  });

  it('keeps a total per pair asset and never adds across them', () => {
    const a = other('0x00000000000000000000000000000000000000a1', 'A', [brewPool('0x00000000000000000000000000000000000000b1')]);
    const b = other('0x00000000000000000000000000000000000000a2', 'B', [brewPool('0x00000000000000000000000000000000000000b2')]);
    const q96 = 2n ** 96n; // price 1: one token is worth one BREW
    const reads = new Map<Address, LiveRead>([
      [rsun.token, { balance: supply / 100n, sqrtPriceX96: rsunPrice }],
      [a.token, { balance: 5n, sqrtPriceX96: q96 }],
      [b.token, { balance: 7n, sqrtPriceX96: q96 }],
    ]);
    const { totals, holdings } = buildPortfolio([rsun, a, b], reads);
    expect(totals.map((total) => [total.pairSymbol, total.amount, total.holdings])).toEqual([
      ['BREW', 12n, 2],
      ['WBNB', 80064894841389146n, 1],
    ]);
    // Grouped by pair asset, largest first within each.
    expect(holdings.map((holding) => holding.symbol)).toEqual(['B', 'A', 'RSUN']);
  });

  it('drops a token sold since it was indexed', () => {
    const reads = new Map<Address, LiveRead>([[rsun.token, { balance: 0n, sqrtPriceX96: rsunPrice }]]);
    expect(buildPortfolio([rsun], reads).holdings).toEqual([]);
  });

  it('shows a failed read as unknown, never zero, and leaves it out of the totals', () => {
    const noPrice = buildPortfolio([rsun], new Map([[rsun.token, { balance: 10n, sqrtPriceX96: null }]]));
    expect(noPrice.holdings[0]).toMatchObject({ balance: 10n, value: null });
    expect(noPrice).toMatchObject({ totals: [], unvalued: 1 });

    const noRead = buildPortfolio([rsun], new Map());
    expect(noRead.holdings[0]).toMatchObject({ balance: null, value: null });
    expect(noRead.unvalued).toBe(1);
  });

  it('is empty for a wallet holding nothing', () => {
    expect(buildPortfolio([], new Map())).toEqual({ holdings: [], totals: [], unvalued: 0 });
  });
});

describe('valuationPool', () => {
  it('prefers the WBNB pool, the one a sell goes through', () => {
    const pools = [brewPool('0x00000000000000000000000000000000000000b1'), rsunPool];
    expect(valuationPool(pools)).toBe(rsunPool);
  });

  it('falls back to the first pool, or none', () => {
    const brew = brewPool('0x00000000000000000000000000000000000000b1');
    expect(valuationPool([brew])).toBe(brew);
    expect(valuationPool([])).toBeNull();
  });
});
