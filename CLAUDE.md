# CLAUDE.md — Tapped

This file is loaded at the start of every Claude Code session. Read it fully before touching code.

## What this is

**Tapped** is a social trading app for the **Brew** token launchpad (brew.family) on **BNB Smart Chain (BSC)**.

Core loop: open the app → see a live feed of what the wallets you follow are buying and launching on Brew → tap any trade → buy the same token in one tap from your in-app wallet, with a safety badge shown before you confirm.

The wallet and trading experience is modelled on the Fomo app: sign in with Google or Apple, get a self-custodial wallet inside the app, and trade without leaving it. See "Wallet model" below and `docs/0007-embedded-wallet.md`.

That loop is not what makes Tapped different: larger apps already offer it on BSC. What Tapped must be best at is in "Positioning" below. Read it before proposing or building a feature.

Tapped is an **independent, community-built app. It is not affiliated with or endorsed by Brew.** Never use Brew's logo or imply official status in UI, copy, or metadata.

The app was called Taproom until 2026-10-03 (`docs/0021-rename-to-tapped.md`). Every document now uses the new name; only that record and git history keep the old one. The repo folder is `~/Dev/tapped`.

### Brew context (domain knowledge)
- Brew is a token launchpad on BSC, live since early September 2026. Tokens launch directly into **PancakeSwap V3** pools with **permanently locked liquidity** (no bonding curve).
- Tokens are "brewed with" a pair asset: WBNB, USDT, the native **$BREW** token, other memecoins, or tokenized stocks ("bStocks"). A Brew token can be brewed with another Brew token.
- Brew has **five launch factories**: standard (about 89% of launches on 2026-10-01), dividend, multi-pair v1, and two deployments of multi-pair v2. A multi-pair launch gives one token several pools. The standard factory, multi-pair v1 and the current multi-pair v2 are indexed; the dividend factory and the older v2 deployment are not (`docs/0012-indexer-history-and-coverage.md`).
- Tokens from one Brew factory share one contract template, identical except for the deployer's address written into the code. The standard template has no owner, mint, blacklist or tax-setting functions (`docs/0009-safety-checks.md`); the multi-pair templates differ from it and the tokens scanned had none of those functions either (`docs/0012`, `docs/0014`).
- Trading fee is 1%; the token side of the fee is burned. The pair side is reported to be split between the creator and the protocol, and a creator can route their share to holders or to buyback-and-burn. That split comes from secondary sources: check it on-chain before relying on it.
- $BREW contract: `0xfa6d9b504848606eb9aec04ccc161d169b3f2159`
- Confirmed addresses live in `shared/src/addresses.ts`, each with a comment saying where it came from, with each factory's deployment block beside them. `app/src/lib/chain/addresses.ts` re-exports the addresses. Still unconfirmed: Brew's liquidity locker contracts. Brew's site bundle names one per factory; none has been checked on-chain.

**Never guess or invent a contract address, ABI, or event signature.** If one is needed and not in `addresses.ts`, stop and ask.

## Positioning

Set on 2026-10-02 at the project owner's request. The decision is in `docs/0011-positioning.md` and the evidence in `docs/research-2026-10-competitive-landscape.md`.

- **The core loop is not unique.** Fomo, GMGN and Axiom already offer wallet following or tracking, one-tap trading and generic token checks on BSC. They can trade every Brew token, because Brew tokens are ordinary PancakeSwap V3 pools.
- **Tapped does not compete on** execution speed, funding options, chain coverage or trading-terminal features. Build those only as far as a user needs in order to act on what they see.
- **Tapped must be best at two things:**
  1. **Provable records.** Receipts and trader records computed only from indexed chain data, losses included, that anyone can check without trusting a screenshot.
  2. **Brew-specific risk reading.** What generic scanners do not compute per launchpad: a deployer's record across Brew launches, who held the supply in the first blocks, and what the pair asset adds to the risk.
