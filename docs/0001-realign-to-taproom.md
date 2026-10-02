# 0001: Realign the repo from the Solana tracker to Taproom

Date: 2026-10-01. Status: accepted.

## Context

The repo was scaffolded as a read-only social layer for Solana traders: a Fastify
server receiving Helius webhooks, SPL swap parsing, and a Supabase schema keyed by
Solana transaction signature. CLAUDE.md now defines a different product: Taproom, a
social trading app for the Brew launchpad on BNB Smart Chain, with in-app swaps from
the user's own wallet.

## Decisions

- **The Solana work is kept on the `solana-phase1` branch**, not on main. Nothing
  from it is reused except the bigint money helpers in `shared/`.
- **`server/` is removed.** An indexer (`indexer/`, Ponder) replaces webhook
  ingestion. Anything that needs server-side keys, such as RPC access or sell
  simulation, goes in the indexer's API routes (`indexer/src/api`).
- **The npm-workspace monorepo stays.** The Expo project lives in `app/` with
  routes in `app/src/app/`, features in `app/src/features/`, and chain code in
  `app/src/lib/chain/`. CLAUDE.md's structure section was updated to match, rather
  than flattening Expo into the repo root.
- **Styling stays on the Expo template's StyleSheet plus theme tokens**
  (`app/src/theme`). NativeWind was not added, because a styling setup already existed.
- **Trades are keyed by transaction hash plus log index.** One EVM transaction can
  contain several swaps, unlike the old one-trade-per-signature model.
- **On-chain data lives in the indexer's database; Supabase holds only app-owned
  data** (profiles, follows, push tokens).
- **Unconfirmed contract addresses are `null` in `addresses.ts`** and
  `requireAddress` throws on them, so no code path can run against a guessed address.

## Still open

- Brew launch factory address and launch event signature.
- PancakeSwap V3 factory, router, quoter and WBNB addresses on BSC.
- How a wallet signature becomes a Supabase session and a `profiles` row.
- App store policy for in-app swaps.
- The iOS bundle identifier is still the placeholder `com.anonymous.social-trading`.

## Since then

- 2026-10-01: the Brew factory addresses and launch events were confirmed, with the
  PancakeSwap V3 factory and WBNB (0004). Addresses moved to
  `shared/src/addresses.ts`; the app's `addresses.ts` re-exports them.
- 2026-10-01: wallet signature to session and profile was settled in 0002.
- 2026-10-02: 0007 replaced that with Google and Apple sign-in and an embedded
  wallet, so "the user's own wallet" in the context above now means that wallet. It
  also decided that trading happens inside the app; the store guideline checks are
  still open (CLAUDE.md, Open questions).
- 2026-10-02: the PancakeSwap router and quoter were confirmed in 0008.
- 2026-10-02: the iOS bundle identifier is still the placeholder. 0011 lists a real
  one as a requirement before the first release build.
