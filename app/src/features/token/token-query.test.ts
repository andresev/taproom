import { describe, expect, it } from 'vitest';

import { toTokenDetails, type TokenResponse } from './token-query';

// A real response from the indexer for RSUN (BSC, 2026-10-01), trimmed to two trades.
const response: TokenResponse = {
  token: {
    address: '0xa908182208fd07b4d790faef7bbdab26afa2fa2f',
    symbol: 'RSUN',
    name: 'RISING SUN',
    decimals: 18,
    totalSupply: '1000000000000000000000000000',
    deployer: '0x77de6a0ed0ad7479e2e7de553cfe9452438cd8b5',
    launchTxHash: '0x115bdbe0e8d1695050a12ea98bb0d6ee150d9927f4f626829301906f57603e2e',
    launchedAt: '1790874366',
  },
  pools: {
    items: [
      {
        address: '0x2bf04ebf4e269305b7856cd44d36bf76605f8695',
        pairToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
        pairSymbol: 'WBNB',
        pairDecimals: 18,
        fee: 10000,
        tokenIsToken0: true,
      },
    ],
  },
  tokenStats: { holderCount: 23 },
  holders: {
    items: [
      { holder: '0x2bf04ebf4e269305b7856cd44d36bf76605f8695', balance: '994554673734090530332703143' },
      { holder: '0x000000000000000000000000000000000000dead', balance: '5209164162437379923853662' },
    ],
  },
  trades: {
    items: [
      {
        id: '0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde-62',
        txHash: '0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde',
        wallet: '0x123aa559ad5381de95d194a73b0db7d229444ada',
        side: 'buy',
        amountBaseUnits: '68947798563584582769212',
        pairAmountBaseUnits: '1287000000000000',
        blockTime: '1790879964',
        poolInfo: { pairSymbol: 'WBNB', pairDecimals: 18 },
      },
      {
        id: '0xab1397f3a8cc162dc78eb58c36f9120d41a3e2db1a8f560763fea93d8bf1457d-294',
        txHash: '0xab1397f3a8cc162dc78eb58c36f9120d41a3e2db1a8f560763fea93d8bf1457d',
        wallet: '0xdf7801c5646f8f667a1a73ab95e798a5bc977a0e',
        side: 'sell',
        amountBaseUnits: '781389976499661365578509',
        pairAmountBaseUnits: '14310845846743980',
        blockTime: '1790879643',
        poolInfo: { pairSymbol: 'WBNB', pairDecimals: 18 },
      },
    ],
  },
};

describe('toTokenDetails', () => {
  it('returns null when the indexer has no such token', () => {
    const empty = { token: null, pools: { items: [] }, trades: { items: [] }, tokenStats: null, holders: { items: [] } };
    expect(toTokenDetails(empty)).toBeNull();
  });

  it('keeps supply and amounts as exact bigints and times as dates', () => {
    const details = toTokenDetails(response);
    expect(details).toMatchObject({
      symbol: 'RSUN',
      decimals: 18,
      totalSupply: 1000000000000000000000000000n,
      launchedAt: new Date(1790874366 * 1000),
      pools: [{ pairSymbol: 'WBNB', fee: 10000, tokenIsToken0: true }],
      holderCount: 23,
    });
    expect(details?.largestHolders[0]?.balance).toBe(994554673734090530332703143n);
    expect(details?.recentTrades[0]).toMatchObject({
      side: 'buy',
      amountBaseUnits: 68947798563584582769212n,
      pairAmountBaseUnits: 1287000000000000n,
      time: new Date(1790879964 * 1000),
    });
  });

  it('keeps trades in the order the indexer returned them, newest first', () => {
    expect(toTokenDetails(response)?.recentTrades.map((trade) => trade.side)).toEqual(['buy', 'sell']);
  });

  it('reports an unknown holder count when the indexer has no stats row', () => {
    expect(toTokenDetails({ ...response, tokenStats: null })?.holderCount).toBeNull();
  });

  it('drops a trade whose pool is missing instead of guessing decimals', () => {
    const [first, second] = response.trades.items;
    const broken = { ...response, trades: { items: [{ ...first!, poolInfo: null }, second!] } };
    expect(toTokenDetails(broken)?.recentTrades.map((trade) => trade.side)).toEqual(['sell']);
  });
});