- **Both depend on complete indexed history.** A record built from partial history is not verified: say what period it covers, or do not show it. The indexer's `/coverage` route is where that period comes from.
- **Nobody ships a social layer for Brew yet, Brew included** (checked 2026-10-02). That is a head start, not a moat: Brew or a larger app could add one.
- **Tapped's ceiling is Brew's volume.** Keep launch, pool and trade data free of Brew-only assumptions so a second launchpad could be added without a rewrite. Adding one is not v1 work.

Every feature should serve one of those two goals or be a release requirement (see MVP scope). If it does neither, flag it before building.

## MVP scope (v1)

### Steps 1 to 7: first version built

Each step has a first version. The record named beside it says what was built and its known limits; read it before changing that area.

1. **Sign in + wallet + profile** — the app opens on a sign-in screen offering Google and Apple, and nothing else is reachable until the user signs in; an embedded self-custodial wallet is created for the user; the profile is keyed to that wallet's address. (`docs/0007`)
2. **Follow graph** — follow/unfollow any wallet; search by address or profile name. (`docs/0003`)
3. **Live trade feed** — buys, sells, and launches from followed wallets on Brew tokens, one row per token, polled every 10 seconds. It opens on Trending, and shows every wallet's activity when the user follows nobody. (`docs/0004`)
4. **Token page** — price, market cap, liquidity, holders, recent trades, safety badge. Money figures are in the pair asset, not USD. (`docs/0005`, `docs/0006`)
5. **One-tap buy** — swap via PancakeSwap V3 from the user's embedded wallet, inside the app, with slippage control and a safety check before the user confirms. BNB-paired tokens only so far. (`docs/0008`)
6. **Safety badges** — a score plus plain-language reasons on every token (see Safety model). (`docs/0009`)
7. **Receipt cards** — shareable image proving an on-chain entry (see Receipts). (`docs/0010`)

### Steps 8 to 11: next, in this order

These are the steps that serve the positioning. `docs/0011` has the reasoning.

8. **Indexer history and coverage** — backfill from the standard factory's deployment block, and index the multi-pair factories. Partly built (`docs/0012`): the deployment blocks are confirmed, multi-pair v1 and v2 are indexed, and `GET /coverage` says which factories are indexed and from which block. The backfill from deployment runs in development through a keyed NodeReal RPC and two patches to Ponder (`docs/0016`); production still needs an RPC plan and Postgres. The dividend factory waits on its open question. Steps 9 to 11 are only as good as this.
9. **Trader records** — on the wallet screen, a wallet's entries, exits and results on Brew tokens, computed from the indexer (see Trader records). First version built (`docs/0013`); it states a partial period until step 8's backfill runs.
10. **Checkable receipts** — a public link, and a QR code on the card, that re-renders the receipt from indexed data; and a list of the user's own receipts (see Receipts). Built: the list (Profile → Your receipts, `docs/0010`), and the indexer's public page at `/r/<trade id>` with its link and QR code on the card (`docs/0015`). Cards carry the link only once `EXPO_PUBLIC_RECEIPT_PAGE_URL` is set, which waits on the production domain.
11. **Brew-specific safety inputs** — deployer record, launch-time holders, pair-asset risk and origin (see Safety model). First version built (`docs/0014`); deployer records are partial until step 8's backfill runs, and bundles are not detected.

### Before the first release build

Requirements for a build that real users can fund. They are not where Tapped competes, so keep each one minimal.

- **Key export** — a hard rule below, not built yet.
- **Sell** — a user who bought in the app must be able to sell in the app, through the same review step as a buy. Built (`docs/0017`), BNB-paired tokens only like the buy; not yet run with a real wallet.
- **Portfolio tab** — the user's own holdings. Built (`docs/0018`): indexed Brew tokens with live balances and values per pair asset.
- **Error reporting** — Sentry is not installed (see Stack).
- **App identity** — the bundle identifier is `com.andresvaldez.tapped` (iOS bundle ID and Android package, set 2026-10-03 in `app/app.json` with the rename) and the URL scheme is `tapped`. Still needed: an Apple Developer organization account with Sign in with Apple enabled for that ID, and the same ID and URL scheme in the Privy dashboard's allowed app identifiers (`docs/0007`, `docs/0021`).
- **Store rules** — the checks under Open questions.

