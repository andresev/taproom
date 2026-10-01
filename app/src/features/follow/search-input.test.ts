import { describe, expect, it } from 'vitest';

import { parseSearchInput } from './search-input';

const address = '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e';

describe('parseSearchInput', () => {
  it('treats blank input as empty', () => {
    expect(parseSearchInput('   ')).toEqual({ kind: 'empty' });
  });

  it('recognises a full wallet address and lowercases it', () => {
    expect(parseSearchInput(` ${address} `)).toEqual({ kind: 'address', address: address.toLowerCase() });
  });

  it('searches names by prefix, including a partial address', () => {
    expect(parseSearchInput('alice')).toEqual({ kind: 'name', pattern: 'alice%' });
    expect(parseSearchInput('0xA0Cf')).toEqual({ kind: 'name', pattern: '0xA0Cf%' });
  });

  it('escapes LIKE wildcards typed by the user', () => {
    expect(parseSearchInput('a_b%c\\d')).toEqual({ kind: 'name', pattern: 'a\\_b\\%c\\\\d%' });
  });

  it('waits for enough characters before searching names', () => {
    expect(parseSearchInput('al')).toEqual({ kind: 'too-short' });
  });
});
