# 0009: Safety checks

Date: 2026-10-02. Status: accepted.

## Context

MVP step 6: every token shows Safe, Caution or Danger with its reasons. The
aggregation (`scoreToken`) existed since the scaffold; the five inputs and their
thresholds did not.

## How it is split

- **The indexer gathers facts** (`POST /safety`): numbers and lists, no judgement.
  It runs server-side because the sell simulation and bytecode read use the
  indexer's RPC. Facts are cached per token for one minute. A fact that cannot be
  fetched is `null`.
- **The app applies the rules** (`app/src/features/safety/rules.ts`): pure
  functions from facts to a check with a factual sentence, unit-tested with real
  fixture data. `scoreToken` then aggregates: any Fail is Danger, any Warn or
  Unknown is Caution, Safe only when all five are known and pass.

## The checks and thresholds

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Dev wallet | deployer has not sold | sold under half of what they bought | sold half or more |
| Holder concentration (top 10, pools and burn address excluded) | under 10% of supply | 10% to 30% | 30% or more |
| Contract | none of the listed functions | owner functions present | mint, blacklist or tax-setting present |
| Sell simulation | sells, round-trip loss up to 5% | loss over 5% | sell reverts, or loss over 20% |
| Wash activity (from 10 trades) | otherwise | a wallet over 30% of trades, or over 5 trades per wallet | a wallet over 60% of trades |

These are starting values chosen by judgement, not calibrated against outcomes.

## How each fact is obtained

- **Dev wallet:** the deployer's buys and sells of the token through its pools, the
  time of their first sell, and how many other tokens they launched, all from
  indexed trades and launches.
- **Holder concentration:** from the indexed holder balances (0006).
- **Contract:** the token's runtime bytecode is scanned for the 4-byte selectors of
  ownership functions and of mint, blacklist, pause and fee-setting functions.
  Tokens from Brew's standard factory share one 1,991-byte template with none.
- **Sell simulation:** a 0.0001 BNB buy followed by selling everything received,
  inside one simulated block (`eth_simulateV1`), from a throwaway address given a
  simulated balance. Nothing is sent. Two 1% pool fees alone cost about 2%.
- **Wash activity:** total trades, distinct wallets, and the busiest wallet's trades.

## Not covered

- How a deployer's earlier launches ended; only their count is stated.
- Wallets round-tripping with each other, and clusters funded from one source.
  Both need funding-transaction tracing.
- Known exchange wallets are not excluded from holder concentration.
- The sell simulation runs only for tokens brewed with BNB. For others it is
  Unknown, so those tokens can be at best Caution.
- The bytecode scan is a heuristic: a proxy, or logic inside `transfer` itself,
  would not show up. The sell simulation is what catches a transfer that blocks
  or taxes sells.
- A third-party source such as GoPlus is not consulted.

## Where the badge appears

On the token page and in the buy review, where Confirm stays disabled until the
score has loaded. Not on feed rows: each score needs its own simulation.

## Since then

- 2026-10-02: 0011 sets the next inputs (MVP step 11): the deployer record,
  launch-time holders, pair-asset risk, and origin, meaning whether the token came
  from a Brew factory and matches its template. The reason is the template noted
  above: every token the indexer covers shares it, so the contract check passes for
  all of them and the sell simulation is expected to, which leaves three inputs to
  tell tokens apart.
