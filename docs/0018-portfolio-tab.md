# 0018: Portfolio tab

Date: 2026-10-02. Status: accepted; built, not yet viewed on a device.

## Context

A release requirement (CLAUDE.md, "Before the first release build"): the user's
own holdings. The tab was a placeholder, and its copy still said "Connect a
wallet", left over from 0002.

## Decisions

- **The indexer says which tokens the wallet holds; the chain says how much.**
  - The tab asks the indexer for the wallet's non-zero balances (the `holder`
    table, 0006).
  - It then reads each token's balance and its pool's price live, in one
    multicall.
  - So the figures are current even while the indexer is behind. A token sold
    since it was indexed is dropped.
- **No indexer change.** It uses existing GraphQL filters (`holder`,
  `address_in`, `token_in`), so the running backfill (0016) was not restarted.
- **Values are at the pool's current price, in the pair asset,** like the token
  page (0006).
  - Totals are kept per pair asset and never added together.
  - The tab says that selling returns less, after the pool fee and the price
    moving.
- **A holding is valued in its WBNB pool when it has one,** since that is the
  pool it can be sold through (0017). Otherwise it uses its first pool.
- **A failed read shows as unknown, never zero,** and is left out of the totals,
  with a count of what was left out.
- **Each holding opens its token page,** where the Sell panel is. The tab also
  shows the wallet's BNB and links to the wallet's own trader record (0013).
- **At most 200 tokens are listed,** the largest balances first, with a note when
  there are more. One real wallet already holds over 200.
- **The maths is pure and unit-tested**
  (`app/src/features/portfolio/portfolio.ts`), with RSUN's real pool price as the
  fixture.

## Known limits

- **Only Brew tokens Tapped indexes are listed:** the standard and multi-pair
  factories. Other tokens in the wallet are not shown, and the tab says so.
- **No cost basis or gain on the tab.** What the wallet paid is on its trader
  record, one tap away.
- **A token bought after the indexer's latest block** appears once it is indexed.
- **Not viewed on a device.** The two queries were run against the live indexer
  for a real wallet.