### Out of scope for v1 (v2+)
Leaderboard seasons, token-gated holder chat rooms, in-app token launching ("Snap & Launch"), monthly Wrapped cards, push alerts on dev-wallet moves, PnL/tax exports, Chinese-language support, launchpads other than Brew, the Tapped token itself. Also v2+, although Fomo has them: funding the wallet with Apple Pay or a card, Tapped paying network fees for users, a per-trade fee, and chains other than BSC. Don't build these unless asked; do keep the data model friendly to them.

## Stack (defaults — change only with a stated reason)

Check `package.json` first. If the repo already uses a library for a job, follow what's there instead of these defaults.

- **App:** Expo (React Native) + **Expo Router**, **TypeScript strict**.
- **Native deps:** install with `npx expo install <pkg>` so versions match the Expo SDK. **Do not upgrade the Expo SDK** without asking.
- **Wallet:** an embedded self-custodial wallet from **Privy** (the provider Fomo uses), with **viem**. `viem` is pinned to 2.56.0 in the app and the indexer, the version Privy's SDK requires; do not bump it on its own. Check current Privy docs for Expo setup and BSC support; don't rely on memory. The earlier Reown AppKit (WalletConnect) flow has been removed from the app's code; its packages remain installed until the external-wallet question below is settled.
- **Server data:** TanStack Query. **Client state:** Zustand. Keep both thin.
- **Styling:** React Native `StyleSheet` with the design tokens in `app/src/theme` (`docs/0020`): colours for both themes, the Geist type scale, 4pt spacing and corner sizes. Use the tokens and the components in `app/src/components`, never literal colours or font names. Do not add NativeWind.
- **Indexer:** separate TypeScript service in `/indexer`, built on Ponder: PGlite in development, Postgres when `DATABASE_URL` is set. Ponder is patched (`patches/`, applied by `patch-package` on install) to keep its log requests filtered by address; check the patches on any Ponder upgrade (`docs/0016`). It indexes Brew launches, PancakeSwap V3 swaps in Brew pools and Brew token transfers on BSC, and serves GraphQL plus the `/activity`, `/safety` and `/coverage` routes. Anything that needs a server-side RPC key goes in its API routes.
- **App backend:** Supabase (Postgres, auth, realtime) for profiles, follows, and push tokens, plus the `privy-session` edge function that turns a Privy sign-in into a Supabase session. On-chain data stays in the indexer's database. The feed polls every 10 seconds in v1; switch to realtime once it works.
- **Share images:** `react-native-view-shot` + `expo-sharing`.
- **Errors/telemetry:** Sentry on mobile; structured JSON logs in the indexer. Every feed query, quote, and swap should be traceable. Sentry is **not installed yet** (`docs/0008`): it is a requirement before the first release build, and adding it follows "ask before adding a dependency".

## Project structure

```
app/                      # the Expo project (npm workspace)
  src/
    app/                  # Expo Router screens only — keep logic out
      sign-in.tsx
      (tabs)/
        feed.tsx
        discover.tsx
        portfolio.tsx
        profile.tsx
      token/[address].tsx
      wallet/[address].tsx
      receipt/[id].tsx
    features/
      feed/               # feed queries, feed item components
      follow/             # follow graph, wallet search, wallet header
      profile/            # sign-in, session, profile card
      token/              # token page: stats, holders, recent trades
      trade/              # quotes, swap execution, slippage
      safety/             # scoring + badge UI
      receipts/           # receipt card rendering + sharing
      records/            # trader records on the wallet screen
    lib/
      chain/              # viem clients, abis/, addresses.ts, formatting
      api/                # Supabase, indexer and Privy clients
    components/           # shared UI primitives
    theme/
indexer/                  # standalone Ponder service, own package.json
shared/                   # @repo/shared: addresses, domain types, bigint money and price helpers
supabase/                 # migrations (profiles, follows, push tokens) and edge functions
docs/                     # decision records (ADR-style) and research notes
```

