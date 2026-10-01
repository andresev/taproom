import type { Address } from '@repo/shared';

/** Everything the feed knows about one token in its time window, for one row. */
export interface TokenActivity {
  tokenAddress: Address;
  tokenSymbol: string | null;
  tokenName: string | null;
  buys: number;
  sells: number;
  /**
   * Share of the activity that is buying, 0 to 1. By pair-token volume when every
   * trade used the same pair asset, otherwise by number of trades. Null when
   * there are no trades (a launch with nothing bought yet).
   */
  buyShare: number | null;
  /** Totals in the pair asset. Null when trades used different pair assets, which cannot be added up. */
  volume: { pairSymbol: string | null; pairDecimals: number; bought: bigint; sold: bigint } | null;
  /** Distinct wallets that traded the token in the window. */
  walletCount: number;
  /** Those wallets, lowercase. Only filled in the followed-wallets feed. */
  wallets: Address[];
  /** Set when the launch itself falls inside the window. */
  launch: { wallet: Address; time: Date } | null;
  /** Most recent trade, or the launch if nothing has traded. */
  lastTime: Date;
}
