import type { Address } from 'viem';

export const BSC_CHAIN_ID = 56;

/**
 * Every contract address the app or indexer may touch. `null` means "not yet
 * confirmed": never guess or invent one. Each confirmed entry needs a comment
 * linking the BscScan page or transaction it was verified against.
 */
export const ADDRESSES = {
  /** $BREW token. Taken from CLAUDE.md and NOT yet verified on BscScan. */
  brewToken: '0xfa6d9b504848606eb9aec04ccc161d169b3f2159',
  /**
   * TODO: Brew launch factory. Find it by opening a known Brew launch transaction
   * on BscScan and reading which contract created the token; link that tx here.
   */
  brewFactory: null,
  /** TODO: PancakeSwap V3 contracts on BSC. Confirm against PancakeSwap's published deployments. */
  pancakeV3Factory: null,
  pancakeV3SwapRouter: null,
  pancakeV3Quoter: null,
  /** TODO: WBNB on BSC. */
  wbnb: null,
} as const satisfies Record<string, Address | null>;

export type AddressName = keyof typeof ADDRESSES;

/** Returns a confirmed address, or throws rather than letting a caller proceed without one. */
export function requireAddress(name: AddressName): Address {
  const address: Address | null = ADDRESSES[name];
  if (address === null) {
    throw new Error(`Address "${name}" is not confirmed yet; see src/lib/chain/addresses.ts`);
  }
  return address;
}
