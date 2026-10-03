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
  /** The launch factory that created the token. */
  factory: Address;
  /** As emitted at launch: usually a data: URI holding JSON with a description and image. */
  metadataUri: string | null;
  launchTxHash: TxHash;
  launchedAt: Date;
}

/** A PancakeSwap V3 pool created by a Brew launch. Multi-pair launches create several per token. */
export interface Pool {
  address: Address;
  token: Address;
  /** The asset the token was brewed with (WBNB, $BREW, a memecoin or a bStock). */
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  /** Pool fee in hundredths of a basis point: 10000 is 1%. */
  fee: number;
}

export interface Trade {
  /** With `logIndex`, the dedupe key: one transaction can contain several swaps. */
  txHash: TxHash;
  logIndex: number;
  /** The wallet that sent the transaction. */
  wallet: Address;
  token: Address;
  pool: Address;
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
