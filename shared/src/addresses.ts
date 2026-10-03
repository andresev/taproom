import type { Address } from "./types.js";

export const BSC_CHAIN_ID = 56;

const BREW_SITE_BUNDLE = "https://brew.family/assets/index-Buq068vX.js";

/**
 * Every contract address the app or indexer may touch, lowercase. `null` means
 * "not yet confirmed": never guess or invent one. Each confirmed entry says where
 * it came from. Shared so the app and the indexer cannot drift apart; the app
 * re-exports this from app/src/lib/chain/addresses.ts.
 *
 * Brew addresses were read on 2026-10-01 from the contract config in Brew's own
 * site bundle (BREW_SITE_BUNDLE above) and each was checked to have code on BSC.
 */
export const ADDRESSES = {
  /** $BREW token. Matches Brew's site bundle; has code on-chain. */
  brewToken: "0xfa6d9b504848606eb9aec04ccc161d169b3f2159",
  /**
   * Brew standard launch factory: emits TokenLaunched, one PancakeSwap V3 pool per
   * token. A launch through it, with the event decoded as indexer/abis expects:
   * https://bscscan.com/tx/0xc647d09d80d7669c628d668dec0c8f6e2872907c89d688fd22f9ca2f26f8ea1a
   */
  brewFactory: "0xeea6c3bfb29fd9a35380438956bae7b109c63d85",
  /** Brew dividend factory (DividendTokenLaunched). Recorded, not indexed yet. */
  brewDividendFactory: "0xd31ce1c4da94483abf536d613f66f55ad1abc8f5",
  /** Brew multi-pair factory v1 (TokenLaunchedMultiPair). Indexed since docs/0012. */
  brewMultiPairFactory: "0x21653fa9c9562d55a162c17d2ef33fc0fab7ea71",
  /** Brew multi-pair factory v2 (LaunchStarted / PoolAdded / LaunchCompleted). Indexed since docs/0012. */
  brewMultiPairFactoryV2: "0x0f8708a91d8e3b3458be94d32caa6e62e98daedc",
  /**
   * PancakeSwap V3 factory. Listed at
   * https://developer.pancakeswap.finance/contracts/v3/addresses and in Brew's
   * bundle, and returned by `factory()` on the pools Brew launches create.
   */
  pancakeV3Factory: "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865",
  /**
   * PancakeSwap V3 SwapRouter, from the PancakeSwap address page above. Chosen
   * over the Smart Router that Brew's site uses because its source is published
   * (pancake-v3-contracts, v3-periphery/SwapRouter.sol) and its swap takes a
   * deadline. Checked on-chain: `factory()` and `WETH9()` return the factory and
   * WBNB recorded here, and a simulated buy returned exactly the quoter's amount.
   */
  pancakeV3SwapRouter: "0x1b81d678ffb9c0263b24a97847620c99d213eb14",
  /** PancakeSwap QuoterV2, from the PancakeSwap address page above. Has code on-chain. */
  pancakeV3Quoter: "0xb048bbc1ee6b733fffcfb9e9cef7375518e25997",
  /** WBNB, from Brew's bundle. Has code on-chain. */
  wbnb: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
} as const satisfies Record<string, Address | null>;

/** Where the Brew addresses above were read from. */
export const BREW_ADDRESS_SOURCE = BREW_SITE_BUNDLE;

export type AddressName = keyof typeof ADDRESSES;

/**
 * The block each Brew factory was created in. Nothing a factory launched can be
 * older, so indexing from here misses none of its launches.
 *
 * Found on 2026-10-02 as the first block at which the address has code
 * (`eth_getCode` against an archive node), then confirmed by the creation
 * transaction in that block, whose receipt names the factory as the contract it
 * created. Brew's own site bundle records the same block for multi-pair v2.
 */
export const DEPLOYMENT_BLOCKS = {
  /** 2026-09-05. Creation: https://bscscan.com/tx/0xab8a11fbd64ab1efded17231c99ab612a8dd8857e44bdcd4bc40476bd2ed37ae */
  brewFactory: 120_201_671,
  /** 2026-09-06. Creation: https://bscscan.com/tx/0xc5be8f95165e70add3d956244cb3b56a9159921fd78d5db0adbde45c4ced6ac3 */
  brewDividendFactory: 120_354_791,
  /** 2026-09-06. Creation: https://bscscan.com/tx/0x57c09b37297d4dda6d807e20727574640c1a5f0d15bce396995227bcb9fc7810 */
  brewMultiPairFactory: 120_388_203,
  /** 2026-09-14. Creation: https://bscscan.com/tx/0x01e96c61a1e56986bef5f1132687316dfcdc0251d73b46fdf297eb23bd1dbe39 */
  brewMultiPairFactoryV2: 121_813_753,
} as const satisfies Partial<Record<AddressName, number>>;

/** Returns a confirmed address, or throws rather than letting a caller proceed without one. */
export function requireAddress(name: AddressName): Address {
  const address: Address | null = ADDRESSES[name];
  if (address === null) {
    throw new Error(`Address "${name}" is not confirmed yet; see shared/src/addresses.ts`);
  }
  return address;
}
