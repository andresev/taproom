# 0012: Indexer history and factory coverage

Date: 2026-10-02. Status: accepted; multi-pair indexing and the coverage route are
built, the backfill from deployment has not been run.

## Context

MVP step 8 (0011): backfill from the standard factory's deployment block, index the
multi-pair factories, and be able to say what period the index covers. Trader
records, checkable receipts and the Brew-specific safety inputs are only as good as
this. It serves both positioning goals: provable records and Brew-specific risk
reading.

0004 left the deployment block unconfirmed and indexed only the standard factory.

## What was checked on 2026-10-02

**Deployment blocks.** Found as the first block at which each factory address has
code (`eth_getCode` against an archive node), then confirmed by the creation
transaction in that block, whose receipt names the factory as the contract created.
Brew's own site bundle records the same block for multi-pair v2.

| Factory | Deployment block | Date (UTC) | Launches on 2026-10-02 |
|---|---|---|---|
| Standard | 120,201,671 | 2026-09-05 | 2,914 |
| Dividend | 120,354,791 | 2026-09-06 | 147 |
| Multi-pair v1 | 120,388,203 | 2026-09-06 | 151 |
| Multi-pair v2 | 121,813,753 | 2026-09-14 | 64 |

Launch counts are each factory's `totalLaunches()`. The creation transactions are in
`shared/src/addresses.ts`.

**Multi-pair launch events.** The signatures in Brew's bundle decode real launches
in strict mode: nine from multi-pair v1 and a three-pool launch from v2.

- v1 emits one `TokenLaunchedMultiPair` per launch, with the pools as an array.
  All nine sampled launches had exactly two pairs.
- v2 spreads a launch over several transactions: `LaunchStarted` names the token,
  then one `PoolAdded` per pool, then `LaunchCompleted`.
- Multi-pair tokens do not use the standard factory's 1,991-byte template. The v1
  and v2 tokens checked are 2,088 bytes.

**How much the chain emits.** In a 40-block sample, BSC averaged 271 `Transfer`
logs and 22 PancakeSwap V3 `Swap` logs per block, across all contracts.

## Decisions

- **Deployment blocks are recorded in `shared/src/addresses.ts`** as
  `DEPLOYMENT_BLOCKS`, beside the addresses, each with its creation transaction.
- **`START_BLOCK` stays an env var, and each factory is indexed from the later of
  `START_BLOCK` and its own deployment block.** Setting it to 120201671 indexes
  everything. Unset still means the chain head.
- **Multi-pair v1 and v2 are indexed.** The dividend factory is not: whether
  Taproom shows tokens that route fees to holders is still open (CLAUDE.md).
- **v2 pools are followed from `PoolAdded.pool`,** the same pattern as the standard
  factory. `PoolAdded` does not carry the fee, so it is read from the pool's
  `fee()`, which never changes.
- **v1 pools are followed by position.** Ponder reads a child contract's address at
  one fixed place in an event and cannot read an array. A pool's place in the event
  data depends only on how many pairs the launch has, so the config registers one
  contract entry for each of the nine places a pool can take in a launch of up to
  five pairs (`indexer/src/factories.ts`). A place that holds no pool for a given
  launch holds another word of the event (a length, a position id, part of the
  name), which is not a pool and emits no swaps. The handler still records every
  pool the event names, and logs `launch_pools_not_followed` if a launch ever has
  more than five.
- **Each token records the factory that launched it** (`token.factory`). The origin
  check in step 11 needs it, and it keeps the table free of the assumption that
  there is one factory.
- **`GET /coverage` reports what the index covers:** for each factory, whether it is
  indexed, from which block, and whether that is its deployment block. `complete`
  is true only when every factory is indexed from deployment. Anything presenting
  history must state its period from this.
- **Launch handling is one code path for all factories** (`recordToken`,
  `recordPool` in `indexer/src/index.ts`); only the event that feeds it differs.

## Checked against the chain

With the indexer started at block 125,035,000 on the development RPC:

- The multi-pair v1 launch in transaction `0x802ce0ca…37de96` was indexed with its
  factory and both pools (BREW and WBNB).
- The multi-pair v2 launch that starts in `0xa0456f84…c07f` was indexed with its
  three pools (WBNB, MSFTB and Cake), added over three transactions.
