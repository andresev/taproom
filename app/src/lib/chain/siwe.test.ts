import { parseSiweMessage } from 'viem/siwe';
import { describe, expect, it } from 'vitest';

import { BSC_CHAIN_ID } from './addresses';
import { SIGN_IN_STATEMENT, buildSignInMessage, parseAppUrl } from './siwe';

const address = '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e';
const issuedAt = new Date('2026-10-01T00:00:00.000Z');

describe('parseAppUrl', () => {
  it('splits an https origin into domain and uri', () => {
    expect(parseAppUrl('https://Example.com/')).toEqual({ domain: 'example.com', uri: 'https://example.com' });
  });

  it('allows http only for localhost', () => {
    expect(parseAppUrl('http://localhost:3000')).toEqual({ domain: 'localhost:3000', uri: 'http://localhost:3000' });
    expect(() => parseAppUrl('http://example.com')).toThrow(/https/);
  });

  it('rejects anything that is not a bare origin', () => {
    for (const bad of ['', 'example.com', 'taproom://sign-in', 'https://example.com/path', 'https://a.com?x=1']) {
      expect(() => parseAppUrl(bad), bad).toThrow(/origin/);
    }
  });
});

describe('buildSignInMessage', () => {
  it('builds an EIP-4361 message bound to BSC and the app origin', () => {
    const message = buildSignInMessage({ address, appUrl: 'https://example.com', nonce: 'abcdef123456', issuedAt });
    expect(parseSiweMessage(message)).toEqual({
      address,
      chainId: BSC_CHAIN_ID,
      domain: 'example.com',
      uri: 'https://example.com',
      nonce: 'abcdef123456',
      issuedAt,
      statement: SIGN_IN_STATEMENT,
      version: '1',
    });
  });

  it('throws instead of signing for an app URL the server would reject', () => {
    expect(() => buildSignInMessage({ address, appUrl: '', nonce: 'abcdef123456', issuedAt })).toThrow(/origin/);
  });
});
