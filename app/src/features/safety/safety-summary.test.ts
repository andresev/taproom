import { describe, expect, it } from 'vitest';

import { summarizeChecks } from './safety-summary';
import type { SafetyCheck } from './types';

const check = (id: SafetyCheck['id'], status: SafetyCheck['status']): SafetyCheck => ({ id, status, reason: '' });

describe('summarizeChecks', () => {
  it('counts each status, worst first, and leaves out the empty ones', () => {
    expect(
      summarizeChecks([
        check('dev-wallet', 'fail'),
        check('launch-holders', 'warn'),
        check('pair-asset', 'warn'),
        check('sell-simulation', 'unknown'),
        check('origin', 'pass'),
        check('contract', 'pass'),
      ]),
    ).toBe('1 problem · 2 cautions · 1 unknown · 2 OK');
  });

  it('uses the singular for one caution', () => {
    expect(summarizeChecks([check('pair-asset', 'warn'), check('origin', 'pass')])).toBe('1 caution · 1 OK');
  });
});
