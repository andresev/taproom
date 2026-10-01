import type { Address } from '@repo/shared';

/** A wallet as shown in search results and follow lists. */
export interface WalletSummary {
  /** Lowercase hex. */
  address: Address;
  /** Null when the wallet has no profile or its profile has no name yet. */
  displayName: string | null;
}
