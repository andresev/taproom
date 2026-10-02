import { describe, expect, it } from 'vitest';

import { buildReceipt, marketCapMultiple, type ReceiptTradeRow } from './receipt';

// A buy shaped like the indexer returns it. The price is RSUN's real pool price
// (shared/src/price.test.ts): 1bn supply is worth 8006489484138914645 wei of WBNB.
const row: ReceiptTradeRow = {
  id: '0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde-62',
  txHash: '0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde',
  wallet: '0x123aa559ad5381de95d194a73b0db7d229444ada',
  side: 'buy',
  amountBaseUnits: '68947798563584582769212',
  pairAmountBaseUnits: '1287000000000000',
  sqrtPriceX96: '7089255887273613681284658',
  blockTime: '1790879964',
  tokenInfo: {
    address: '0xa908182208fd07b4d790faef7bbdab26afa2fa2f',
    symbol: 'RSUN',
    name: 'RISING SUN',
    decimals: 18,
    totalSupply: '1000000000000000000000000000',
  },
  poolInfo: {
    address: '0x2bf04ebf4e269305b7856cd44d36bf76605f8695',
    pairSymbol: 'WBNB',
    pairDecimals: 18,
    tokenIsToken0: true,
  },
};
const entryCap = 8006489484138914645n;

describe('marketCapMultiple', () => {
  it('divides current by entry', () => {
    expect(marketCapMultiple(100n, 320n)).toBe(3.2);
    expect(marketCapMultiple(100n, 43n)).toBe(0.43);
    expect(marketCapMultiple(100n, 100n)).toBe(1);
  });

  it('is null when there is no entry value to divide by', () => {
    expect(marketCapMultiple(0n, 100n)).toBeNull();
  });
});

describe('buildReceipt', () => {
  it('takes every number from the trade and the chain', () => {
    const result = buildReceipt(row, entryCap * 2n);
    expect(result).toEqual({
      ok: true,
      receipt: {
        id: row.id,
        txHash: row.txHash,
        wallet: row.wallet,
        boughtAt: new Date(1790879964 * 1000),
        token: { address: row.tokenInfo?.address, symbol: 'RSUN', name: 'RISING SUN', decimals: 18 },
        pair: { symbol: 'WBNB', decimals: 18 },
        amountBought: 68947798563584582769212n,
        amountPaid: 1287000000000000n,
        entryMarketCap: entryCap,
        currentMarketCap: entryCap * 2n,
        multiple: 2,
      },
    });
  });

  it('shows a loss as a multiple below one', () => {
    const result = buildReceipt(row, entryCap / 4n);
    // Truncated to four places, never rounded up: a quarter of an odd number of wei is just under 0.25.
    expect(result.ok && result.receipt.multiple).toBe(0.2499);
  });

  it('keeps the entry figures when the current market cap could not be read', () => {
    const result = buildReceipt(row, null);
    expect(result.ok && result.receipt).toMatchObject({ entryMarketCap: entryCap, currentMarketCap: null, multiple: null });
  });

  it('refuses a sell: a receipt proves an entry', () => {
    expect(buildReceipt({ ...row, side: 'sell' }, entryCap)).toEqual({
      ok: false,
      reason: 'A receipt proves a buy. This trade is a sell.',
    });
  });

  it('refuses a trade with no token, pool or price', () => {
    expect(buildReceipt({ ...row, tokenInfo: null }, entryCap).ok).toBe(false);
    expect(buildReceipt({ ...row, poolInfo: null }, entryCap).ok).toBe(false);
    expect(buildReceipt({ ...row, sqrtPriceX96: '0' }, entryCap).ok).toBe(false);
  });
});
