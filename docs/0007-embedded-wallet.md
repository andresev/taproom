# 0007: Align the wallet model with the Fomo app

Date: 2026-10-02. Status: accepted; Google and Apple sign-in implemented, not yet run end to end.

## Context

Steps 1 to 4 were built on the rule that the app never handles keys and all
signing happens in the user's own external wallet, connected through Reown AppKit
(0002). That makes a buy two taps and a hop to another app.

For step 5 the project owner asked for the trading experience of the Fomo app. Fomo
signs users in with email or Apple ID, creates an embedded self-custodial wallet
through Privy, and trades inside the app in one tap. That contradicts the old rule,
which CLAUDE.md said was not to be crossed without explicit sign-off. The owner gave
that sign-off on 2026-10-02 and asked for CLAUDE.md to be changed to match.

## Decisions

- **The wallet becomes an embedded self-custodial wallet, with Google or Apple
  sign-in** (first written as email or Apple; changed the same day at the owner's
  request). CLAUDE.md gains a "Wallet model" section and its custody rules are
  rewritten around it.
- **What stays forbidden:** Taproom's own code, servers and logs handling key
  material; signing anything without an explicit in-app confirmation; server-side,
  delegated or session signing; any arrangement where Taproom could move funds
  without the user. Users must be able to export their key.
- **Trading happens inside the app,** which settles the app store question in
  CLAUDE.md in favour of in-app swaps. The store guidelines still need checking
  before a release build.
- **Privy is the provider,** because it is what Fomo uses. It was installed later
  the same day (`@privy-io/expo`); the next section describes how it is used.
- **Not adopted from Fomo in v1:** Apple Pay or card funding, Taproom paying
  network fees, a per-trade fee, and other chains. Each is listed in CLAUDE.md as
  out of scope or an open question needing its own sign-off.

## How sign-in is implemented

- **Privy is the login, with Google and Apple as the only methods.** The owner
  asked for no email sign-in. The app opens on a sign-in screen
  (`app/src/app/sign-in.tsx`) and every other route is behind it, using Expo
  Router's protected routes. The embedded wallet is created right after the first
  sign-in if the user has none.
- **Apple uses the native iOS sheet** through `expo-apple-authentication`. It will
  not work until the app has a real bundle identifier registered with an Apple
  Developer team, with Sign in with Apple enabled, and that bundle identifier set
  as the Apple client ID in the Privy dashboard.
- **A Supabase Edge Function, `privy-session`, turns that into a Supabase session.**
  The app sends Privy's signed identity token. The function verifies it against
  Privy's public keys (no Privy secret is involved), reads the embedded wallet
  address from the token, creates the Supabase user and the `profiles` row, and
  returns a one-time token the app exchanges for a session.
- **The wallet address comes only from the verified token.** The app also sends the
  address of its embedded wallet, but that is used only to choose among wallets the
  token itself lists, never accepted on its own.
- **The Supabase user is keyed to the Privy user by an undeliverable address**
  (`<privy id>@privy-user.invalid`), so nobody can sign in to it by email. The
  Privy id and wallet address are stored in `app_metadata`, which a signed-in user
  cannot edit.
- **Supabase still owns profiles, follows and row-level security,** unchanged.
  Privy's documented Supabase recipe runs the other way (Supabase as the login);
  it was not used because Privy's servers would need to reach the Supabase
  project, which a local database cannot offer.
- **`viem` is pinned to 2.56.0** in the app and the indexer, the exact version
  Privy's SDK requires.
- **The Reown wallet-connection code and the wallet-signature sign-in were removed
  from the app.** The Reown packages are still installed, pending the decision on
  whether external wallets stay as an option. The database trigger from 0002
  remains and is harmless.

## What this supersedes

- 0002's reasons for turning off social logins and for wallet-signature sign-in no
  longer describe the target. Its connection and sign-in code has been removed from
  the app, as described above.
- The Supabase sign-in path (Sign in with Ethereum, and the trigger that creates a
  profile from a verified wallet) is replaced by the `privy-session` function. The
  trigger and the provider setting in `supabase/config.toml` are still in place.

## Still open

- Whether connecting an external wallet stays as an option.
- Whether users who already have a profile from an external wallet need migrating.
  No wallet has signed in yet, so today there is nothing to migrate.

## Since then

- 2026-10-02: four statements in this record were corrected because it contradicted
  itself. It said Privy was not installed, that 0002's code still ran, that the
  Supabase sign-in path still needed rework, and that turning a Privy sign-in into a
  Supabase session was still open, while "How sign-in is implemented" describes all
  four as done.
- 2026-10-02: buys are signed by the embedded wallet (0008).
- 2026-10-02: key export is not built. 0011 lists it, with a real bundle identifier,
  as a requirement before the first release build.
