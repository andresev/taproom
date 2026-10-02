import { quoteAtSpot, type Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { indexerGraphql } from '@/lib/api/indexer';
import { erc20Abi } from '@/lib/chain/abis/erc20';
import { pancakeV3PoolAbi } from '@/lib/chain/abis/pancake-v3-pool';
import { publicClient } from '@/lib/chain/clients';

import { buildReceipt, type Receipt, type ReceiptTradeRow } from './receipt';

const RECEIPT_QUERY = /* GraphQL */ `
  query Receipt($id: String!) {
    trade(id: $id) {
      id
      txHash
      wallet
      side
      amountBaseUnits
      pairAmountBaseUnits
      sqrtPriceX96
      blockTime
      tokenInfo {
        address
        symbol
        name
        decimals
        totalSupply
      }
      poolInfo {
        address
        pairSymbol
        pairDecimals
        tokenIsToken0
      }
    }
  }
`;

/** Market cap now, in pair-asset base units, read from the pool. Null if either read fails. */
async function currentMarketCap(row: ReceiptTradeRow): Promise<bigint | null> {
  if (!row.tokenInfo || !row.poolInfo) return null;
  try {
    const [slot0, supply] = await publicClient.multicall({
      allowFailure: true,
      contracts: [
        { address: row.poolInfo.address as Address, abi: pancakeV3PoolAbi, functionName: 'slot0' },
        { address: row.tokenInfo.address as Address, abi: erc20Abi, functionName: 'totalSupply' },
      ],
    });
    if (slot0.status !== 'success' || supply.status !== 'success' || slot0.result[0] <= 0n) return null;
    return quoteAtSpot(slot0.result[0], row.poolInfo.tokenIsToken0, supply.result);
  } catch {
    return null;
  }
}

export type ReceiptResult = { ok: true; receipt: Receipt } | { ok: false; reason: string };

/**
 * A receipt for one indexed trade. The entry figures come from the indexer and
 * the current market cap from the pool; both refresh, so the multiple stays live.
 */
export function useReceipt(tradeId: string) {
  return useQuery({
    queryKey: ['receipt', tradeId],
    refetchInterval: 30_000,
    queryFn: async (): Promise<ReceiptResult> => {
      const { trade } = await indexerGraphql<{ trade: ReceiptTradeRow | null }>(RECEIPT_QUERY, { id: tradeId });
      if (!trade) return { ok: false, reason: 'This trade is not indexed, so there is nothing to prove.' };
      return buildReceipt(trade, await currentMarketCap(trade));
    },
  });
}
