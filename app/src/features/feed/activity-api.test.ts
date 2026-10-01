import { describe, expect, it } from 'vitest';

import { toTokenActivities, type ActivityRow } from './activity-api';

// Shaped like the indexer's POST /activity response; RSUN's totals are real ones from 2026-10-01.
const rsun: ActivityRow = {
  tokenAddress: '0xa908182208fd07b4d790faef7bbdab26afa2fa2f',
  tokenSymbol: 'RSUN',
  tokenName: 'RISING SUN',
  buys: 65,
  sells: 32,
  volume: { pairSymbol: 'WBNB', pairDecimals: 18, bought: '8082006170754683828', sold: '3813019881432552354' },
  walletCount: 41,
  wallets: [],
  launch: { wallet: '0x77de6a0ed0ad7479e2e7de553cfe9452438cd8b5', time: 1790874366 },
  lastTime: 1790879964,
};

describe('toTokenActivities', () => {
  it('keeps amounts as exact bigints and times as dates', () => {
    const [activity] = toTokenActivities({ items: [rsun] });
    expect(activity).toMatchObject({
      tokenSymbol: 'RSUN',
      buys: 65,
      sells: 32,
      walletCount: 41,
      volume: { pairSymbol: 'WBNB', pairDecimals: 18, bought: 8082006170754683828n, sold: 3813019881432552354n },
      launch: { wallet: rsun.launch?.wallet, time: new Date(1790874366 * 1000) },
      lastTime: new Date(1790879964 * 1000),
    });
  });

  it('takes the buy share from volume when there is one pair asset', () => {
    const [activity] = toTokenActivities({ items: [rsun] });
    // 8.082 bought of 11.895 total
    expect(activity?.buyShare).toBeCloseTo(0.6794, 4);
  });

  it('falls back to trade counts when volume cannot be added up', () => {
    const [activity] = toTokenActivities({ items: [{ ...rsun, volume: null, buys: 3, sells: 1 }] });
    expect(activity?.volume).toBeNull();
    expect(activity?.buyShare).toBe(0.75);
  });

  it('has no buy share for a launch that nothing has traded', () => {
    const untraded = { ...rsun, buys: 0, sells: 0, volume: null, walletCount: 0 };
    expect(toTokenActivities({ items: [untraded] })[0]?.buyShare).toBeNull();
  });

  it('returns nothing for an empty response', () => {
    expect(toTokenActivities({ items: [] })).toEqual([]);
  });
});
