/**
 * Pure checks on a verified Privy identity token's claims. No I/O and no Deno
 * APIs, so this file is unit-tested with vitest (claims.test.ts) as well as
 * imported by the function.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PRIVY_DID = /^did:privy:([a-zA-Z0-9]+)$/;

/** Privy's markers for a wallet it created and holds the key shares for. */
const EMBEDDED_CLIENT_TYPES = new Set(["privy", "privy-v2"]);

export type WalletResult = { ok: true; address: `0x${string}` } | { ok: false; reason: string };

interface LinkedAccount {
  type?: unknown;
  address?: unknown;
  chain_type?: unknown;
  wallet_client_type?: unknown;
}

/** `linked_accounts` arrives as a JSON string in the token; tolerate an already-parsed array too. */
function parseLinkedAccounts(claim: unknown): LinkedAccount[] | null {
  let value = claim;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as LinkedAccount[]) : null;
}

/**
 * The user's embedded EVM wallet, lowercase, taken only from the verified token.
 *
 * `hint` is the address the app says is its embedded wallet. It is never
 * trusted on its own: it is used only to choose among wallets the token itself
 * lists, when the token does not mark which one is embedded.
 */
export function embeddedWalletFromClaims(linkedAccountsClaim: unknown, hint?: string): WalletResult {
  const accounts = parseLinkedAccounts(linkedAccountsClaim);
  if (!accounts) return { ok: false, reason: "The identity token has no readable linked accounts." };

  const wallets = accounts.filter(
    (account) =>
      account.type === "wallet" &&
      typeof account.address === "string" &&
      ADDRESS.test(account.address) &&
      (account.chain_type === undefined || account.chain_type === "ethereum"),
  );
  if (wallets.length === 0) return { ok: false, reason: "The identity token lists no EVM wallet." };

  const lower = (account: LinkedAccount) => (account.address as string).toLowerCase() as `0x${string}`;
  const embedded = wallets.filter(
    (account) => typeof account.wallet_client_type === "string" && EMBEDDED_CLIENT_TYPES.has(account.wallet_client_type),
  );
  const [firstEmbedded] = embedded;
  if (firstEmbedded) return { ok: true, address: lower(firstEmbedded) };

  const hinted = hint && ADDRESS.test(hint) ? wallets.find((account) => lower(account) === hint.toLowerCase()) : undefined;
  if (hinted) return { ok: true, address: lower(hinted) };

  return { ok: false, reason: "The identity token lists wallets, but none is the embedded wallet." };
}

/**
 * The Supabase user for a Privy user is keyed by an address at a domain that
 * can never receive mail, so nobody can sign in to it by email. Returns null
 * for anything that is not a Privy DID.
 */
export function syntheticEmail(privyDid: unknown): string | null {
  const match = typeof privyDid === "string" ? PRIVY_DID.exec(privyDid) : null;
  return match?.[1] ? `${match[1].toLowerCase()}@privy-user.invalid` : null;
}
