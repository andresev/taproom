# 0016: Backfill through a keyed RPC, and two patches to Ponder

Date: 2026-10-02. Status: accepted; the owner approved the patches and the
`patch-package` dependency the same day. Test backfill passed; full backfill
results are under "Since then".

## Context

0012 left the backfill blocked twice. Free public RPCs do not serve old logs. And
once a factory has 1,000 child contracts, Ponder stops filtering `eth_getLogs` by
address and asks for every log with the event's signature, about 1.4 billion
`Transfer` logs on BSC for Brew's history. It serves both positioning goals:
trader records and deployer records are only as good as the history behind them.

## The RPC: NodeReal MegaNode, free plan

Chosen over QuickNode, whose free trial limits `eth_getLogs` to 5 blocks. The key
is in `indexer/.env.local` (git-ignored) as `BSC_RPC_URL`. What it does, tested on
2026-10-02:

- Serves logs from the standard factory's first block (120,201,671; its creation
  event is there, a third confirmation of the deployment block).
- At most 50,000 blocks per `eth_getLogs` ("exceed maximum block range: 50000").
- At most 1,000 addresses per `eth_getLogs` ("exceed max addresses or topics per
  search position"); 1,000 works, 1,001 does not.
- More than 50,000 results is an error ("logs count exceeds the limit 50000"),
  not a silent cut, so a busy range cannot lose logs unnoticed.
- Free plan: 100M compute units a month. `eth_getLogs` costs 50,
  `eth_getBlockByNumber` 15, `eth_call` 20.

## Why config alone could not fix it

0012 proposed splitting each factory's child discovery into block ranges of fewer
than 1,000 launches. That does not work: Ponder merges requests whose block ranges
overlap and whose only difference is the address list. The shards would be merged
back into one request of more than 1,000 addresses, which NodeReal refuses.
Ponder only shrinks block ranges on error; it never splits an address list. Ponder
0.17.12 is the latest release.

## Decisions

- **Ponder is patched with `patch-package`** (new root dev dependency, run on
  `postinstall`). The patches are in `patches/`, each change marked "Taproom patch
  (docs/0016)":
  1. `ponder` `internal/options.js`: the threshold above which factory children
     are no longer listed goes from 1,000 to 100,000, so requests stay filtered by
     address.
  2. `ponder` `sync-historical/index.js`: an address list over 1,000 is split into
     requests of at most 1,000 over the same blocks.
  3. `@ponder/utils` (`getLogsRetryHelper`): NodeReal's "logs count exceeds the
     limit" is retried with a smaller range, and its "exceed maximum block range:
     50000" is retried in ranges of exactly 50,000 blocks. Ponder's generic rule
     allowed one block too many and then gave up.
- **Following new blocks is not affected.** Ponder reads each new block's logs
  whole, by block hash, with no address filter.
- **The rule from 0004 stands:** pools and tokens are still discovered from launch
  events. Writing historical addresses into the config was the alternative and was
  not taken.
- **`START_BLOCK` is now 120201671** in development, the full history.

## Test backfill: 2026-09-20 to 2026-10-02

From block 123,000,000, about 2.4 million blocks:

- **Time:** 7 minutes 11 seconds, no errors. 14 log requests hit a provider limit
  and were retried.
- **Calls:** 57,185 block reads, 10,574 log requests and 1,297 contract calls,
  about 1.4M compute units.
- **Launches:** every one in the range was indexed: 928 standard, 30 multi-pair v1
  and 32 multi-pair v2, equal to each factory's `totalLaunches()` difference over
  the range.
- **Trades:** for 8 sampled tokens and the 3 busiest (10,227, 8,254 and 8,167
  trades), the indexed trades are exactly the pools' `Swap` logs on chain,
  compared by transaction and log index.
- **Address splitting was exercised:** 1,114 pools were followed.

## Cost of following new blocks

Measured at the chain head: one block read and one log request per block, about
267 blocks every two minutes. That is **about 12.5M compute units a day, 375M a
month**. The free plan covers about eight days of continuous running. The Growth
plan ($39 a month, 500M) covers a month. Production needs a decision on that, or on
another provider.

## Known limits

- **The patches must be checked on every Ponder upgrade.** `patch-package` fails
  the install if a patch no longer applies, so a mismatch cannot pass silently.
- **The address limit is hard-coded at 1,000,** NodeReal's. A provider with a lower
  limit would need the number changed.
- **The development indexer re-syncs** when its config or schema changes. Ponder
  caches fetched RPC data, so a re-sync costs few new compute units.

## Still open

- The production RPC plan, given the cost of following new blocks.
- Postgres for anything beyond development (`DATABASE_URL`).

## Sources

- https://docs.nodereal.io/docs/pricing-plan
- https://docs.nodereal.io/docs/compute-units-cus
- https://docs.nodereal.io/reference/eth-getlogs-bnb-chain
- https://www.quicknode.com/docs/bnb-smart-chain/eth_getLogs
