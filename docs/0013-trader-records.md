# 0013: Trader records

Date: 2026-10-02. Status: accepted; definitions signed off by the owner the same
day. Built and checked against live indexed data. Not yet viewed on a device.

## Context

MVP step 9 (0011): on the wallet screen, a wallet's entries, exits and results in
Brew tokens, computed only from indexed trades, losses included, with the period
covered stated. It serves the first positioning goal, provable records. The
wallet screen was a placeholder.

## Definitions

- **A position is one wallet in one token.** Buys are entries and sells are exits,
  as indexed (0004). A trade counts for the wallet that sent the transaction.
- **Amounts are kept per pair asset** (a "leg"). Token amounts of one token can be
  added across legs; pair-asset amounts never are.
- **Status:**
  - **open** while the wallet has sold fewer tokens than it bought;
  - **closed** once it has sold at least as many as it bought;
  - **exit-only** when it sold with no indexed buy, so there is no entry to
    compare.
- **A result exists only for a closed position traded against one pair asset.**
  It is what was received minus what was paid, in that asset, with the multiple
  received ÷ paid, truncated to hundredths. Above zero is a gain, below zero a
  loss, zero even.
- **A closed position that mixed pair assets has no result.** It shows its amounts
  in each asset and says why there is no result. One of the fixtures is a real
  case: MSTOCK was bought for WBNB and sold for Cake.
- **An open position has no result and no unrealised value.** It shows what was
  paid and sold so far.
- **Transfers are flagged, not hidden.** If the wallet's indexed balance is more
  than its trades explain, tokens arrived another way. If it is less, tokens left
  another way, or a buy paid out to another address. Either case is stated on the
  position. When a position sold more than it bought, the result includes tokens
  that came by transfer; the flag says so.
- **Totals are per pair asset,** over closed positions with a result, and never
  added together. The summary counts gains, losses and even results side by side.
- **Network fees are not included,** and the record says so. Pool fees are, since
  amounts are what the wallet actually paid and received.

## Decisions

- **The maths is in `@repo/shared` (`shared/src/record.ts`),** pure and tested with
  six real positions from two wallets, as the indexer returned them. It is shared
  so a public page (step 10) can compute the same record the app shows.
- **The indexer supplies facts, the app computes,** as with safety (0009).
  `POST /record` returns the wallet's trades added up per token and pair asset, in
  SQL, with its current indexed balance of each token. Positions are ordered by
  newest trade and capped at 500. A wallet with more is marked as cut short, and
  its counts cover only those 500.
- **A token with no indexed launch is left out of the record.** Its trades can
  exist only when indexing started part-way through a multi-pair v2 launch (0012).
- **The record is never shown without its coverage note.** The app reads
  `/coverage` and Ponder's `/ready` with the record. If coverage cannot be read,
  the record is not shown. The note gives the start date, which factories are
  left out, whether the indexer has caught up, and whether the list is cut
  short. "Partial history" is in the title unless all of those are clear.
- **`/coverage` now gives each start block's time** (`fromTime`), read once from
  the chain. If the read fails, it is null and the note gives the block number
  instead.
- **Factual wording only.** Gain, loss, paid, received, and what the record covers.
  Nothing says whether to follow or copy a wallet.
- **Feature code lives in `app/src/features/records`.** The wallet screen composes
  the existing wallet header with the summary and one row per position.

## Checked against live data

With the indexer running from block 125,035,000, `/record` returned three positions
each for the two fixture wallets (an open position, a gain and a loss; and a
mixed-pair position, a gain and a loss). The numbers in the tests are those
responses.

## Known limits

- **Records are partial until the backfill runs** (0012). Today the note reads
  "Covers trades from 2026-10-01 04:16 UTC…", and leaves out the dividend factory.
- **No price, so no comparison across pair assets and no value for open
  positions.** The USD follow-up in 0006 would allow both.
- **Attribution is by transaction sender.** Trades through a smart-contract wallet
  or relayer count for the sender, and a buy whose tokens went to another address
  shows up as a transfer flag.
- **Tokens received by transfer have no cost.** A position that sells them reports
  their proceeds as part of the result, flagged as above.
- **Losses are always listed, but positions are ordered by time only.** There is no
  sort or filter.
- **Not viewed on a device.** The screen typechecks and lints; the maths and the
  coverage wording are unit-tested.

## Still open

- How users find wallets with a record (CLAUDE.md, "Finding wallets to follow").
- Whether an open position should show a value at the current pool price.
