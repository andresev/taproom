# Taproom

A social trading app for the Brew token launchpad on BNB Smart Chain. Follow
wallets, see what they buy and launch on Brew, and buy the same token from your
own wallet with a safety badge shown first.

Taproom is an independent, community-built app. It is not affiliated with or
endorsed by Brew.

`CLAUDE.md` holds the product scope, safety model and hard rules. `docs/` holds
decision records.

```
app/       Expo (SDK 57) + React Native + Expo Router: iOS/Android client
indexer/   Ponder: indexes Brew launches and PancakeSwap V3 swaps on BSC
shared/    @repo/shared: domain types + integer base-unit money helpers
supabase/  Supabase CLI project: profiles, follows, push tokens (SQL migrations)
docs/      Decision records
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
cp app/.env.example app/.env
cp indexer/.env.example indexer/.env.local   # set BSC_RPC_URL

npm run db:start                         # local Supabase; paste the anon key into app/.env
npm run dev:indexer                      # http://localhost:42069
npm run dev:app                          # Expo dev server
```

The indexer has no contracts registered yet: the Brew factory address and launch
event are unconfirmed (see `app/src/lib/chain/addresses.ts`).

## Everyday commands

```bash
npm run typecheck           # all workspaces
npm run lint                # expo lint in app/
npm test                    # vitest in app, indexer and shared
npm run db:migration name   # new file in supabase/migrations/
npm run db:reset            # rebuild the local DB from migrations
```

Add app packages with `cd app && npx expo install <pkg>`, not plain `npm install`.

## Security rules

- The app never sees, stores or transmits private keys or seed phrases. All
  signing happens in the user's wallet.
- `.env` files are git-ignored. Never commit keys.
- Anything prefixed `EXPO_PUBLIC_` ships inside the app binary and is public.
  RPC provider keys and the Supabase service-role key stay server-side.
- Token amounts are `bigint` base units end to end. No floats for money.
- Never guess a contract address, ABI or event signature.
