import type { Address } from '@repo/shared';

/** How many of a wallet's newest buys the list shows. */
export const RECEIPT_LIST_LIMIT = 100;

/** A wallet's newest indexed buys: each one is a receipt. */
export const MY_RECEIPTS_QUERY = /* GraphQL */ `
  query MyReceipts($wallet: String!, $limit: Int!) {
    trades(
      where: { wallet: $wallet, side: "buy" }
      orderBy: "blockTime"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        amountBaseUnits
        pairAmountBaseUnits
        blockTime
        tokenInfo {
          address
          symbol
          decimals
        }
        poolInfo {
          pairSymbol
          pairDecimals
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export interface MyReceiptsResponse {
  trades: {
    items: {
      id: string;
      amountBaseUnits: string;
      pairAmountBaseUnits: string;
      blockTime: string;
      tokenInfo: { address: string; symbol: string | null; decimals: number } | null;
      poolInfo: { pairSymbol: string | null; pairDecimals: number } | null;
    }[];
    pageInfo: { hasNextPage: boolean };
  };
}

/** One entry in the list: enough to recognise the buy. The receipt itself is built on its own screen. */
export interface ReceiptListItem {
  /** The trade id, `${txHash}-${logIndex}`, which is also the receipt's route. */
  id: string;
  token: Address;
  tokenSymbol: string | null;
  tokenDecimals: number;
  pairSymbol: string | null;
  pairDecimals: number;
  amountBought: bigint;
  amountPaid: bigint;
  boughtAt: Date;
}

/**
 * The indexer's rows to list items, newest first as returned. A buy missing its
 * token or pool cannot become a receipt (receipt.ts), so it is left out here too.
 */
export function toReceiptList(response: MyReceiptsResponse): { items: ReceiptListItem[]; more: boolean } {
  const items: ReceiptListItem[] = [];
  for (const row of response.trades.items) {
    if (!row.tokenInfo || !row.poolInfo) continue;
    items.push({
      id: row.id,
      token: row.tokenInfo.address as Address,
      tokenSymbol: row.tokenInfo.symbol,
      tokenDecimals: row.tokenInfo.decimals,
      pairSymbol: row.poolInfo.pairSymbol,
      pairDecimals: row.poolInfo.pairDecimals,
      amountBought: BigInt(row.amountBaseUnits),
      amountPaid: BigInt(row.pairAmountBaseUnits),
      boughtAt: new Date(Number(row.blockTime) * 1000),
    });
  }
  return { items, more: response.trades.pageInfo.hasNextPage };
}