Screens in `app/src/app/` compose feature components. Business logic lives in `app/src/features/*`; chain code lives in `app/src/lib/chain`. Paths like `src/features/safety` elsewhere in this file are relative to `app/`.

## Wallet model

Modelled on the Fomo app. Signed off by the project owner on 2026-10-02; this replaces the earlier "all signing happens in the user's own external wallet" rule.

- **Sign-in:** Google or Apple only. No email-and-code sign-in, no external wallet connection, no seed phrase at sign-up. The app opens on the sign-in screen and the rest of it is behind that.
- **Wallet:** created for the user by the wallet provider when they first sign in. It is self-custodial: the key is split by the provider so that neither Tapped nor the provider alone can move funds.
- **Trading:** the user confirms a trade inside the app and the embedded wallet signs it. There is no hop to a separate wallet app.
- **Profile:** keyed to the embedded wallet's address, so follows, the feed and receipts work as before.
- **Leaving:** the user can export their key and take the wallet elsewhere.

## Safety model

Every token shows a score (Safe / Caution / Danger) **and the reasons**. Never show a score without its reasons.

Tokens from one factory share one template, so the contract check passes for every one of them, and the sell simulation is expected to as well. Neither tells one Brew token from another. The inputs that differ between tokens carry the score: the Brew-specific ones below (`docs/0014`).

Generic inputs (`docs/0009-safety-checks.md` has the thresholds and what each input leaves out):
- **Dev wallet:** has the deployer sold, how much, how fast after launch.
- **Holder concentration:** top-10 share of supply, excluding the token's pools and the burn address. Known exchange wallets are not excluded yet.
- **Contract checks:** owner privileges, mint function, adjustable taxes, blacklist functions.
- **Sell simulation (honeypot check):** a small buy then a sell inside one simulated block (`eth_simulateV1` through viem, with a state override for the balance); flag if the sell reverts or the round-trip loss is high. BNB-paired tokens only so far. A third-party API like GoPlus can be a secondary signal, never the only one.
- **Wash activity:** trades vs. unique wallets, and the busiest wallet's share of trades.

Brew-specific inputs (`docs/0014-brew-safety-inputs.md` has the definitions and thresholds):
- **Origin:** the token was created by a Brew factory in `addresses.ts` and its code is that factory's template. A token that is not is never Safe.
- **Pair asset:** what each pool is brewed with, from Brew's own list of pair assets (`shared/src/pair-assets.ts`). Liquidity priced in $BREW, another Brew token, a tokenized stock or a memecoin can lose its value with that asset.
- **Deployer record:** the deployer's earlier Brew launches and how they went (price fall, or the deployer selling within an hour), within the indexed history.
- **Launch-time holders:** the share of supply bought in the first three blocks of trading, the deployer's included.

Still to build:
- **Bundles:** launch buyers funded from the same source, so one holder looks like many.
- **Wash activity, in full:** wallets round-tripping with each other, clusters funded from the same source.

Rules:
- Scoring code is pure, deterministic, and unit-tested with fixture data.
- If an input can't be fetched, mark it "Unknown." Never treat missing data as safe.
- Wording is factual ("Deployer sold 40% of supply within 10 minutes"), never advice ("Don't buy this").
- Thresholds are recorded in the decision record that introduces them. They are judgement until calibrated against how tokens ended; do not describe them as more than that.

## Receipts

A receipt card proves an on-chain entry: token, entry tx hash, timestamp, market cap at entry, current market cap, and the multiple. It includes a BscScan link and is generated only from indexed on-chain data. **Never let users enter or edit receipt numbers.** Unverifiable receipts break the whole hype loop.

