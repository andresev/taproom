import type { Address, PositionFacts } from '@repo/shared';

/**
 * The indexer's POST /record and GET /coverage responses (indexer/src/record.ts,
 * indexer/src/coverage.ts). Amounts are base-unit integers as strings.
 */
export interface RecordResponse {
  wallet: string;
  positions: {
    token: string;
    symbol: string | null;
    name: string | null;
    decimals: number;
    legs: {
      pairToken: string;
      pairSymbol: string | null;
      pairDecimals: number;
      buys: number;
      sells: number;
      tokensBought: string;
      tokensSold: string;
      paid: string;
      received: string;
    }[];
    firstTradeAt: number;
    lastTradeAt: number;
    balance: string | null;
  }[];
  truncated: boolean;
}

export interface FactoryCoverage {
  name: string;
  address: string;
  deploymentBlock: number;
  indexed: boolean;
  fromBlock: number | null;
  fromTime: number | null;
  complete: boolean;
}

export interface Coverage {
  chainId: number;
  factories: FactoryCoverage[];
  complete: boolean;
}

/** The indexer's JSON to exact bigint facts, ready for buildTraderRecord. */
export function toPositionFacts(response: RecordResponse): PositionFacts[] {
  return response.positions.map((position) => ({
    token: position.token as Address,
    symbol: position.symbol,
    name: position.name,
    decimals: position.decimals,
    legs: position.legs.map((leg) => ({
      pairToken: leg.pairToken as Address,
      pairSymbol: leg.pairSymbol,
      pairDecimals: leg.pairDecimals,
      buys: leg.buys,
      sells: leg.sells,
      tokensBought: BigInt(leg.tokensBought),
      tokensSold: BigInt(leg.tokensSold),
      paid: BigInt(leg.paid),
      received: BigInt(leg.received),
    })),
    firstTradeAt: position.firstTradeAt,
    lastTradeAt: position.lastTradeAt,
    balance: position.balance === null ? null : BigInt(position.balance),
  }));
}
