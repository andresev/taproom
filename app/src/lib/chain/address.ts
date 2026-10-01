import type { Address } from '@repo/shared';
import { isAddress } from 'viem';

/**
 * A user-supplied wallet address in the form the database stores and compares:
 * lowercase hex. Returns null for anything that is not an address, including a
 * mixed-case address whose EIP-55 checksum is wrong (a likely typo).
 */
export function normalizeAddress(input: string): Address | null {
  const trimmed = input.trim();
  return isAddress(trimmed) ? (trimmed.toLowerCase() as Address) : null;
}
