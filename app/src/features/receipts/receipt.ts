import { quoteAtSpot, type Address, type TxHash } from '@repo/shared';

/**
 * A receipt: proof of one on-chain buy. Every field comes from the indexer or
 * the chain. Nothing here is typed in by a user, and there is no code path
 * that lets one edit a number (CLAUDE.md, Receipts).
 */
export interface Receipt {
  /** The trade's id: `${txHash}-${logIndex}`. */
  id: string;
  txHash: TxHash;
  /** The wallet that sent the buy. */
  wallet: Address;
  boughtAt: Date;
  token: { address: Address; symbol: string | null; name: string | null; decimals: number };
  pair: { symbol: string | null; decimals: number };
  /** Base units of the token bought and of the pair asset paid. */
  amountBought: bigint;
  amountPaid: bigint;
  /** Market cap right after the buy, in pair-asset base units: pool price times total supply. */
  entryMarketCap: bigint;
  /** Market cap now, same units. Null when the live read failed. */
  currentMarketCap: bigint | null;
  /** Current market cap divided by entry market cap. Null when either is unavailable. */
  multiple: number | null;
}

/** The indexer's `trade` row with its token and pool, as GraphQL returns it. */
export interface ReceiptTradeRow {
  id: string;
  txHash: string;
  wallet: string;
  side: 'buy' | 'sell';
  amountBaseUnits: string;
  pairAmountBaseUnits: string;
  sqrtPriceX96: string;
  blockTime: string;
  tokenInfo: { address: string; symbol: string | null; name: string | null; decimals: number; totalSupply: string } | null;
  poolInfo: { address: string; pairSymbol: string | null; pairDecimals: number; tokenIsToken0: boolean } | null;
}

/** Current over entry, to four decimal places. Null if the entry value is zero. */
export function marketCapMultiple(entry: bigint, current: bigint): number | null {
  if (entry <= 0n || current < 0n) return null;
  return Number((current * 10_000n) / entry) / 10_000;
}

/**
 * Builds a receipt from an indexed trade and the market cap read live from the
 * pool. Returns an explanation instead when the trade cannot be a receipt: a
 * receipt proves an entry, so a sell is refused, as is a trade missing the
 * token or pool it needs.
 */
export function buildReceipt(
  row: ReceiptTradeRow,
  currentMarketCap: bigint | null,
): { ok: true; receipt: Receipt } | { ok: false; reason: string } {
  if (row.side !== 'buy') return { ok: false, reason: 'A receipt proves a buy. This trade is a sell.' };
  if (!row.tokenInfo || !row.poolInfo) return { ok: false, reason: 'This trade is missing its token or pool.' };

  const sqrtPriceX96 = BigInt(row.sqrtPriceX96);
  if (sqrtPriceX96 <= 0n) return { ok: false, reason: 'This trade has no recorded price.' };

  const entryMarketCap = quoteAtSpot(sqrtPriceX96, row.poolInfo.tokenIsToken0, BigInt(row.tokenInfo.totalSupply));
  return {
    ok: true,
    receipt: {
      id: row.id,
      txHash: row.txHash as TxHash,
      wallet: row.wallet as Address,
      boughtAt: new Date(Number(row.blockTime) * 1000),
      token: {
        address: row.tokenInfo.address as Address,
        symbol: row.tokenInfo.symbol,
        name: row.tokenInfo.name,
        decimals: row.tokenInfo.decimals,
      },
      pair: { symbol: row.poolInfo.pairSymbol, decimals: row.poolInfo.pairDecimals },
      amountBought: BigInt(row.amountBaseUnits),
      amountPaid: BigInt(row.pairAmountBaseUnits),
      entryMarketCap,
      currentMarketCap,
      multiple: currentMarketCap === null ? null : marketCapMultiple(entryMarketCap, currentMarketCap),
    },
  };
}
