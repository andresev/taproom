import { describe, expect, it } from 'vitest';

import { describeCoverage } from './coverage-note';
import type { Coverage, FactoryCoverage } from './record-api';

const factory = (name: string, fields: Partial<FactoryCoverage>): FactoryCoverage => ({
  name,
  address: '0x0000000000000000000000000000000000000001',
  deploymentBlock: 120_201_671,
  indexed: true,
  fromBlock: 125_035_000,
  fromTime: 1790828216,
  complete: false,
  ...fields,
});

// As the indexer's /coverage returned it on 2026-10-02 with START_BLOCK=125035000.
const partial: Coverage = {
  chainId: 56,
  complete: false,
  factories: [
    factory('standard', {}),
    factory('multiPairV1', {}),
    factory('multiPairV2', {}),
    factory('dividend', { indexed: false, fromBlock: null, fromTime: null }),
  ],
};

describe('describeCoverage', () => {
  it('states the start date and what is left out of a partial history', () => {
    expect(describeCoverage(partial, true, null)).toEqual({
      complete: false,
      lines: [
        'Covers trades from 2026-10-01 04:16 UTC, in tokens launched since then. Earlier trades are not included.',
        "Tokens from Brew's dividend factory are not included.",
      ],
    });
  });

  it('falls back to the block number when its time is unknown', () => {
    const coverage = { ...partial, factories: partial.factories.map((item) => ({ ...item, fromTime: null })) };
    expect(describeCoverage(coverage, true, null).lines[0]).toContain('from block 125,035,000');
  });

  it('says when the start was not recorded', () => {
    const coverage = { ...partial, factories: partial.factories.map((item) => ({ ...item, fromBlock: null })) };
    expect(describeCoverage(coverage, true, null).lines[0]).toBe(
      'Covers only trades since the indexer last started; that start is not recorded.',
    );
  });

  it('is complete only when every factory is indexed from deployment and the indexer has caught up', () => {
    const full: Coverage = {
      chainId: 56,
      complete: true,
      factories: [factory('standard', { complete: true, fromBlock: 120_201_671 })],
    };
    expect(describeCoverage(full, true, null)).toEqual({
      complete: true,
      lines: ['Covers every trade in tokens from the indexed Brew factories since each was deployed.'],
    });
    expect(describeCoverage(full, false, null).complete).toBe(false);
    expect(describeCoverage(full, null, null).complete).toBe(false);
    expect(describeCoverage(full, true, 500).complete).toBe(false);
  });

  it('says when the indexer is behind, unreachable for status, or the list is cut short', () => {
    expect(describeCoverage(partial, false, null).lines).toContain(
      'The indexer is still catching up, so some trades may be missing.',
    );
    expect(describeCoverage(partial, null, null).lines).toContain(
      'Whether the indexer has caught up could not be checked.',
    );
    expect(describeCoverage(partial, true, 500).lines).toContain(
      'Only the 500 positions with the most recent trades are shown and counted.',
    );
  });
});
