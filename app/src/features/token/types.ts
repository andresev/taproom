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
  /** Newest first. */
  recentTrades: TokenTrade[];
}
