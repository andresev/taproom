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

  it('throws for an unconfirmed address instead of returning a placeholder', () => {
    expect(() => requireAddress('pancakeV3SwapRouter')).toThrow(/not confirmed/);
  });
});