- **A shared image can be edited.** Each card therefore carries a public link, and a QR code for it, to the indexer's page that re-renders the receipt from indexed data (`docs/0015`). The app and the page build the receipt with the same code (`shared/src/receipt.ts`).
- **A receipt proves one thing:** that the wallet shown bought that token at that time and price. It does not prove the wallet still holds, or made a profit. Copy on the card must not claim more.

## Trader records

A trader record is what a wallet did on Brew tokens: its entries, its exits, and the result of each closed position, computed only from indexed trades. It is on the wallet screen; `docs/0013` has the definitions of a position, its status and its result. The maths is in `shared/src/record.ts`.

- **Losses are always shown.** No setting hides them, and nothing in a record is entered or edited by the user.
- **State the period covered.** If the indexed history for a wallet is incomplete, the record says so. Never present a partial record as complete.
- **No adding across pair assets without a price.** Amounts in different pair assets are not comparable (`docs/0004`, `docs/0006`).
- **Factual wording only,** as with safety reasons: what the wallet did, never whether to copy it.
- Record maths is pure and unit-tested with fixture data, like scoring.

## Hard rules

**Custody and security**
- The wallet is self-custodial and embedded. Key material is handled only by the wallet provider's SDK. Tapped's own code, servers, logs and telemetry never read, store or transmit a private key, seed phrase or key share.
- Nothing is signed without an explicit user confirmation in the app for that specific action. No background signing, no server-side signing, and no delegated or session signing without explicit sign-off.
- The user can always export their key.
- No secrets in the repo. Only public values go in `EXPO_PUBLIC_*` env vars. RPC provider keys, Supabase service keys, and similar live server-side only.
- Every swap shows token, amount, minimum received, slippage, and safety score before the user confirms.
- Default slippage is conservative. Warn loudly above 5%, and never auto-raise slippage to force a trade through.

**Legal and product lines (do not cross without explicit sign-off)**
- No revenue sharing, yield, or dividends to token holders.
- No wagering where anyone wins money from another user.
- No custody of user funds, no pooled funds, no "managed" baskets. The embedded wallet is the user's own: Tapped must never be able to move funds without the user.
- No language that reads as investment advice ("guaranteed," "can't lose," "next 100x").
- Show "Not affiliated with Brew" in the About/settings screen.

## Open questions (flag, don't decide silently)
- **App store policy:** decided to trade inside the app, as Fomo does. Apple and Google still have specific rules for apps that facilitate crypto trading; check the current guidelines before the first release build. Apple's guideline 3.1.5, as read on 2026-10-02:
  - (i) wallet apps must come from a developer enrolled as an organization;
  - (iii) exchange features only in regions where the app has the licensing for them;
  - (iv) "crypto-securities or quasi-securities trading" must come from approved financial institutions;
  - (v) no offering currency for tasks such as inviting users or posting.
