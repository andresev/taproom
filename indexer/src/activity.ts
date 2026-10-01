import { z } from "zod";

/** Most tokens returned per request; the app shows a ranked list, not everything. */
export const ACTIVITY_LIMIT = 200;

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase() as `0x${string}`);

/**
 * Body of POST /activity: per-token trading totals since a unix time.
 * `wallets` limits the totals to trades and launches by those wallets (the
 * signed-in feed); omitted, every wallet counts.
 */
export const activityRequestSchema = z.object({
  since: z.number().int().nonnegative(),
  sort: z.enum(["trending", "latest", "launches"]),
  wallets: z.array(address).min(1).max(500).optional(),
});

export type ActivityRequest = z.infer<typeof activityRequestSchema>;

/** One token's totals. Amounts are base-unit integers as strings; times are unix seconds. */
export interface ActivityRow {
  tokenAddress: `0x${string}`;
  tokenSymbol: string | null;
  tokenName: string | null;
  buys: number;
  sells: number;
  /**
   * Pair-asset totals, or null when the token's trades in the window used more
   * than one pair asset, whose amounts cannot be added together.
   */
  volume: { pairSymbol: string | null; pairDecimals: number; bought: string; sold: string } | null;
  /** Distinct wallets that traded the token in the window. */
  walletCount: number;
  /** Those wallets, only when the request named `wallets`; otherwise empty. */
  wallets: `0x${string}`[];
  /** Set when the token was launched inside the window. */
  launch: { wallet: `0x${string}`; time: number } | null;
  /** Most recent trade, or the launch if nothing has traded. */
  lastTime: number;
}
