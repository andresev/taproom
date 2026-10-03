# 0014: Brew-specific safety inputs

Date: 2026-10-02. Status: accepted; definitions signed off by the owner the same
day, with the two additions noted under "Beyond what was signed off". Built and
checked against live indexed data. Not yet viewed on a device.

## Context

MVP step 11 (0011). Tokens from one Brew factory share a contract template, so the
generic checks in 0009 pass for nearly all of them and do not tell one from
another. This adds the inputs that do: where the token came from, what it is
brewed with, its deployer's earlier launches, and who bought at launch. It serves
the second positioning goal, Brew-specific risk reading.

## What was checked on 2026-10-02

- **Templates.** A token's code is not byte-identical to others from its factory.
  It carries its deployer's address at one fixed offset, and nothing else differs.
  With those 20 bytes set to zero, every token checked hashes the same:
  - standard factory: 40 tokens from 40 deployers;
  - multi-pair v1: 10 tokens;
  - multi-pair v2: 2 tokens, all that were in the indexed range.

  Each factory's template hash, code size and offset are in
  `indexer/src/factories.ts`.
- **Pair assets.** Brew's site bundle lists the assets its launch form offers, in
  four groups:
  - "Majors": WBNB, USDT, USDC, CAKE, BTCB, ETH;
  - "Protocol": $BREW;
  - "Tokenized stocks": 16 of them;
  - "Gold": XAUT.

  All 24 addresses have code and return the listed symbol. They are in
  `shared/src/pair-assets.ts`.
- **Launch buying.** Across the 69 tokens indexed since 2026-10-01, the share of
  supply bought in the launch block and the next two ran up to 21%. Most of that
  is the deployer's own buy in the launch transaction (RSUN: 11.2%).

## Decisions

The indexer gathers facts (`POST /safety`); the app's pure rules turn them into
checks (`app/src/features/safety/rules.ts`), as in 0009. A score now has nine
inputs and is Safe only when all nine are known and pass.

| Check | Pass | Warn | Fail |
|---|---|---|---|
| Origin | from a known Brew factory, code is that factory's template | code differs from the template | not from a known Brew factory |
| Pair asset | every pool brewed with one of Brew's "Majors" or "Gold" | any pool brewed with $BREW, another Brew token, a tokenized stock or an unlisted token | — |
| Deployer record | no earlier launch went badly | 1 or 2 went badly | 3 or more went badly |
| Buying at launch | under 10% of supply | 10% to 30% | 30% or more |

- **Origin.** Template mismatch is a warning, not a failure: it could mean Brew
  changed its template, which the factory itself would have deployed. Either way
  the token is never Safe, as CLAUDE.md requires. A factory with no recorded
  template (dividend) is Unknown.
- **Deployer record.** Covers launches by the same deployer before this one, the
  newest 50 examined. An earlier launch "went badly" when either:
  - the price at its last indexed trade is 10% or less of the price after its
    first trade, in the pool of that first trade; or
  - the deployer sold half or more of what they had bought within an hour of
    launch.

  The reason states the period, taken from the indexer's coverage (0012).
- **Buying at launch.** Every buy, the deployer's included, in the block where the
  token's first pool was created and the two after it, as a share of total
  supply. That is the launch block, except for a multi-pair v2 launch whose first
  pool came later. BSC blocks are under half a second apart, so this is roughly
  the first 1.5 seconds of trading. The reason says that wallets funded from one
  source are not detected.
- **The dev-wallet reason no longer counts other launches.** The deployer record
  replaces that clause.
- **The code is read once per token** for both the contract scan and the template
  match.

## Beyond what was signed off

The proposal said WBNB and USDT pass. Two things were added while building it, and
stand unless changed:

- **All of Brew's "Majors" pass:** USDC, CAKE, BTCB and ETH as well as WBNB and
  USDT. They are not memecoins, and Brew's own list sets them apart.
- **XAUT (tokenized gold) passes,** for the same reason.

## Known limits

- **Thresholds are judgement, not calibrated** against how tokens ended.
- **"Went badly" is generous to abandoned launches.** A token nobody traded after
  launch has the same first and last price, so it does not count as a fall. In the
  data so far, nearly every launch that counted did so through the deployer
  selling within an hour.
- **A deployer's quick sell counts whatever its size.** Selling a 0.0005 BNB test
  buy within the hour counts the same as selling a large one.
- **Deployer records are partial until the backfill runs** (0012), and say so.
- **Funding clusters, round-tripping wallets and bundled launch buys are not
  detected.** All need tracing where wallets were funded from.
- **The multi-pair v2 template rests on two tokens.** A third that differs would
  show as a warning, which is the honest outcome.
- **Not viewed on a device.** The badge shows nine reasons now. They typecheck and
  are unit-tested, but nobody has looked at the badge on a phone yet.

## Still open

- Calibrating the thresholds once complete history is indexed.
- Whether bStock-paired tokens are shown at all (CLAUDE.md). Here they only warn.
