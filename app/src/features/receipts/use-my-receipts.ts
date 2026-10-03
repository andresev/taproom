import { useQuery } from '@tanstack/react-query';

import { describeCoverage, type CoverageNote } from '@/features/records/coverage-note';
import type { Coverage } from '@/features/records/record-api';
import { indexerGet, indexerGraphql, indexerReady } from '@/lib/api/indexer';

import { MY_RECEIPTS_QUERY, RECEIPT_LIST_LIMIT, toReceiptList, type MyReceiptsResponse, type ReceiptListItem } from './receipt-list';

export interface MyReceipts {
  items: ReceiptListItem[];
  /** True when the wallet has more buys than the list shows. */
  more: boolean;
  /** Which buys can have a receipt at all: only those in the indexed history. */
  coverage: CoverageNote;
}

/** The signed-in wallet's indexed buys, newest first. `wallet` is null when signed out. */
export function useMyReceipts(wallet: string | null) {
  return useQuery({
    queryKey: ['my-receipts', wallet],
    enabled: wallet !== null,
    refetchInterval: 30_000,
    queryFn: async (): Promise<MyReceipts> => {
      const [response, coverage, ready] = await Promise.all([
        indexerGraphql<MyReceiptsResponse>(MY_RECEIPTS_QUERY, { wallet, limit: RECEIPT_LIST_LIMIT }),
        indexerGet<Coverage>('/coverage'),
        indexerReady().catch(() => null),
      ]);
      return { ...toReceiptList(response), coverage: describeCoverage(coverage, ready, null) };
    },
  });
}
