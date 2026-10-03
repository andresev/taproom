import { describe, expect, it } from 'vitest';

import { toReceiptList, type MyReceiptsResponse } from './receipt-list';

// A real buy (BSC, 2026-10-01): wallet 0x71cd9e116c36bb7133f731b0bc185413805cc852 bought
// BKA for 46 BREW. The second row is the same buy with its pool missing.
const buy: MyReceiptsResponse['trades']['items'][number] = {
  id: '0x5f1f5e1fbc7a55dbbd8b0c2e5f7f1c0a2a1c8d6bb2f0d4a7b4c1d0e9f8a7b6c5-12',
  amountBaseUnits: '74469625729390315039559',
  pairAmountBaseUnits: '46000000000000000000',
  blockTime: '1790857797',
  tokenInfo: { address: '0x806126b2b2b6815b2ae2b753a33d8eb0e30963b2', symbol: 'BKA', decimals: 18 },
  poolInfo: { pairSymbol: 'BREW', pairDecimals: 18 },
};

describe('toReceiptList', () => {
  it('turns indexed buys into list items with exact amounts', () => {
    const { items, more } = toReceiptList({ trades: { items: [buy], pageInfo: { hasNextPage: false } } });
    expect(more).toBe(false);
    expect(items).toEqual([
      {
        id: buy.id,
        token: '0x806126b2b2b6815b2ae2b753a33d8eb0e30963b2',
        tokenSymbol: 'BKA',
        tokenDecimals: 18,
        pairSymbol: 'BREW',
        pairDecimals: 18,
        amountBought: 74469625729390315039559n,
        amountPaid: 46000000000000000000n,
        boughtAt: new Date(1790857797 * 1000),
      },
    ]);
  });

  it('leaves out a buy that could not become a receipt, and passes on that more exist', () => {
    const { items, more } = toReceiptList({
      trades: { items: [{ ...buy, id: 'missing-pool', poolInfo: null }, buy], pageInfo: { hasNextPage: true } },
    });
    expect(items.map((item) => item.id)).toEqual([buy.id]);
    expect(more).toBe(true);
  });
});
