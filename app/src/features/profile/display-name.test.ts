import { describe, expect, it } from 'vitest';

import { displayNameProblem } from './display-name';

describe('displayNameProblem', () => {
  it('accepts names within the database limits', () => {
    expect(displayNameProblem('abc')).toBeNull();
    expect(displayNameProblem('a'.repeat(32))).toBeNull();
  });

  it('rejects names that are too short or too long', () => {
    expect(displayNameProblem('ab')).toMatch(/at least 3/);
    expect(displayNameProblem('a'.repeat(33))).toMatch(/at most 32/);
  });

  it('measures the trimmed name', () => {
    expect(displayNameProblem('  ab  ')).toMatch(/at least 3/);
    expect(displayNameProblem('  abc  ')).toBeNull();
  });
});
