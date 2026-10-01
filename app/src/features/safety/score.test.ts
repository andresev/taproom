import { describe, expect, it } from 'vitest';

import { SAFETY_CHECK_IDS, scoreToken } from './score';
import type { SafetyCheck } from './types';

const allPass: SafetyCheck[] = [
  { id: 'dev-wallet', status: 'pass', reason: 'Deployer has not sold' },
  { id: 'holder-concentration', status: 'pass', reason: 'Top 10 holders own 12% of supply' },
  { id: 'contract', status: 'pass', reason: 'No owner privileges, mint or blacklist functions' },
  { id: 'sell-simulation', status: 'pass', reason: 'Simulated sell succeeded with 1% effective tax' },
  { id: 'wash-activity', status: 'pass', reason: '412 unique traders in the last 24 hours' },
];

const withCheck = (override: SafetyCheck) => allPass.map((c) => (c.id === override.id ? override : c));

describe('scoreToken', () => {
  it('is safe only when every input passed', () => {
    expect(scoreToken(allPass).level).toBe('safe');
  });

  it('is danger when any input fails', () => {
    const score = scoreToken(
      withCheck({ id: 'sell-simulation', status: 'fail', reason: 'Simulated sell reverted' }),
    );
    expect(score.level).toBe('danger');
    expect(score.reasons[0].reason).toBe('Simulated sell reverted');
  });

  it('is caution when an input warns', () => {
    const score = scoreToken(
      withCheck({ id: 'dev-wallet', status: 'warn', reason: 'Deployer sold 40% of supply within 10 minutes' }),
    );
    expect(score.level).toBe('caution');
  });

  it('never treats missing data as safe', () => {
    const missing = allPass.filter((c) => c.id !== 'contract');
    const score = scoreToken(missing);
    expect(score.level).toBe('caution');
    expect(score.reasons[0]).toEqual({ id: 'contract', status: 'unknown', reason: 'Contract checks: Unknown' });
  });

  it('with no data at all is caution with every input listed as unknown', () => {
    const score = scoreToken([]);
    expect(score.level).toBe('caution');
    expect(score.reasons.map((r) => r.id)).toEqual(SAFETY_CHECK_IDS);
    expect(score.reasons.every((r) => r.status === 'unknown')).toBe(true);
  });

  it('a fail outranks unknowns', () => {
    const score = scoreToken([{ id: 'contract', status: 'fail', reason: 'Owner can mint new supply' }]);
    expect(score.level).toBe('danger');
    expect(score.reasons[0].id).toBe('contract');
  });

  it('always returns reasons, and is deterministic', () => {
    expect(scoreToken(allPass).reasons).toHaveLength(SAFETY_CHECK_IDS.length);
    expect(scoreToken([...allPass].reverse())).toEqual(scoreToken(allPass));
  });
});
