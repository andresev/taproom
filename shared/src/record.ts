import type { Address } from "./types.js";

/**
 * Trader records: what a wallet did in Brew tokens, from indexed trades only.
 * Pure and deterministic; the indexer gathers the facts (POST /record), the app
 * renders the result. Definitions are in docs/0013-trader-records.md.
 *
 * Amounts are integer base units. Token amounts of one token can be added
 * together; amounts in different pair assets never are.
 */

/** A wallet's trades in one token against one pair asset, added up. */
export interface PositionLeg {
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  buys: number;
  sells: number;
  /** Token base units bought and sold through pools of this pair asset. */
  tokensBought: bigint;
  tokensSold: bigint;
  /** Pair-asset base units paid for the buys and received for the sells. */
  paid: bigint;
  received: bigint;
}

/** Everything indexed about one wallet in one token. */
export interface PositionFacts {
  token: Address;
  symbol: string | null;
  name: string | null;
  decimals: number;
  legs: PositionLeg[];
  /** Unix seconds of the first and last indexed trade. */
  firstTradeAt: number;
  lastTradeAt: number;
  /** The wallet's indexed balance of the token now; null if not known. */
  balance: bigint | null;
}

/**
 * - `open`: the wallet has sold less than it bought.
 * - `closed`: it has sold at least as much as it bought.
 * - `exit-only`: it sold without an indexed buy, so there is no entry to compare.
 */
export type PositionStatus = "open" | "closed" | "exit-only";

/**
 * Whether the wallet's balance matches its trades.
 * - `in`: it holds more than its trades explain, so tokens arrived another way.
 * - `out`: it holds less, so tokens left another way, or a trade's tokens went to
 *   another address.
 */
export type TransferFlag = "none" | "in" | "out" | "unknown";

export interface PositionResult {
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  paid: bigint;
  received: bigint;
  /** received − paid, negative for a loss. */
  net: bigint;
  /** received / paid in hundredths, truncated: 150 is 1.5x. Null if nothing was paid. */
  multipleHundredths: number | null;
  outcome: "win" | "loss" | "even";
}

export interface Position {
  facts: PositionFacts;
  status: PositionStatus;
  tokensBought: bigint;
  tokensSold: bigint;
  /** True when the position traded against more than one pair asset. */
  mixedPairs: boolean;
  /**
   * Only for a closed position traded against a single pair asset. A position
   * mixing pair assets has no single result: its amounts are not comparable
   * without a price.
   */
  result: PositionResult | null;
  transfers: TransferFlag;
}

export interface PairTotals {
  pairToken: Address;
  pairSymbol: string | null;
  pairDecimals: number;
  /** Closed positions with a result in this pair asset. */
  positions: number;
  paid: bigint;
  received: bigint;
  net: bigint;
}

export interface TraderRecord {
  positions: Position[];
  open: number;
  closed: number;
  exitOnly: number;
  wins: number;
  losses: number;
  even: number;
  /** Closed positions that mixed pair assets, and so are in no total. */
  closedWithoutResult: number;
  /** One entry per pair asset; never added across pair assets. */
  totals: PairTotals[];
}

function multipleHundredths(paid: bigint, received: bigint): number | null {
  if (paid <= 0n) return null;
  return Number((received * 100n) / paid);
}

function transferFlag(balance: bigint | null, tokensBought: bigint, tokensSold: bigint): TransferFlag {
  if (balance === null) return "unknown";
  const fromTrades = tokensBought > tokensSold ? tokensBought - tokensSold : 0n;
  if (balance > fromTrades) return "in";
  if (balance < fromTrades) return "out";
  return "none";
}

export function buildPosition(facts: PositionFacts): Position {
  let tokensBought = 0n;
  let tokensSold = 0n;
  for (const leg of facts.legs) {
    tokensBought += leg.tokensBought;
    tokensSold += leg.tokensSold;
  }

  const status: PositionStatus =
    tokensBought === 0n ? "exit-only" : tokensSold >= tokensBought ? "closed" : "open";
  const mixedPairs = facts.legs.length > 1;
  const [leg] = facts.legs;

  let result: PositionResult | null = null;
  if (status === "closed" && !mixedPairs && leg) {
    const net = leg.received - leg.paid;
    result = {
      pairToken: leg.pairToken,
      pairSymbol: leg.pairSymbol,
      pairDecimals: leg.pairDecimals,
      paid: leg.paid,
      received: leg.received,
      net,
      multipleHundredths: multipleHundredths(leg.paid, leg.received),
      outcome: net > 0n ? "win" : net < 0n ? "loss" : "even",
    };
  }

  return {
    facts,
    status,
    tokensBought,
    tokensSold,
    mixedPairs,
    result,
    transfers: transferFlag(facts.balance, tokensBought, tokensSold),
  };
}

/**
 * A wallet's record: every position, newest trade first, and counts and totals
 * over the closed ones. Losses are counted and listed like any other position.
 */
export function buildTraderRecord(facts: PositionFacts[]): TraderRecord {
  const positions = facts
    .map(buildPosition)
    .sort((a, b) => b.facts.lastTradeAt - a.facts.lastTradeAt || (a.facts.token < b.facts.token ? -1 : 1));

  const record: TraderRecord = {
    positions,
    open: 0,
    closed: 0,
    exitOnly: 0,
    wins: 0,
    losses: 0,
    even: 0,
    closedWithoutResult: 0,
    totals: [],
  };
  const totals = new Map<Address, PairTotals>();

  for (const position of positions) {
    if (position.status === "open") record.open++;
    else if (position.status === "exit-only") record.exitOnly++;
    else {
      record.closed++;
      const result = position.result;
      if (!result) {
        record.closedWithoutResult++;
        continue;
      }
      if (result.outcome === "win") record.wins++;
      else if (result.outcome === "loss") record.losses++;
      else record.even++;

      const total = totals.get(result.pairToken) ?? {
        pairToken: result.pairToken,
        pairSymbol: result.pairSymbol,
        pairDecimals: result.pairDecimals,
        positions: 0,
        paid: 0n,
        received: 0n,
        net: 0n,
      };
      total.positions++;
      total.paid += result.paid;
      total.received += result.received;
      total.net += result.net;
      totals.set(result.pairToken, total);
    }
  }

  record.totals = [...totals.values()].sort((a, b) => b.positions - a.positions || (a.pairToken < b.pairToken ? -1 : 1));
  return record;
}
