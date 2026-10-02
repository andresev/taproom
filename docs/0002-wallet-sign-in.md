# 0002: Wallet connect and sign-in

Date: 2026-10-01. Status: superseded by 0007 on 2026-10-02.

## Context

MVP step 1 needs a connected wallet, a Supabase session, and a `profiles` row keyed
to the wallet address. 0001 left open how a wallet signature becomes a session and a
profile. The first migration gave `profiles` no insert policy so that a client could
never claim an address it had not proved it controls.

## Decisions

- **Wallet connection is Reown AppKit with the wagmi adapter, BSC only**
  (`app/src/lib/chain/wallet.ts`). AppKit's built-in swaps, on-ramp and social
  logins are turned off: swaps must go through Taproom's own flow so the safety
  score is shown before signing, and social logins create embedded wallets, which
  conflicts with the no-custody rule.
- **Sign-in is Sign in with Ethereum, verified by Supabase Auth's built-in Web3
  provider** (`supabase.auth.signInWithWeb3` with a message and signature). There is
  no verifier of our own and no extra dependency. Reown's SIWX plugin was not used
  because it would still need bridging to a Supabase session.
- **The profile row is created by a database trigger on `auth.identities`**
  (`supabase/migrations/20261001010000_wallet_sign_in.sql`), not by the client. The
  auth server writes that row only after verifying the signature, with
  `provider = 'web3'` and `provider_id = 'web3:ethereum:<address>'`. The same address
  also appears in the user's metadata, but a signed-in user can edit that, so the
  trigger never reads it. The address is stored lowercase.
- **Connecting and signing in are two explicit steps.** A signature prompt appears
  only when the user taps "Sign in". If the connected wallet stops matching the
  session's wallet, the session is ended.
- **`EXPO_PUBLIC_APP_URL` is the app's public origin.** Supabase accepts a sign-in
  message only if its URI is the site URL or an allowed redirect URL, its domain
  matches that URI, and it uses HTTPS (localhost excepted). A custom scheme such as
  `taproom://` is not accepted. Local development uses `http://localhost:3000`,
  listed in `supabase/config.toml`.
- **Profile code lives in `app/src/features/profile`**, a feature folder CLAUDE.md's
  structure section did not list.
- **No `babel.config.js` was added.** Reown's docs ask for
  `unstable_transformImportMeta`; in Expo SDK 57 that transform is on by default.

## Known limits

- Supabase issues no server-side nonce. A signed message is valid for 10 minutes
  after its issued-at time, so replay protection rests on that window and on TLS.
- Smart-contract wallets (EIP-1271, for example Safe) are untested and may not be
  able to sign in.
- Web3 accounts have no email or phone, so sign-ups are cheap to automate. The
  hosted project needs the Web3 rate limit and CAPTCHA configured before launch.

## Still open

- The production value of `EXPO_PUBLIC_APP_URL`: Taproom needs a real HTTPS domain,
  added to the hosted Supabase project's redirect URLs.
- Sentry is not installed yet, so sign-in failures are shown to the user but not
  reported anywhere.
- Android wallet detection needs a `queries` config plugin; not added yet.

## Since then

- 2026-10-02: 0007 replaced this sign-in with Google and Apple sign-in through Privy
  and an embedded wallet. The Reown connection code and the Sign in with Ethereum
  flow were removed from the app; `app/src/lib/chain/wallet.ts` no longer exists.
- Still in place from this record, all waiting on the external-wallet question in
  CLAUDE.md: the database trigger, which 0007 calls harmless; Supabase's Sign in
  with Ethereum provider, still enabled in `supabase/config.toml`; the Reown and
  wagmi packages; and `EXPO_PUBLIC_REOWN_PROJECT_ID` and `EXPO_PUBLIC_APP_URL` in
  `app/.env.example`, which the app no longer reads.
- Still in use: the `app/src/features/profile` folder.
- Still true: Sentry is not installed. A real HTTPS domain is still needed, now for
  the receipt verification link (0011).
- No longer relevant: the Android wallet-detection plugin.
