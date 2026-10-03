import { describe, expect, it } from 'vitest';

import { receiptPageUrlFrom } from './receipt-link';

const id = '0xea19a9b3582c0c50cad461c0aaa4b388d8ffbd6b2f2552b566fd56f86dae9bde-62';

describe('receiptPageUrlFrom', () => {
  it('puts the trade id under /r/ on the configured site', () => {
    expect(receiptPageUrlFrom('https://receipts.example.com', id)).toBe(`https://receipts.example.com/r/${id}`);
    expect(receiptPageUrlFrom('https://receipts.example.com/', id)).toBe(`https://receipts.example.com/r/${id}`);
    expect(receiptPageUrlFrom('http://localhost:42069', id)).toBe(`http://localhost:42069/r/${id}`);
  });

  it('gives no link when the site is not configured or not a web address', () => {
    expect(receiptPageUrlFrom(undefined, id)).toBeNull();
    expect(receiptPageUrlFrom('', id)).toBeNull();
    expect(receiptPageUrlFrom('receipts.example.com', id)).toBeNull();
    expect(receiptPageUrlFrom('javascript:alert(1)', id)).toBeNull();
  });
});
