# Taproom

A social trading app for the Brew token launchpad on BNB Smart Chain. Follow
wallets, see what they buy and launch on Brew, and buy the same token from the
wallet inside the app, with a safety badge shown first.

Larger apps already offer that loop on BNB Chain. What Taproom is built to be best
at is records anyone can check (receipts and trader records computed from chain
data) and risk reading specific to Brew. See "Positioning" in `CLAUDE.md`.

Taproom is an independent, community-built app. It is not affiliated with or
endorsed by Brew.

`CLAUDE.md` holds the product scope, positioning, safety model and hard rules.
`docs/` holds decision records, numbered in the order they were made. A later
record can supersede an earlier one; each record's "Status" line and "Since then"
section say where it stands.

```
app/       Expo (SDK 57) + React Native + Expo Router: iOS/Android client
indexer/   Ponder: indexes Brew launches, PancakeSwap V3 swaps and token transfers on BSC
shared/    @repo/shared: contract addresses, domain types, integer money and price helpers
supabase/  Supabase CLI project: profiles, follows, push tokens (SQL migrations), sign-in edge function
docs/      Decision records and research notes
```

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node | 22 (see `.nvmrc`) | everything |
| Docker Desktop | any recent | local Postgres/Auth via `supabase start` |
| Xcode / Android Studio | latest | development builds of the app |

The Supabase CLI is installed as a dev dependency.

## First run

```bash
nvm use
npm install                              # all workspaces; builds @repo/shared
cp app/.env.example app/.env             # Privy IDs, or EXPO_PUBLIC_SKIP_SIGN_IN=true in development
cp indexer/.env.example indexer/.env.local   # set BSC_RPC_URL
cp supabase/functions/.env.example supabase/functions/.env   # set PRIVY_APP_ID

npm run db:start                         # local Supabase; paste the anon key into app/.env
npm run dev:indexer                      # http://localhost:42069
npm run dev:app                          # Expo dev server
```

The indexer registers Brew's standard launch factory. With `START_BLOCK` unset it
starts at the chain head, so it sees only launches made after it starts and trades
in those tokens. Full history needs the factory's deployment block and an RPC that
serves old logs (`docs/0004-indexer-and-feed.md`).

## Everyday commands

```bash
npm run typecheck           # all workspaces
npm run lint                # expo lint in app/
npm test                    # vitest in app, indexer, shared and supabase/functions
npm run db:migration name   # new file in supabase/migrations/
npm run db:reset            # rebuild the local DB from migrations
```

Add app packages with `cd app && npx expo install <pkg>`, not plain `npm install`.

## Security rules

- The wallet is embedded and self-custodial. Key material is handled only by the
  wallet provider's SDK. Taproom's own code, servers and logs never read, store or
  transmit a private key, seed phrase or key share.
- Nothing is signed without the user confirming that specific action in the app.
- `.env` files are git-ignored. Never commit keys.
- Anything prefixed `EXPO_PUBLIC_` ships inside the app binary and is public.
  RPC provider keys and the Supabase service-role key stay server-side.
- Token amounts are `bigint` base units end to end. No floats for money.
- Never guess a contract address, ABI or event signature. Confirmed ones are in
  `shared/src/addresses.ts`.
