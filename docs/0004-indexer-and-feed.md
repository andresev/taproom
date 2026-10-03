# 0004: Indexing Brew launches and trades, and the feed

Date: 2026-10-01. Status: accepted.

## Context

MVP step 3 is the live feed: buys, sells and launches by followed wallets. CLAUDE.md
assumed one Brew launch factory with an unknown address. Brew's own site bundle
lists five factories, with their ABIs.

## What Brew actually has

Launch counts read from each contract on 2026-10-01:

| Factory | Launches | Launch event |
|---|---|---|
| Standard | 2,866 | `TokenLaunched` |
| Multi-pair v1 | 150 | `TokenLaunchedMultiPair` |
| Dividend | 146 | `DividendTokenLaunched` |
| Multi-pair v2 | 62 | `LaunchStarted`, `PoolAdded`, `LaunchCompleted` |
| Multi-pair v2 (older deployment) | 1 | same as v2 |

A Brew token can be brewed with another Brew token, so one token can be the
launched token of one pool and the pair token of another.

## Decisions

- **Addresses moved to `shared/src/addresses.ts`** so the app and the indexer read
  the same ones. `app/src/lib/chain/addresses.ts` re-exports them. Each entry says
  where it came from.
- **Only the standard factory is indexed for now** (about 89% of launches). The
  others are recorded in the address book but not registered with the indexer.
- **Pools are their own table.** A token no longer has a single `pool` and
  `pairToken`, so multi-pair launches fit without another schema change.
- **Pools are discovered from the launch event** (Ponder's factory pattern on
  `TokenLaunched.pool`), never from a list.
- **The trader is the transaction sender.** A pool's `Swap` event names a sender and
  recipient, but those are usually a router. Trades made through a smart-contract
  wallet or a relayer are therefore attributed to whoever sent the transaction.
- **A swap is a trade of the pool's launched token.** In a pool that pairs two Brew
  tokens, a swap is recorded once, for the token that pool was launched for.
- **A launch's initial buy is held in `pending_swap` until the launch event.** The
  buy is emitted earlier in the same transaction than `TokenLaunched`, so the pool
  is unknown when the swap arrives. The launch handler converts it into a trade.
- **PancakeSwap V3's `Swap` event is not Uniswap V3's.** It carries two extra
  protocol-fee fields; the indexer uses PancakeSwap's signature.
- **The start block is an env var, `START_BLOCK`.** Unset, the indexer starts at the
  chain head.
- **The feed is one row per token, not one per trade,** with a bar showing the
  split between buying and selling. The split is by amount paid or received when
  every trade used the same pair asset, and by number of trades otherwise, because
  amounts in different pair assets cannot be added without prices.
- **Totals come from the indexer's own `POST /activity` route,** computed in SQL.
  Adding trades up in the app was dropped: a busy day already exceeded what one
  request returned, which made the counts wrong.
- **The feed polls that route every 10 seconds.** Signed out, or following nobody,
  it shows activity from every wallet instead of an empty screen.
- **The feed opens on Trending,** defined as most distinct wallets trading in the
  window, then most trades, then most recent. Wallets rather than volume, because
  volume is not comparable across pair assets and one wallet can make any number
  of trades. The other settings are Latest and New launches, a window of 1h, 6h,
  24h, 7d or 30d, and "more buying than selling". Settings are not persisted.
- **Token decimals and symbols are read at the latest block,** not the launch
  block. They never change, and reading old state needs an archive node.

## Known limits

- **No history yet.** The standard factory's deployment block is not confirmed, and
  free public RPC endpoints do not serve old logs. Until a keyed RPC is configured
  and `START_BLOCK` is set, only launches after the indexer starts, and trades in
  those tokens' pools, are indexed. Trades in tokens launched earlier are missed.
- Tokens from the dividend and multi-pair factories do not appear at all.
- The feed shows the top 200 tokens for the chosen sort; there is no paging.
- A window longer than the indexed history shows only what is indexed.
- Trending counts wallets, so it can be inflated by one person using many wallets.
- The indexer logs each launch as a JSON line; there is no error reporting service.

## Still open

- The standard factory's deployment block.
- Whether Taproom shows tokens from Brew's dividend factory, given the "no dividends
  to token holders" rule in CLAUDE.md is about Taproom's own offering.
- Which PancakeSwap router the swap flow uses (step 5).

## Since then

- 2026-10-02: holder balances from `Transfer` events and the pool price on each
  trade were added (0006), then the `/safety` route (0009).
- 2026-10-02: the router question was settled in 0008: PancakeSwap's V3 SwapRouter.
- 2026-10-02: 0011 makes history and factory coverage the next work (MVP step 8),
  ahead of new app features. The standard factory's deployment block is still
  unconfirmed, and the dividend-factory question is still open.
- 2026-10-02: 0012 confirmed the standard factory's deployment block (120,201,671)
  and added the multi-pair v1 and v2 factories to the indexer. The backfill itself
  has not been run, so "No history yet" above still holds.
