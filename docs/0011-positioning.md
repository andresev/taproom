# 0011: Positioning: provable records and Brew-specific risk reading

Date: 2026-10-02. Status: accepted; written at the owner's request, wording not yet
reviewed line by line.

## Context

MVP steps 1 to 7 each have a first version (0002 to 0010). The research note written
the same day (`research-2026-10-competitive-landscape.md`) found that the core loop,
as specified, is Fomo's core loop restricted to one launchpad, and proposed eight
changes to CLAUDE.md. Nothing was decided then, and buy, safety checks and receipts
were built afterwards to the earlier specification.

The owner then asked whether the repo is unique. The answer was no, on the evidence
below, with a recommendation to compete on proof instead of execution. The owner
asked for CLAUDE.md and the rest of the documentation to hold that direction.

## What was checked on 2026-10-02

- **Larger apps on BNB Chain.** DefiLlama's fee table for the chain, last 24 hours:
  Flap $1.62M (first), GMGN $380k (fourth), Fomo $73k (tenth), Four.meme $26k,
  Axiom $23k. Brew is not among the 337 protocols listed. Fomo is reported to have
  2.7 million users and $250M to $300M of daily spot volume across its chains.
- **Brew's own site.** Its code has launching, trading, token pages, a creator's own
  tokens, fees, analytics and docs. It has no profiles, follow graph, feed,
  leaderboard or mobile app. "Follow trades" in its page description refers to a
  token's trade list. The site ships Chinese and Japanese translations.
- **Brew's size.** Brew's published analytics snapshot is dated 2026-09-17 and marked
  partial by Brew. It shows about $71M of volume on 2026-09-06, about $2M a day by
  2026-09-17, and 2,042 launches by 840 creators. The counts in 0004 give 3,225
  launches on 2026-10-01, about 85 a day since the snapshot. No current volume figure
  was found.
- **The code against the research note's proposals.** None was built. The wallet
  screen is a placeholder, a receipt is an image carrying its BscScan URL as text,
  the safety inputs are the generic five, and the indexer has no history from before
  the moment it starts.

## Decisions

- **Taproom does not compete on execution:** speed, funding options, chain coverage
  or trading-terminal features. Those are built only as far as a user needs in order
  to act on what they see.
- **Taproom must be best at two things.** Provable records: receipts and trader
  records computed only from indexed chain data, losses included, that anyone can
  check. Brew-specific risk reading: a deployer's record across Brew launches, who
  held the supply in the first blocks, and what the pair asset adds to the risk.
- **The order of work changes.** Step 8 is indexer history and coverage, step 9
  trader records, step 10 checkable receipts, step 11 Brew-specific safety inputs.
  History comes first because a record computed from partial history is not verified.
- **A trader record moves into v1.** Leaderboard seasons stay v2.
- **A receipt needs a public link** that re-renders it from indexed data, with a QR
  code on the card, because a shared image can be edited.
- **The safety inputs are reworked for Brew.** Every token the indexer covers shares
  the standard template, so the contract check passes for all of them and the sell
  simulation is expected to. That leaves three inputs to tell tokens apart. The new
  inputs are the deployer record, launch-time holders, pair-asset risk, and origin:
  whether the token came from a Brew factory and matches its template.
- **Release requirements are listed apart from that order:** key export (already a
  hard rule, not built), selling in the app, the portfolio tab, error reporting, a
  real bundle identifier, and the store checks.
- **All eight proposals in the research note are adopted in CLAUDE.md,** with one
  change. Where the note says a token that does not match the Brew template is
  "Danger or Unknown", CLAUDE.md says it is never Safe and leaves the exact status to
  the scoring rules.
- **Every feature names the goal it serves:** provable records, Brew-specific risk
  reading, or a release requirement. Anything else is flagged before it is built.
- **The data model stays free of Brew-only assumptions,** so a second launchpad
  could be added without a rewrite. Adding one is not v1 work.
- **Docs are kept true as part of each change.** An accepted record is not rewritten;
  a dated line goes under "Since then". This pass added those sections to 0001 to
  0010 and the research note, marked 0002 as superseded, corrected four statements
  in 0007 that contradicted the rest of that record and one item in the research
  note that was wrong when written, brought both READMEs up to date, and fixed two
  stale comments, in `app/.env.example` and `supabase/config.toml`.

## Drafted in this pass, beyond what was discussed

The owner had seen the two goals, the order of steps 8 to 11, and the missing sell,
key export and withdrawal. These were added while writing and stand unless changed:

- Selling and the portfolio tab are listed as requirements before the first release
  build. Selling was not in the MVP scope before.
- The rule that every feature names the goal it serves.
- The rule that thresholds are described as judgement until calibrated.

## Still open

- Whether Taproom shows or trades bStock-paired tokens and dividend-factory tokens.
- How users find wallets to follow. Discover is search only, and a ranked list is
  close to the leaderboard that is v2.
- Where the receipt verification page is hosted, and on what domain.
- Whether Chinese moves into v1.
- Whether Taproom stays Brew-only.
- The definitions and thresholds for the new safety inputs, and for the "result" of
  a position in a trader record. Each gets its own record when it is built.
- A current figure for Brew's daily volume.

## Sources

- https://api.llama.fi/overview/fees/BSC (DefiLlama fees by protocol, BNB Chain)
- https://brew.family/ and its site bundle `assets/index-B4iKBQfu.js`
- https://brew.family/analytics-snapshot.json
- https://en.bloomingbit.io/feed/news/121378 (Fomo users and volume)
- https://www.upshift.finance/blog/what-is-the-fomo-app (Fomo on BNB Chain)
- https://developer.apple.com/app-store/review/guidelines/ (guideline 3.1.5)

## Since then

- 2026-10-02: step 8 is partly built (0012). The deployment blocks are confirmed and
  the multi-pair factories are indexed; the backfill from deployment has not been run.
