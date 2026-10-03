# Tapped app

The Expo client. See the repo root `README.md` for setup and `CLAUDE.md` for scope and rules.

```
src/app/        Expo Router screens only; keep logic out
src/features/   feed, follow, profile, token, trade, safety, receipts, records
src/lib/chain/  viem clients, abis/, addresses.ts (re-exports @repo/shared), formatting
src/lib/api/    Supabase, indexer and Privy clients
src/components/ shared UI primitives
src/theme/      colors, spacing, fonts
```
