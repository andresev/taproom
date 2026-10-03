import { formatUtcDateTime } from '@/lib/chain/format';

import type { Coverage } from './record-api';

/** How each factory is named to the reader. */
const FACTORY_LABELS: Record<string, string> = {
  standard: 'standard',
  multiPairV1: 'multi-pair v1',
  multiPairV2: 'multi-pair v2',
  dividend: 'dividend',
};

const label = (name: string) => FACTORY_LABELS[name] ?? name;

export interface CoverageNote {
  /** True only when the record can be read as the wallet's whole Brew history. */
  complete: boolean;
  /** Plain sentences on what the record covers and leaves out. */
  lines: string[];
}

/**
 * What period and which tokens a trader record covers, in plain words. A record
 * is presented as complete only when every factory is indexed from deployment
 * and the indexer has caught up; anything less says what is missing.
 *
 * `ready` is null when the indexer's sync status could not be read.
 */
export function describeCoverage(coverage: Coverage, ready: boolean | null, truncatedAt: number | null): CoverageNote {
  const lines: string[] = [];
  const indexed = coverage.factories.filter((factory) => factory.indexed);
  const notIndexed = coverage.factories.filter((factory) => !factory.indexed);

  if (indexed.length === 0) {
    lines.push('No Brew factory is indexed, so there is no record to show.');
  } else if (indexed.every((factory) => factory.complete)) {
    lines.push('Covers every trade in tokens from the indexed Brew factories since each was deployed.');
  } else {
    const starts = indexed.map((factory) => factory.fromBlock).filter((block): block is number => block !== null);
    if (starts.length < indexed.length) {
      lines.push('Covers only trades since the indexer last started; that start is not recorded.');
    } else {
      const first = Math.min(...starts);
      const time = indexed.find((factory) => factory.fromBlock === first)?.fromTime ?? null;
      const since = time === null ? `block ${first.toLocaleString('en-US')}` : formatUtcDateTime(new Date(time * 1000));
      lines.push(`Covers trades from ${since}, in tokens launched since then. Earlier trades are not included.`);
    }
  }

  if (notIndexed.length > 0) {
    const names = notIndexed.map((factory) => label(factory.name)).join(' and ');
    lines.push(`Tokens from Brew's ${names} ${notIndexed.length === 1 ? 'factory are' : 'factories are'} not included.`);
  }
  if (ready === false) lines.push('The indexer is still catching up, so some trades may be missing.');
  if (ready === null) lines.push('Whether the indexer has caught up could not be checked.');
  if (truncatedAt !== null) {
    lines.push(`Only the ${truncatedAt} positions with the most recent trades are shown and counted.`);
  }

  return { complete: coverage.complete && ready === true && truncatedAt === null, lines };
}
