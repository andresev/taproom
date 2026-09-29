/**
 * Core domain types, mirroring the draft data model in SPEC.md.
 * The Postgres schema (supabase/migrations) is the source of truth once written;
 * keep these in sync with it.
 */

/** Base58 Solana address (wallet or mint). */
export type SolanaAddress = string;
/** Base58 transaction signature — the dedupe key and log correlation id. */
export type TxSignature = string;

export type TradeSide = "buy" | "sell";
export type WalletSource = "seeded" | "user";

export interface Wallet {
  address: SolanaAddress;
  label: string | null;
  source: WalletSource;
  createdAt: Date;
}

export interface Token {
  mint: SolanaAddress;
  symbol: string | null;
  name: string | null;
  decimals: number;
}

export interface Trade {
  signature: TxSignature;
  wallet: SolanaAddress;
  token: SolanaAddress;
  side: TradeSide;
  /** Integer base units of `token`. Never a float. */
  amountBaseUnits: bigint;
  /** USD figures are display/PnL values from the price API, stored as decimal strings. */
  usdValue: string;
  priceUsd: string;
  blockTime: Date;
}
