# CLAUDE.md — Taproom

This file is loaded at the start of every Claude Code session. Read it fully before touching code.

## What this is

**Taproom** is a social trading app for the **Brew** token launchpad (brew.family) on **BNB Smart Chain (BSC)**.

Core loop: open the app → see a live feed of what the wallets you follow are buying and launching on Brew → tap any trade → buy the same token in one tap from your own wallet, with a safety badge shown before you confirm.

Taproom is an **independent, community-built app. It is not affiliated with or endorsed by Brew.** Never use Brew's logo or imply official status in UI, copy, or metadata.

### Brew context (domain knowledge)
- Brew is a token launchpad on BSC. Tokens launch directly into **PancakeSwap V3** pools with **permanently locked liquidity** (no bonding curve).
- Tokens are "brewed with" a pair asset: WBNB, the native **$BREW** token, other memecoins, or tokenized stocks ("bStocks").
- Trading fee is 1%; the token side of the fee is burned.
- $BREW contract (verify on BscScan before use): `0xfa6d9b504848606eb9aec04ccc161d169b3f2159`
- Brew launch factory address: **TODO — not yet confirmed.** Find it by opening a known Brew launch transaction on BscScan and reading which contract created the token. Record it in `app/src/lib/chain/addresses.ts` with a comment linking the source tx.

**Never guess or invent a contract address, ABI, or event signature.** If one is needed and not in `addresses.ts`, stop and ask.

## MVP scope (v1)

Build these, in this order:

1. **Wallet connect + profile** — connect a wallet, create a profile keyed to the wallet address.
2. **Follow graph** — follow/unfollow any wallet; search by address or profile name.
3. **Live trade feed** — buys, sells, and launches from followed wallets on Brew tokens, newest first, near-real-time.
4. **Token page** — price, market cap, liquidity, holders, recent trades, safety badge.
5. **One-tap buy** — swap via PancakeSwap V3 from the user's own wallet, with slippage control and a safety check before signing.
6. **Safety badges** — a score plus plain-language reasons on every token (see Safety model).
7. **Receipt cards** — shareable image proving an on-chain entry (see Receipts).

### Out of scope for v1 (v2+)
Leaderboard seasons, token-gated holder chat rooms, in-app token launching ("Snap & Launch"), monthly Wrapped cards, push alerts on dev-wallet moves, PnL/tax exports, Chinese-language support, the Taproom token itself. Don't build these unless asked; do keep the data model friendly to them.

## Stack (defaults — change only with a stated reason)

Check `package.json` first. If the repo already uses a library for a job, follow what's there instead of these defaults.

- **App:** Expo (React Native) + **Expo Router**, **TypeScript strict**.
- **Native deps:** install with `npx expo install <pkg>` so versions match the Expo SDK. **Do not upgrade the Expo SDK** without asking.
- **Wallet:** Reown AppKit (WalletConnect) for React Native, with **wagmi + viem**. Check current Reown docs for setup; don't rely on memory.
- **Server data:** TanStack Query. **Client state:** Zustand. Keep both thin.
- **Styling:** follow the existing setup; if none, NativeWind.
- **Indexer:** separate TypeScript service in `/indexer` (Ponder recommended), writing to Postgres. Indexes Brew launches and PancakeSwap V3 swaps for Brew tokens on BSC.
- **App backend:** Supabase (Postgres, auth, realtime) for profiles, follows, and push tokens. The feed can poll every 5–10s in v1; switch to realtime once it works.
- **Share images:** `react-native-view-shot` + `expo-sharing`.
- **Errors/telemetry:** Sentry on mobile; structured JSON logs in the indexer. Instrument from day one — every feed query, quote, and swap should be traceable.

## Project structure

```
app/                      # the Expo project (npm workspace)
  src/
    app/                  # Expo Router screens only — keep logic out
      (tabs)/
        feed.tsx
        discover.tsx
        portfolio.tsx
        profile.tsx
      token/[address].tsx
      wallet/[address].tsx
    features/
      feed/               # feed queries, feed item components
      follow/
      trade/              # quotes, swap execution, slippage
      safety/             # scoring + badge UI
      receipts/           # receipt card rendering + sharing
    lib/
      chain/              # viem clients, abis/, addresses.ts, formatting
      api/                # backend + indexer clients
    components/           # shared UI primitives
    theme/
indexer/                  # standalone Ponder service, own package.json
shared/                   # @repo/shared: domain types + bigint money helpers
supabase/                 # migrations for profiles, follows, push tokens
docs/                     # decisions (ADR-style), scoring notes
```