- For both tokens, the indexed trades are exactly the `Swap` logs the pools emitted
  over the same blocks (5 of 5 and 41 of 41, compared by transaction and log index),
  and no swap was left pending.
- The `/safety` scan found no owner, mint, blacklist or tax-setting functions in
  either token, and the sell simulation sold with a 1.98% round-trip loss.

## Known limits

- **The backfill has not been run.** The configured development RPC (48 Club's
  public endpoint) serves logs about 1.15 million blocks back, roughly six days,
  in ranges of at most 5,000 blocks. The standard factory's deployment is about
  5.16 million blocks back. A keyed RPC that serves old logs is still needed.
- **The backfill will not work as configured, even with that RPC.** Once a factory
  has 1,000 child contracts, Ponder stops filtering `eth_getLogs` by address and
  asks for every log with that event signature. The standard factory has about
  2,900 tokens and as many pools. At the rates sampled above, the backfill would
  download about 1.4 billion `Transfer` logs and 110 million `Swap` logs to keep a
  small fraction. The threshold is fixed inside Ponder 0.17. See "Still open".
- **`/coverage` says where indexing starts, not how far the sync has got.** During
  a backfill the data is partial even where coverage says complete. Ponder's own
  `/ready` and `/status` routes answer that, and a caller needs both.
- **`complete` is false while the dividend factory is not indexed,** whatever the
  start block. If the decision is never to show those tokens, the definition of
  complete needs to change with it.
- **The app prices and trades a multi-pair token through one pool only.** The token
  page and the buy panel take the first pool the indexer returns (0006, 0008), in
  no defined order. The sell simulation prefers the WBNB pool.
- **The contract check is no longer the same for every indexed token.** Multi-pair
  tokens use a different template. One v1 and one v2 token were scanned and came
  back clean; that is two tokens, not a review of the template.
- **Multi-pair launches bring bStock pairs into the feed and token page.** The v2
  launch above has a pool against MSFTB. Whether Taproom shows bStock-paired tokens
  is an open question in CLAUDE.md, and nothing filters them today.
- **v1 launches with pair counts other than two are untested against the chain.**
  None was found. The positions for one to five pairs are checked against viem's
  ABI encoder instead.
- **A v2 launch that started before `START_BLOCK`** gets pool rows and trades but
  no token row, so it stays invisible to the routes that start from a token. This
  cannot happen when indexing from deployment.
- **Brew's older multi-pair v2 deployment** (one launch, 0004) is not indexed. Its
  address is not in `addresses.ts`.
- **Changing the registered contracts or the schema makes Ponder re-index** from
  `START_BLOCK`.

## Still open

- **A keyed BSC RPC that serves old logs,** set as `BSC_RPC_URL`, and Postgres
  (`DATABASE_URL`) for anything beyond a development run.
- **How to keep log requests filtered by address during the backfill.** The
  candidate is to split each factory's child discovery into block ranges that each
  hold fewer than 1,000 launches, using the `startBlock` and `endBlock` that
  Ponder's `factory()` accepts. It needs testing against the real provider: Ponder
  may merge the ranges back into one request with more addresses than the provider
  accepts, and the newest range has to be split again as launches accumulate.
- **Whether the dividend factory is indexed** (CLAUDE.md, Open questions).
- **Brew's liquidity lockers.** Brew's bundle names one locker per factory. They
  have not been checked on-chain and are not in `addresses.ts`.
- **Which pool the app uses for a multi-pair token:** price, market cap, liquidity
  and the buy route.

## Sources

- https://brew.family/assets/index-B4iKBQfu.js (factory ABIs and the multi-pair v2
  deployment block)
- Creation transactions, linked from `shared/src/addresses.ts`
- `node_modules/ponder/src/runtime/filter.ts` and `internal/options.ts` (the
  1,000-address threshold)

## Since then

- 2026-10-02: `/coverage` also gives the time of each start block (`fromTime`), for
  the trader record's note (0013).
- 2026-10-02: editing indexer files while `ponder dev` runs on PGlite stopped the
  indexer twice mid-sync ("PGlite is closed", then shutdown). Restarting resumes
  from Ponder's cache. Stop the dev indexer before larger edits.
- 2026-10-02: the backfill blockers are resolved in 0016: a keyed NodeReal RPC, and
  patches to Ponder that keep log requests filtered by address. The shard approach
  under "Still open" does not work; 0016 explains why.
