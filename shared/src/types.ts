/**
 * Core domain types shared by the app and the indexer.
 * The indexer schema (indexer/ponder.schema.ts) is the source of truth for
 * on-chain data; keep these in sync with it.
 */

/** EVM address (wallet, token or pool), lowercase hex. */
export type Address = `0x${string}`;
/** Transaction hash, lowercase hex. */
export type TxHash = `0x${string}`;

export type TradeSide = "buy" | "sell";

export interface Token {
  address: Address;
  symbol: string | null;
  name: string | null;
  decimals: number;
  /** Integer base units. */
  totalSupply: bigint;
  /** Dev wallet: the wallet that launched the token. */
  deployer: Address;
  /** The asset the token was brewed with (WBNB, $BREW, a memecoin or a bStock). */
  pairToken: Address;
  /** PancakeSwap V3 pool created at launch. */
  pool: Address;
  launchTxHash: TxHash;
  launchedAt: Date;
}

export interface Trade {
  /** With `logIndex`, the dedupe key: one transaction can contain several swaps. */
  txHash: TxHash;
  logIndex: number;
  wallet: Address;
  token: Address;
  side: TradeSide;
  /** Integer base units of `token`. Never a float. */
  amountBaseUnits: bigint;
  /** What was paid (buy) or received (sell). */
  pairToken: Address;
  /** Integer base units of `pairToken`. */
  pairAmountBaseUnits: bigint;
  blockNumber: bigint;
  blockTime: Date;
}

export interface Profile {
  walletAddress: Address;
  displayName: string | null;
  createdAt: Date;
}
