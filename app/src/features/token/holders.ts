import type { Address } from '@repo/shared';

import type { TokenHolder } from './types';

/** The conventional burn address. Brew sends the token side of its trading fee here. */
export const BURN_ADDRESS = '0x000000000000000000000000000000000000dead' as Address;

/**
 * Share of supply held by the ten largest holders, 0 to 1, leaving out the
 * addresses in `excluded` (the token's pools and the burn address), which are
 * not anyone's holdings. `holders` must be largest first. Null when the supply
 * is zero or unknown.
 */
export function topTenShare(
  holders: readonly TokenHolder[],
  excluded: readonly Address[],
  totalSupply: bigint,
): number | null {
  if (totalSupply <= 0n) return null;
  const skip = new Set(excluded.map((address) => address.toLowerCase()));
  const held = holders
    .filter((row) => !skip.has(row.holder.toLowerCase()))
    .slice(0, 10)
    .reduce((total, row) => total + row.balance, 0n);
  return Number((held * 10_000n) / totalSupply) / 10_000;
}
