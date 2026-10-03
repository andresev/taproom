import { z } from "zod";

/**
 * The pure parts of POST /record: the request and response shapes. The route
 * in api/index.ts adds up a wallet's indexed trades per token and pair asset;
 * the record maths is in @repo/shared (shared/src/record.ts), and the app runs it.
 */

/** Most positions returned, newest trade first. A busier wallet's record says it is cut short. */
export const RECORD_POSITION_LIMIT = 500;

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase() as `0x${string}`);

export const recordRequestSchema = z.object({ wallet: address });

/** One pair asset of a position. Amounts are base-unit integers as strings. */
export interface PositionLegJson {
  pairToken: `0x${string}`;
  pairSymbol: string | null;
  pairDecimals: number;
  buys: number;
  sells: number;
  tokensBought: string;
  tokensSold: string;
  paid: string;
  received: string;
}

/** A wallet's indexed trades in one token. Times are unix seconds. */
export interface PositionFactsJson {
  token: `0x${string}`;
  symbol: string | null;
  name: string | null;
  decimals: number;
  legs: PositionLegJson[];
  firstTradeAt: number;
  lastTradeAt: number;
  /** The wallet's indexed balance of the token now, or null if none was recorded. */
  balance: string | null;
}

export interface RecordResponse {
  wallet: `0x${string}`;
  positions: PositionFactsJson[];
  /** True when the wallet has more positions than RECORD_POSITION_LIMIT; only the newest are returned. */
  truncated: boolean;
}

export interface LegRow {
  token: `0x${string}`;
  pairToken: `0x${string}`;
  pairSymbol: string | null;
  pairDecimals: number;
  buys: number;
  sells: number;
  tokensBought: string;
  tokensSold: string;
  paid: string;
  received: string;
  firstTradeAt: string;
  lastTradeAt: string;
}

export interface TokenInfo {
  symbol: string | null;
  name: string | null;
  decimals: number;
}

/**
 * Groups per-pair rows into positions, newest trade first, and cuts the list at
 * `limit`. Rows for a token the indexer has no launch for are left out: that
 * token was launched outside the indexed history (docs/0012).
 */
export function toPositions(
  rows: LegRow[],
  tokens: Map<`0x${string}`, TokenInfo>,
  balances: Map<`0x${string}`, string>,
  limit: number = RECORD_POSITION_LIMIT,
): { positions: PositionFactsJson[]; truncated: boolean } {
  const byToken = new Map<`0x${string}`, PositionFactsJson>();
  for (const row of rows) {
    const info = tokens.get(row.token);
    if (!info) continue;
    const position = byToken.get(row.token) ?? {
      token: row.token,
      symbol: info.symbol,
      name: info.name,
      decimals: info.decimals,
      legs: [],
      firstTradeAt: Number(row.firstTradeAt),
      lastTradeAt: Number(row.lastTradeAt),
      balance: balances.get(row.token) ?? null,
    };
    position.legs.push({
      pairToken: row.pairToken,
      pairSymbol: row.pairSymbol,
      pairDecimals: row.pairDecimals,
      buys: Number(row.buys),
      sells: Number(row.sells),
      tokensBought: row.tokensBought,
      tokensSold: row.tokensSold,
      paid: row.paid,
      received: row.received,
    });
    position.firstTradeAt = Math.min(position.firstTradeAt, Number(row.firstTradeAt));
    position.lastTradeAt = Math.max(position.lastTradeAt, Number(row.lastTradeAt));
    byToken.set(row.token, position);
  }

  const positions = [...byToken.values()].sort(
    (a, b) => b.lastTradeAt - a.lastTradeAt || (a.token < b.token ? -1 : 1),
  );
  for (const position of positions) position.legs.sort((a, b) => (a.pairToken < b.pairToken ? -1 : 1));
  return { positions: positions.slice(0, limit), truncated: positions.length > limit };
}
