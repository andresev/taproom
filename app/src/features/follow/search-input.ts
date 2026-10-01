import type { Address } from '@repo/shared';

import { normalizeAddress } from '@/lib/chain/address';

/** Shortest name search worth sending; matches the minimum display name length. */
export const MIN_NAME_QUERY = 3;

export type SearchInput =
  | { kind: 'empty' }
  | { kind: 'too-short' }
  /** A full wallet address: any wallet can be followed, with or without a profile. */
  | { kind: 'address'; address: Address }
  /** `pattern` is a SQL LIKE prefix pattern with the user's wildcards escaped. */
  | { kind: 'name'; pattern: string };

/** Decides what the Discover search box is asking for. */
export function parseSearchInput(text: string): SearchInput {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };

  const address = normalizeAddress(trimmed);
  if (address) return { kind: 'address', address };

  if (trimmed.length < MIN_NAME_QUERY) return { kind: 'too-short' };
  return { kind: 'name', pattern: `${trimmed.replace(/[\\%_]/g, '\\$&')}%` };
}
