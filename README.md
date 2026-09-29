# Social Trading (working name)

Phase 1: read-only social layer for Solana traders — wallet tracking, leaderboard,
trade overlays, alerts. No custody, no money movement. See `SPEC.md`,
`DECISIONS.md` and `STATUS.md` in the Claude Project for the why.

```
app/       Expo (SDK 57) + React Native + expo-router — iOS/Android client
server/    Node + Fastify — Helius webhook ingestion, API, workers
shared/    @repo/shared — domain types + integer base-unit money utils
supabase/  Supabase CLI project — config + SQL migrations (source of truth for schema)
```

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node | 22 (see `.nvmrc`) | everything |
| Docker Desktop | any recent | local Postgres/Auth via `supabase start` |
| Expo Go on your phone, or Xcode / Android Studio | latest | running the app |

The Supabase CLI is installed as a dev dependency — no global install needed.

## First run

```bash
nvm use                     # Node 22
npm install                 # all workspaces; builds @repo/shared automatically
cp .env.example .env        # server secrets (git-ignored)
cp app/.env.example app/.env

npm run db:start            # local Supabase in Docker; prints URL + anon + service_role keys
#   → paste service_role key into .env, anon key into app/.env

npm run dev:server          # http://localhost:3000/health
npm run dev:app             # Expo dev server; scan QR with Expo Go
```

The server boots with no third-party keys in development. The Helius webhook
endpoint returns 503 until `HELIUS_WEBHOOK_SECRET` is set.

## Everyday commands

```bash
npm run typecheck           # all workspaces
npm test                    # vitest in shared + server
npm run build               # shared + server → dist/
npm run db:migration name   # new file in supabase/migrations/
npm run db:reset            # rebuild local DB from migrations
npm run dev -w shared       # watch-rebuild shared while editing it
```

Add app packages with `cd app && npx expo install <pkg>` (picks SDK-compatible
versions), not plain `npm install`.

## Receiving Helius webhooks locally

Helius needs a public URL. Tunnel the dev server (e.g. `cloudflared tunnel --url
http://localhost:3000`) and register `https://<tunnel>/webhooks/helius` in the
Helius dashboard with the Authorization header set to your `HELIUS_WEBHOOK_SECRET`.

## Security rules (non-negotiable)

- `.env` files are git-ignored. Never commit keys.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — **server only**.
- Anything prefixed `EXPO_PUBLIC_` ships inside the app binary and is public.
  Only the Supabase anon key goes there; every table the app reads needs RLS.
- Token amounts are `bigint` base units end to end. No floats for money.
