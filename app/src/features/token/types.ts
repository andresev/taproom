import type { Address, TradeSide, TxHash } from '@repo/shared';

/** One pool a token trades in, as the token page shows it. */
export interface TokenPool {
  address: Address;
  /** The asset the token was brewed with. */
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  /** Pool fee in hundredths of a basis point: 10000 is 1%. */
  fee: number;
  /** Whether the token is the pool's token0, which decides how the pool price is read. */
  tokenIsToken0: boolean;
}

/** One address's indexed balance of the token. */
export interface TokenHolder {
  holder: Address;
  /** Base units. */
  balance: bigint;
}

export interface TokenTrade {
  id: string;
  txHash: TxHash;
  wallet: Address;
  side: TradeSide;
  /** Base units of the token. */
  amountBaseUnits: bigint;
  /** Base units of the pair asset paid (buy) or received (sell). */
  pairAmountBaseUnits: bigint;
  pairSymbol: string | null;
  pairDecimals: number;
  time: Date;
}

/** Everything the token page reads from the indexer in one request. */
export interface TokenDetails {
  address: Address;
  symbol: string | null;
  name: string | null;
  decimals: number;
  /** Integer base units. */
  totalSupply: bigint;
  /** Dev wallet: the wallet that launched the token. */
  deployer: Address;
  launchTxHash: TxHash;
  launchedAt: Date;
  pools: TokenPool[];
  /** Addresses with a balance, the pool and burn address included. Null if the indexer has none yet. */
  holderCount: number | null;
  /** The largest balances, largest first, the pool and burn address included. */
  largestHolders: TokenHolder[];
  /** Newest first. */
  recentTrades: TokenTrade[];
}
