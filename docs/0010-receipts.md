# 0010: Receipt cards

Date: 2026-10-02. Status: accepted.

## Context

MVP step 7: a shareable image proving an on-chain entry, with the token, entry
transaction, timestamp, market cap at entry, current market cap and the multiple.
CLAUDE.md requires that it is generated only from indexed on-chain data and that
users can never enter or edit its numbers.

## Decisions

- **A receipt is one indexed buy.** It is addressed by the indexer's trade id
  (`<transaction hash>-<log index>`) at `/receipt/[id]`. A sell is refused: a
  receipt proves an entry.
- **Every number is derived, none is entered.** Amounts, wallet and time come from
  the indexed trade. Market cap at entry is the pool price recorded on that trade
  (0006) times the token's total supply. Market cap now is read live from the pool.
  The card component takes a finished receipt and has no inputs or state.
- **The multiple is market cap now divided by market cap at entry,** truncated,
  never rounded up, and shown as it is when below one.
- **Market caps are in the pair asset,** like the token page (0006), so the
  multiple is a ratio in that asset, not in USD.
- **Anyone can open a receipt for any indexed buy.** It is public on-chain data.
  The card shows the wallet that sent the buy, so it only proves that wallet's entry.
- **The card has its own fixed colours** rather than the device theme, so the
  shared image looks the same from any phone.
- **It carries the BscScan transaction URL as text,** plus a tappable link on the
  screen, and the line "Not affiliated with Brew".
- **New dependencies:** `react-native-view-shot` to capture the card as an image
  and `expo-sharing` for the share sheet, the two CLAUDE.md names for this.

## Known limits

- Only buys the indexer has seen can have a receipt: standard-factory tokens,
  within the indexed history.
- "Market cap at entry" is the price just after the buy, including that buy's own
  price impact.
- Both market caps use total supply; burned tokens are not subtracted.
- If the live pool read fails, the card shows "Unknown" for the current market cap
  and no multiple.
- Receipts are reached from a buy's "Receipt" link in a token's recent trades.
  There is no list of a user's own receipts yet.

## Since then

- 2026-10-02: 0011 requires a public link, with a QR code on the card, that
  re-renders the receipt from indexed data, because a shared image can be edited.
  It also asks for the list of a user's own receipts. Neither is built (MVP step 10).
