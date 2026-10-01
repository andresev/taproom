import { describe, expect, it } from 'vitest';

import { normalizeAddress } from './address';

const checksummed = '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e';
const lower = checksummed.toLowerCase();

describe('normalizeAddress', () => {
  it('lowercases a valid address and trims whitespace', () => {
    expect(normalizeAddress(checksummed)).toBe(lower);
    expect(normalizeAddress(`  ${lower}\n`)).toBe(lower);
  });

  it('rejects a mixed-case address with a wrong checksum', () => {
    expect(normalizeAddress(checksummed.replace('A0Cf', 'a0CF'))).toBeNull();
  });

  it('rejects anything that is not an address', () => {
    for (const bad of ['', 'alice', '0x1234', `${lower}00`, lower.slice(2), `0x${'g'.repeat(40)}`]) {
      expect(normalizeAddress(bad), bad).toBeNull();
    }
  });
});
