import type { Address } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { DEFAULT_FEED_FILTERS, FEED_WINDOWS, WINDOW_SECONDS, applyFeedFilters } from './feed-filters';
import type { TokenActivity } from './types';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 12, minute));
const deployer = '0x00000000000000000000000000000000000000d1' as Address;

function activity(symbol: string, overrides: Partial<TokenActivity>): TokenActivity {
  return {
    tokenAddress: `0x${symbol.toLowerCase().padEnd(40, '0')}` as Address,
    tokenSymbol: symbol,
    tokenName: null,
    buys: 1,
    sells: 0,
    buyShare: 1,
    volume: null,
    walletCount: 1,
    wallets: [],
    launch: null,
    lastTime: at(0),
    ...overrides,
  };
}

const symbols = (list: TokenActivity[]) => list.map((item) => item.tokenSymbol);

describe('applyFeedFilters', () => {
  it('defaults to trending over 24 hours with no side filter', () => {
    expect(DEFAULT_FEED_FILTERS).toEqual({ sort: 'trending', window: '24h', buyingOnly: false });
  });

  it('ranks trending by distinct wallets, then trades, then recency', () => {
    const list = [
      activity('QUIET', { walletCount: 1, buys: 40, lastTime: at(50) }),
      activity('BUSY', { walletCount: 9, buys: 9, lastTime: at(1) }),
      activity('TIE_FEW', { walletCount: 4, buys: 4, lastTime: at(30) }),
      activity('TIE_MANY', { walletCount: 4, buys: 6, sells: 2, lastTime: at(2) }),
      activity('TIE_OLD', { walletCount: 4, buys: 4, lastTime: at(10) }),
    ];
    expect(symbols(applyFeedFilters(list, { sort: 'trending', buyingOnly: false }))).toEqual([
      'BUSY',
      'TIE_MANY',
      'TIE_FEW',
      'TIE_OLD',
      'QUIET',
    ]);
  });

  it('orders latest by most recent activity', () => {
    const list = [activity('OLD', { lastTime: at(1) }), activity('NEW', { lastTime: at(9), walletCount: 1 })];
    expect(symbols(applyFeedFilters(list, { sort: 'latest', buyingOnly: false }))).toEqual(['NEW', 'OLD']);
  });

  it('keeps only tokens launched in the window for new launches, newest first', () => {
    const list = [
      activity('EARLY', { launch: { wallet: deployer, time: at(2) }, lastTime: at(40) }),
      activity('NOT_NEW', { launch: null, lastTime: at(59) }),
      activity('FRESH', { launch: { wallet: deployer, time: at(20) }, lastTime: at(20) }),
    ];
    expect(symbols(applyFeedFilters(list, { sort: 'launches', buyingOnly: false }))).toEqual(['FRESH', 'EARLY']);
  });

  it('keeps only tokens with more buying than selling when asked', () => {
    const list = [
      activity('BUYING', { buyShare: 0.8 }),
      activity('EVEN', { buyShare: 0.5 }),
      activity('SELLING', { buyShare: 0.2 }),
      activity('UNTRADED', { buyShare: null, buys: 0 }),
    ];
    expect(symbols(applyFeedFilters(list, { sort: 'latest', buyingOnly: true }))).toEqual(['BUYING']);
  });

  it('offers windows up to 30 days', () => {
    expect(FEED_WINDOWS).toEqual(['1h', '6h', '24h', '7d', '30d']);
    expect(WINDOW_SECONDS['7d']).toBe(604800);
    expect(WINDOW_SECONDS['30d']).toBe(2592000);
  });

  it('does not reorder the list it was given', () => {
    const list = [activity('A', { walletCount: 1 }), activity('B', { walletCount: 5 })];
    applyFeedFilters(list, { sort: 'trending', buyingOnly: false });
    expect(symbols(list)).toEqual(['A', 'B']);
  });
});
