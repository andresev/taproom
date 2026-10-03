# 0015: Public receipt page and QR code

Date: 2026-10-02. Status: accepted; built and checked against live indexed data.
The production domain is not chosen yet, so no card carries a public link outside
development.

## Context

MVP step 10 (0011). A receipt card is an image, and an image can be edited. A
person looking at a shared card needs a way to check it against the chain without
trusting whoever sent it. CLAUDE.md asked for a public link and a QR code on the
card that re-render the receipt from indexed data. It serves the first positioning
goal, provable records.

## Decisions

- **The page is served by the indexer, at `GET /r/:id`**, where `id` is the trade
  id (`<transaction hash>-<log index>`), the same id the app's receipt screen uses.
  The owner chose this on 2026-10-02 over a separate web app or a Supabase
  function. The reasons:
  - the indexer must be public for the app anyway;
  - it holds the indexed trade and has the server-side RPC for the current market
    cap;
  - it adds no service.
- **The page is plain server-rendered HTML,** so link previews in X or Telegram
  show the receipt's title and summary. It loads no scripts.
- **The app and the page compute the receipt with the same code.**
  - `buildReceipt` moved from the app into `@repo/shared` (`shared/src/receipt.ts`).
  - The number formatting (`shared/src/format.ts`) and the BscScan links
    (`shared/src/explorer.ts`) moved with it.
  - The app's old modules re-export from shared, so its imports did not change.
- **The page says what a receipt proves and what it does not:** the wallet bought
  this token in this transaction, at that time and price. It does not show
  whether the wallet still holds the token or made a profit. The page also gives
  the full wallet and token addresses, the BscScan link, when the current market
  cap was read, and "Not affiliated with Brew."
- **Everything on the page is HTML-escaped.** Token names and symbols are chosen by
  deployers. A malformed id never reaches a query.
- **Cached for 60 seconds** (`Cache-Control: public, max-age=60`). The entry never
  changes; only the current market cap does.
- **The card prints the link and a QR code for it** (`react-native-qrcode-svg`,
  approved by the owner). The QR code is black on white with a quiet zone, the
  one form every scanner reads, inside the card's own fixed colours.
- **The link's base is `EXPO_PUBLIC_RECEIPT_PAGE_URL`.** Unset, cards carry no link
  and no QR code, rather than one that leads nowhere. In development it is the
  local indexer, `http://localhost:42069`, which a phone other than the simulator
  cannot reach.

## Found while building

- **`formatMultiple` rounded where 0010 says multiples are truncated.** It used
  `toFixed`, so a 0.2499 multiple printed "0.25x". It now truncates by digits, not
  by floating-point maths, which would turn 0.29 into 0.28. Cards and trader
  records showed the rounded figure until this change.

## Checked against live data

On the development indexer, the page for a real RSUN buy rendered with its figures
and cache header. A sell, a malformed id and an unindexed trade each returned 404
with the reason.

## Known limits

- **No production domain yet.** The owner is getting one. The domain then points
  at the deployed indexer, and `EXPO_PUBLIC_RECEIPT_PAGE_URL` is set to it in
  release builds.
- **No preview image.** Link previews show text only. An image would need
  server-side rendering of the card.
- **The page is only as available as the indexer.** If it is down, the link fails
  and the image cannot be checked.
- **Market caps are in the pair asset** and count the whole supply, as on the card
  (0010).

## Still open

- The production domain and where the indexer is deployed (CLAUDE.md, Open
  questions).
- Whether the page also offers to open the receipt in the app (universal links),
  once the app has a real bundle identifier.