- **bStock-paired tokens:** whether Tapped shows them, and whether it lets users buy them, given 3.1.5(iv). Nothing filters them today, and indexed multi-pair launches include bStock pools (`docs/0012`).
- **Dividend-factory tokens:** whether Tapped shows or trades Brew tokens that route fees to holders. The "no dividends" rule above is about Tapped's own offering and does not answer this.
- **External wallets:** whether connecting an existing wallet comes back as an option beside the embedded wallet. If not, uninstall the Reown and wagmi packages and turn off Supabase's Sign in with Ethereum provider, which is still enabled from `docs/0002`.
- **Fomo features not yet decided:** Apple Pay or card funding (needs a payment provider and its compliance terms), Tapped paying network fees, and charging a per-trade fee. Each needs its own sign-off.
- **Finding wallets to follow:** Discover is search by address or name, and a token's trades link to each trader's wallet screen. Whether v1 also lists wallets by their record is undecided; a ranked list is close to the leaderboard that is v2.
- **Receipt verification page:** served by the indexer at `/r/<trade id>` (decided 2026-10-02, `docs/0015`). Still open: the domain, which the owner is getting, and where the indexer is deployed.
- **Languages:** Brew's own site ships Chinese and Japanese (checked 2026-10-02). Tapped v1 is English-only, and Chinese is listed as v2 above; whether that still holds is undecided.
- **The name:** "Tapped" is one letter from Tipped (@Tippedonbrew), another app on Brew with a gold "T" on black. The owner chose the name knowing this. Not yet checked: the App Store, trademark registers, a domain and an X handle for "Tapped".
- **Launchpad dependency:** whether Tapped stays Brew-only. See Positioning.
- **Brew facts still unconfirmed:** the liquidity locker contracts, and the address of the older multi-pair v2 deployment.
- **Production RPC:** NodeReal's free plan covers the backfill and about eight days of following new blocks (`docs/0016`, measured 12.5M compute units a day). Production needs its paid plan or another provider.
- **Multi-pair tokens in the app:** which of a token's pools the token page prices and the buy flow trades through. Today it is whichever the indexer returns first.
- Tapped token: name, ticker, and mechanics are not final. Planned direction: holding unlocks pro features; in-app launch fees paid in the token are burned; season rewards are cosmetics or fee discounts. Rewards must not pay users for inviting or posting (Apple 3.1.5(v)). Do not build token features in v1.

## How to work in this repo

- **Name the goal.** Before starting a feature, say which it serves: provable records, Brew-specific risk reading, or a release requirement (see Positioning and MVP scope). If none, flag it before building.
- **Plan first** for anything touching more than one feature: list files to change, then wait for a go-ahead.
- Keep changes small and scoped to one feature or fix.
- **Ask before adding a dependency.** Say what it's for and why an existing one won't do.
- Before calling a task done, run:
  - `npx tsc --noEmit`
  - `npx expo lint`
  - tests for anything in `src/features/safety`, `src/features/records` or `src/lib/chain`, and for the record, receipt and format code in `shared/`
- Don't silence type errors with `any` or `@ts-ignore`; fix the type or explain why you can't.
- Handle loading, empty, and error states on every screen that fetches data.
- Format all on-chain numbers through the shared helpers (decimals, market cap, short addresses), never inline. In the app, import them from `src/lib/chain/format`; they live in `shared/src/format.ts` so the indexer's receipt page prints numbers the same way.
- Record decisions that would surprise a future reader in `docs/` as a short ADR.
- **Keep the docs true.** When a change makes a statement in this file, a README or a decision record stale (a step built, a question settled, an address confirmed), fix it in the same change. In an accepted record, add a dated line under "Since then" instead of rewriting what was decided.

## Commands

Run from the repo root:

```
npm run dev:app         # Expo dev server
npm run dev:indexer     # Ponder dev server (needs BSC_RPC_URL in indexer/.env.local)
npm run typecheck       # tsc --noEmit in every workspace
npm run lint            # expo lint in app/
npm test                # vitest in app, indexer, shared and supabase/functions
npm run db:start        # local Supabase
npm run db:reset        # rebuild the local DB from migrations
npm run db:migration <name>   # new file in supabase/migrations/
```

Run from `app/`:

```
npx expo install <pkg>  # add a native-compatible dependency
npx tsc --noEmit        # typecheck the app only
npx expo lint           # lint
```

## Glossary

- **Brewed with / pair:** the asset a Brew token is paired against in its pool (WBNB, USDT, $BREW, a memecoin, or a bStock).
- **Dev wallet / deployer:** the wallet that launched the token.
- **Sniper:** a wallet that buys within the first blocks after launch to flip.
- **Bundle:** wallets funded from the same source that buy together at launch, so one holder looks like many.
- **Template:** the contract code that every token from one Brew factory shares.
- **Burn:** tokens sent to a dead address, permanently removed from supply.
- **Receipt:** a verified, shareable proof of an on-chain entry.
- **Trader record:** a wallet's entries, exits and results on Brew tokens, computed from indexed trades.
