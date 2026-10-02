import type { Address } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { BURN_ADDRESS, topTenShare } from './holders';

const pool = '0x2bf04ebf4e269305b7856cd44d36bf76605f8695' as Address;
const wallet = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as Address;
const supply = 1_000n;

describe('topTenShare', () => {
  it('leaves the pool and burn address out', () => {
    const holders = [
      { holder: pool, balance: 900n },
      { holder: BURN_ADDRESS, balance: 50n },
      { holder: wallet(1), balance: 30n },
      { holder: wallet(2), balance: 20n },
    ];
    expect(topTenShare(holders, [pool, BURN_ADDRESS], supply)).toBe(0.05);
  });

  it('counts only the ten largest remaining holders', () => {
    const holders = Array.from({ length: 12 }, (_, i) => ({ holder: wallet(i + 1), balance: 10n }));
    expect(topTenShare(holders, [], supply)).toBe(0.1);
  });

  it('matches excluded addresses whatever their casing', () => {
    const holders = [{ holder: pool, balance: 900n }];
    expect(topTenShare(holders, [pool.toUpperCase().replace('0X', '0x') as Address], supply)).toBe(0);
  });

  it('is zero with no holders and null without a supply', () => {
    expect(topTenShare([], [], supply)).toBe(0);
    expect(topTenShare([{ holder: wallet(1), balance: 1n }], [], 0n)).toBeNull();
  });
});
