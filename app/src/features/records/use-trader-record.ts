import { buildTraderRecord, type Address, type TraderRecord } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { indexerGet, indexerPost, indexerReady } from '@/lib/api/indexer';

import { describeCoverage, type CoverageNote } from './coverage-note';
import { toPositionFacts, type Coverage, type RecordResponse } from './record-api';

/** A record changes only when the wallet trades; slower than the feed is fine. */
const RECORD_POLL_MS = 30_000;

export interface TraderRecordView {
  record: TraderRecord;
  coverage: CoverageNote;
}

/**
 * A wallet's trader record with the note on what it covers. The record is never
 * shown without the note: if coverage cannot be read, the whole query fails
 * rather than presenting a record whose period is unknown.
 */
export function useTraderRecord(wallet: Address) {
  return useQuery({
    queryKey: ['record', wallet],
    refetchInterval: RECORD_POLL_MS,
    queryFn: async (): Promise<TraderRecordView> => {
      const [response, coverage, ready] = await Promise.all([
        indexerPost<RecordResponse>('/record', { wallet }),
        indexerGet<Coverage>('/coverage'),
        indexerReady().catch(() => null),
      ]);
      return {
        record: buildTraderRecord(toPositionFacts(response)),
        coverage: describeCoverage(coverage, ready, response.truncated ? response.positions.length : null),
      };
    },
  });
}
