import type { Address } from 'viem';
import { createSiweMessage } from 'viem/siwe';

import { BSC_CHAIN_ID } from './addresses';

/** Shown in the wallet's signing prompt. Factual: signing is free and moves nothing. */
export const SIGN_IN_STATEMENT = 'Sign in to Taproom. This signature does not send a transaction or cost gas.';

/**
 * Splits the app's public URL into the `domain` and `uri` fields of a Sign in
 * with Ethereum message. Supabase only accepts a message whose URI is one of its
 * allowed redirect URLs and whose domain matches that URI, and requires HTTPS
 * everywhere except localhost. Throws rather than building a message the server
 * will reject.
 */
export function parseAppUrl(appUrl: string): { domain: string; uri: string } {
  const match = /^(https?):\/\/([a-z0-9.-]+(?::\d+)?)\/?$/i.exec(appUrl.trim());
  if (!match) {
    throw new Error(`App URL must be an origin such as "https://example.com", got "${appUrl}"`);
  }
  const [, scheme = '', domain = ''] = match;
  const isLocalhost = /^localhost(:\d+)?$/i.test(domain);
  if (scheme.toLowerCase() !== 'https' && !isLocalhost) {
    throw new Error(`App URL must use https unless it is localhost, got "${appUrl}"`);
  }
  return { domain: domain.toLowerCase(), uri: `${scheme.toLowerCase()}://${domain.toLowerCase()}` };
}

export interface SignInMessageInput {
  address: Address;
  /** The app's public origin, EXPO_PUBLIC_APP_URL. */
  appUrl: string;
  nonce: string;
  issuedAt: Date;
}

/** EIP-4361 message the wallet signs to prove it controls `address`. Always bound to BSC. */
export function buildSignInMessage({ address, appUrl, nonce, issuedAt }: SignInMessageInput): string {
  const { domain, uri } = parseAppUrl(appUrl);
  return createSiweMessage({
    address,
    chainId: BSC_CHAIN_ID,
    domain,
    uri,
    nonce,
    issuedAt,
    statement: SIGN_IN_STATEMENT,
    version: '1',
  });
}
