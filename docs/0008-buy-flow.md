# 0008: Buy flow

Date: 2026-10-02. Status: accepted; built, not yet run with a real wallet.

## Context

MVP step 5: buy a Brew token from the embedded wallet (0007), inside the app, with
slippage control and the safety status shown before the user confirms.

## Decisions

- **Router: PancakeSwap's V3 SwapRouter,** not the Smart Router that Brew's own site
  uses. The SwapRouter's source is published, and its swap call carries a deadline.
  It was checked on-chain: `factory()` and `WETH9()` return the recorded factory and
  WBNB, a simulated buy returned exactly the quoter's amount, a minimum above the
  quote reverts with "Too little received", and a past deadline reverts with
  "Transaction too old".
- **Quotes come from PancakeSwap's QuoterV2 by `eth_call`,** refreshed every ten
  seconds while the panel is open.
- **First version: BNB in, BNB-paired tokens only.** BNB is sent as the transaction
  value with WBNB named as the input token, so no token approval is needed. A token
  brewed with BREW or another token shows a plain "not available yet" message.
  Selling is not part of this step.
- **Two steps, one sending button.** The panel takes an amount and a slippage
  choice; "Review buy" then shows token, amount paid, expected and minimum
  received, slippage and the safety status. Only "Confirm" on that review sends
  anything.
- **Slippage defaults to 0.5%** and changes only when the user taps another option
  (0.5, 1, 3, 5 or 10%). Above 5% a warning is shown in the panel and on the
  review. Nothing raises it automatically, and 50% is the hard ceiling.
- **A swap with no minimum is refused in code,** since it would accept any price.
- **Swaps expire after five minutes.**
- **Price impact is shown, pool fee included,** with a plain warning from 5%. Many
  Brew pools hold well under one BNB, so a small buy can move the price a lot.
- **The swap is simulated before it is sent,** so one that would revert fails with
  a reason instead of costing gas.
- **Safety status is the real scoring function with no inputs yet.** Every input is
  Unknown, which scores as Caution, never Safe, and the five Unknown reasons are
  listed. Step 6 fills them in.

## Known limits

- No purchase has been made: that needs a signed-in embedded wallet holding BNB.
  Quoting, the maths and the router call were checked by tests and simulation.
- Funding the wallet is the user's job for now (send BNB to its address); Apple Pay
  or card funding is not in v1 (CLAUDE.md).
- The balance check does not reserve BNB for the network fee.
- Quotes and swaps are not reported to an error service; Sentry is still not
  installed.

## Since then

- 2026-10-02: 0009 filled in the five safety inputs. The review step now shows a
  real score, and Confirm stays disabled until it has loaded.
- 2026-10-02: 0011 lists selling in the app, and Sentry, as requirements before the
  first release build. Neither is built.
