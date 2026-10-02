import { describe, expect, it } from 'vitest';

import { ADDRESSES, requireAddress } from './addresses';

describe('addresses', () => {
  it('only holds well-formed lowercase addresses or null', () => {
    for (const [name, address] of Object.entries(ADDRESSES)) {
      if (address !== null) expect(address, name).toMatch(/^0x[0-9a-f]{40}$/);
    }
  });

  it('returns a confirmed address', () => {
    expect(requireAddress('brewToken')).toBe(ADDRESSES.brewToken);
  });

  it('has every address the swap flow needs confirmed', () => {
    for (const name of ['pancakeV3SwapRouter', 'pancakeV3Quoter', 'wbnb'] as const) {
      expect(requireAddress(name)).toBe(ADDRESSES[name]);
    }
  });
});
