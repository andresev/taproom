# 0017: Sell flow

Date: 2026-10-02. Status: accepted; built and checked by simulation against
mainnet state, not yet run with a real wallet.

## Context

A release requirement (CLAUDE.md, "Before the first release build"): a user who
bought in the app must be able to sell in the app, through the same review as a
buy. 0008 left selling out.

## Decisions

- **Sell for BNB, tokens brewed with BNB only,** like the buy. Other pairs show a
  plain "not available yet".
- **One transaction does the swap and the unwrap.** The router's `multicall`
  carries two calls: `exactInputSingle` (token in, WBNB out, recipient the zero
  address, so the router keeps the WBNB) and `unwrapWETH9`, which pays the seller
  BNB. Both carry the same minimum. The seller ends with BNB, not WBNB, matching
  what the buy spends and the balance the app shows.
- **Checked before use:** the three functions' selectors are in the deployed
  SwapRouter's code. A full buy, approve and sell, simulated on mainnet state for
  RSUN:
  - returned 0.000980 BNB for 0.001 BNB spent: two 1% pool fees;
  - left no token and no WBNB behind, in the wallet or the router;
  - reverted with "Too little received" when the minimum was above what the pool
    would pay.
- **Approval is its own step, with its own button.** A token must allow the router
  to move it before the first sell. The review shows "Step 1 of 2: allow
  PancakeSwap's router to move N TOKEN… This sells nothing yet." Only after the
  approval is mined does the confirm button appear. Each transaction is confirmed
  on its own, per CLAUDE.md.
- **The approval is for the sell amount, never unlimited,** so a router bug or
  compromise can only ever reach what the user chose to sell.
- **Same protections as a buy** (0008):
  - minimum received from the user's slippage choice, with a warning above 5%;
  - a five-minute deadline, and no swap built with a zero minimum;
  - price impact shown, pool fee included, with a warning from 5%;
  - simulated before sending;
  - the safety badge on the review, with confirm disabled until it has loaded.
- **The slippage setting is shared with the buy panel.** It changes only when the
  user taps it.
- **The panel shows only while the wallet holds the token.** Amounts can be typed
  or chosen as 25%, 50% or All. All is the exact balance, so nothing is left
  behind.
- **A wallet with no BNB is warned before it tries,** since a sell needs BNB for
  the network fee.
- **Shared with the buy:**
  - signing through the embedded wallet (`features/trade/embedded-wallet.ts`);
  - the review row;
  - the safety lookup (`use-trade-safety.ts`).

## Known limits

- **No sale has been sent.** That needs a signed-in wallet holding a token and a
  little BNB.
- **Only the token's first pool is used,** as for the buy (0012, open question).
- **A partly sold position keeps any approval left over** from a larger earlier
  approval. That is the user's own allowance to the router, and is visible on
  BscScan.
- **Quotes and swaps are not reported to an error service;** Sentry is not
  installed.
