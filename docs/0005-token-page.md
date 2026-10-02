# 0005: Token page, part 1

Date: 2026-10-01. Status: accepted.

## Context

MVP step 4 is the token page: price, market cap, liquidity, holders, recent trades
and a safety badge. The indexer currently knows launches, pools and trades, and
nothing about prices, reserves or balances.

## Decisions

- **The page ships in two parts.** Part 1 shows only what is already indexed: name,
  contract, launcher, launch time, total supply, the pair asset and pool fee, buy
  and sell totals for a chosen window, and the 30 newest trades.
- **No safety badge yet.** CLAUDE.md says a score is never shown without its
  reasons and missing data is never treated as safe. None of the inputs exist, so
  the page shows no badge at all rather than a placeholder that could read as a
  verdict. It arrives with MVP step 6.
- **No price, market cap, liquidity or holder count yet.** These need pool state
  and token transfers indexed, which is part 2.
- **The Buy button is present but disabled** until the swap flow (step 5), which
  must show the safety score before signing.
- **Totals reuse the indexer's `/activity` route** with a new optional `token`
  filter, and the window setting is shared with the feed, so the page opens on the
  window the feed was showing.
- **Token code lives in `app/src/features/token`**, a feature folder CLAUDE.md's
  structure section did not list. The buy/sell bar moved to `app/src/components`
  because the feed and the token page both use it.

## Known limits

- A token the indexer has not seen shows "Token not indexed": anything launched
  before the indexed history, or through a factory that is not indexed.
- Trades are attributed to the transaction sender, as in the feed (0004).
- The trade list has no paging beyond the newest 30.

## Since then

- 2026-10-02: price, market cap, liquidity and holders arrived in 0006, the buy flow
  in 0008 and the safety badge in 0009. The page now has all three, and each buy in
  the trade list links to its receipt (0010).
