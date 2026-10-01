# Taproom app

The Expo client. See the repo root `README.md` for setup and `CLAUDE.md` for scope and rules.

```
src/app/        Expo Router screens only; keep logic out
src/features/   feed, follow, trade, safety, receipts
src/lib/chain/  viem clients, abis/, addresses.ts, formatting
src/lib/api/    Supabase and indexer clients
src/components/ shared UI primitives
src/theme/      colors, spacing, fonts
```