Screens in `app/src/app/` compose feature components. Business logic lives in `app/src/features/*`; chain code lives in `app/src/lib/chain`. Paths like `src/features/safety` elsewhere in this file are relative to `app/`.

## Safety model

Every token shows a score (Safe / Caution / Danger) **and the reasons**. Never show a score without its reasons.

Inputs (v1):
- **Dev wallet:** has the deployer sold, how much, how fast after launch; prior launches from the same deployer and how they ended.
- **Holder concentration:** top-10 share of supply, excluding the LP pool, burn address, and known exchange wallets.
- **Contract checks:** owner privileges, mint function, adjustable taxes, blacklist functions.
- **Sell simulation (honeypot check):** simulate a small buy then sell with `eth_call` and viem state overrides; flag if the sell reverts or the effective tax is high. A third-party API like GoPlus can be a secondary signal, never the only one.
- **Wash activity:** volume vs. unique traders, wallets round-tripping with each other, clusters funded from the same source.

Rules:
- Scoring code is pure, deterministic, and unit-tested with fixture data.
- If an input can't be fetched, mark it "Unknown." Never treat missing data as safe.
- Wording is factual ("Deployer sold 40% of supply within 10 minutes"), never advice ("Don't buy this").

## Receipts

A receipt card proves an on-chain entry: token, entry tx hash, timestamp, market cap at entry, current market cap, and the multiple. It includes a BscScan link and is generated only from indexed on-chain data. **Never let users enter or edit receipt numbers.** Unverifiable receipts break the whole hype loop.

## Hard rules

**Custody and security**
- The app never sees, stores, or transmits private keys or seed phrases. All signing happens in the user's wallet.
- No secrets in the repo. Only public values go in `EXPO_PUBLIC_*` env vars. RPC provider keys, Supabase service keys, and similar live server-side only.
- Every swap shows token, amount, minimum received, slippage, and safety score before the user signs.
- Default slippage is conservative. Warn loudly above 5%, and never auto-raise slippage to force a trade through.

**Legal and product lines (do not cross without explicit sign-off)**
- No revenue sharing, yield, or dividends to token holders.
- No wagering where anyone wins money from another user.
- No custody of user funds, no pooled funds, no "managed" baskets.
- No language that reads as investment advice ("guaranteed," "can't lose," "next 100x").
- Show "Not affiliated with Brew" in the About/settings screen.

## Open questions (flag, don't decide silently)
- **App store policy:** Apple and Google have specific rules for apps that facilitate crypto trading, and in-app swaps may trigger review issues. Raise this before building the swap flow into a release build; a possible fallback is to hand off to the user's wallet app or a web flow for the swap step.
- Brew factory address and launch event signature (see TODO above).
- Taproom token: name, ticker, and mechanics are not final. Planned direction: holding unlocks pro features; in-app launch fees paid in the token are burned; season rewards are cosmetics or fee discounts. Do not build token features in v1.

## How to work in this repo

- **Plan first** for anything touching more than one feature: list files to change, then wait for a go-ahead.
- Keep changes small and scoped to one feature or fix.
- **Ask before adding a dependency.** Say what it's for and why an existing one won't do.
- Before calling a task done, run:
  - `npx tsc --noEmit`
  - `npx expo lint`
  - tests for anything in `src/features/safety` or `src/lib/chain`
- Don't silence type errors with `any` or `@ts-ignore`; fix the type or explain why you can't.
- Handle loading, empty, and error states on every screen that fetches data.
- Format all on-chain numbers through shared helpers in `src/lib/chain` (decimals, market cap, short addresses), never inline.
- Record decisions that would surprise a future reader in `docs/` as a short ADR.

## Commands

Run from the repo root:

```
npm run dev:app         # Expo dev server
npm run dev:indexer     # Ponder dev server (needs BSC_RPC_URL in indexer/.env.local)
npm run typecheck       # tsc --noEmit in every workspace
npm run lint            # expo lint in app/
npm test                # vitest in app, indexer and shared
npm run db:start        # local Supabase
npm run db:reset        # rebuild the local DB from migrations
```

Run from `app/`:

```
npx expo install <pkg>  # add a native-compatible dependency
npx tsc --noEmit        # typecheck the app only
npx expo lint           # lint
```

## Glossary

- **Brewed with / pair:** the asset a Brew token is paired against in its pool (WBNB, $BREW, a memecoin, or a bStock).
- **Dev wallet / deployer:** the wallet that launched the token.
- **Sniper:** a wallet that buys within the first blocks after launch to flip.
- **Burn:** tokens sent to a dead address, permanently removed from supply.
- **Receipt:** a verified, shareable proof of an on-chain entry.