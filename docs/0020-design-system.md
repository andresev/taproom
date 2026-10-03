# 0020: Design system and the "On tap" feed

Date: 2026-10-03. Status: accepted; the owner chose this design from two mockup
sets. Built across the app; see "Since then".

## Context

The owner found the app boring: it ran on the Expo template's default styling.
This work serves neither positioning goal and is not a release requirement
(CLAUDE.md). It is a product-feel decision, made at the owner's request, from a
written brief and a set of mockups (49 artboards, dark and light).

## Decisions

- **The look takes Brew's palette and type in feel, with its own identity.**
  Warm, slightly olive neutrals, one brass accent, flat surfaces with hairline
  borders, no shadows, glows or gradients. Nothing of Brew's is used: no logo,
  mascot or wordmark. Taproom has its own mark, a tap handle over a spout.
- **Dark is the default; light follows the phone's setting.** Both themes are in
  `app/src/theme/index.ts`, with the names from the token sheet: `background`,
  `card`, `cardPressed`, `text`, `textSecondary`, `border`, `accent`, `onAccent`,
  `accentText`, `buy`, `sell`, `safe`, `caution`, `danger`, `unknown`.
- **Brass is kept for the primary action and the active tab.** A repeated action,
  such as each feed row's Buy, is outlined in brass text, not filled.
- **Fonts: Geist for text, Geist Mono for every number, address, hash and
  ticker.** Seven weights are in `app/assets/fonts` with their Open Font License,
  loaded with `expo-font`, which was already installed. No package was added.
- **Spacing is a 4pt grid; corners are 14 (cards, sheets), 10 (buttons, inputs)
  and full (chips, avatars).** Touch targets are at least 44pt.
- **Meaning never rests on colour alone.** Buy, sell and the four safety states
  each carry a word or an icon.
- **WBNB is shown as "BNB"** (`pairAssetLabel` in `shared/src/format.ts`): users
  pay and are paid in BNB.
- **The feed is "On tap", a tap list:** rows separated by hairlines, each with the
  token's artwork, name and ticker, its newest trade in mono type, what it is
  brewed with, a safety pill and a Buy button. A switch chooses Trending (every
  wallet) or Following. Sort, time window and the buying filter stay behind
  "Filters".
- **A feed row's safety pill opens the token page,** where the reasons are: a
  rating is never shown without its reasons or a one-tap way to them. While a
  rating loads, the row shows an empty outline, not "Unknown" and never "Safe".

## What the indexer gained for it

- **`GET /image/:token`** serves a token's artwork. Brew stores it in the launch
  metadata, usually as `onchain://56/<address>`: a contract whose code is one zero
  byte followed by the image file. Only WebP, PNG and JPEG are served, recognised
  by their first bytes, since the content comes from whoever launched the token.
  Each image is read from the chain once and cached.
- **`/activity` returns each token's newest trade** (`latest`): who, which way, how
  much, when. In the Following feed it is the newest trade by a followed wallet.
- **`/safety` returns holder concentration** (`holders.topTenShareBps`). The app
  used to compute it from the token page's holder list, which a feed row does not
  have. The rule and its thresholds (0009) are unchanged.

## Deviations from the brief

- **Light-theme secondary text is `#6A6E60`, not `#717567`,** which fell just under
  the 4.5:1 contrast the brief also requires.
- **Caution has its own colour** (`#EDB866` dark, `#8A5A0B` light), so it never
  reads as the brass accent.
- **The tab bar is the system's own (`NativeTabs`), tinted brass,** not the custom
  bar in the mockups. It keeps native behaviour on both platforms.

## Known limits

- **Feed rows each fetch a safety score.** A score needs a bytecode read and a sell
  simulation. Rows fetch once and keep it for five minutes, where the token page
  refreshes every minute. On a paid RPC this is a real cost.
- **Seen in mockups and a bundle build, not yet reviewed on the phone.**

## Since then

- 2026-10-03: the remaining screens are rebuilt to the design.
  - **Token page:** a compact header with the token's artwork, a large price,
    three stat tiles, the safety card, activity, launch facts and recent trades,
    with Buy and Sell fixed at the bottom.
  - **Safety card** (`features/safety/safety-card.tsx`): the rating, the worst
    finding and a count of the rest; one tap lists every reason with its own
    status. It replaces the earlier badge, on the token page and in the buy and
    sell review.
  - **Buy and sell are bottom sheets** (`components/bottom-sheet.tsx`,
    `features/trade/buy-sheet.tsx`, `sell-sheet.tsx`): amount and slippage, the
    review, then pending, done or failed. Slippage above 5% shows a heavy-bordered
    warning with the least the user could receive. A finished buy offers
    "View receipt": the buy now returns its receipt id, found from the pool's log
    in the transaction.
  - **Wallet:** a compact header with Follow, a record summary with gains and
    losses in the same size, and positions as Entry, Exit and Result columns.
  - **Portfolio:** holdings grouped into one card per pair asset.
  - **Profile:** identity, wallet address, the newest receipts, settings and the
    About line. "Export key" is listed as not available yet, since it is not built.
  - **Discover:** a search field and tap-list rows, each with Follow.
  - **Receipt:** a paper bar tab with punched edges, mono type and the QR code.
    Its colours are fixed, so the shared image looks the same from any phone.
  - **App icon and splash:** Taproom's mark on brass, drawn by
    `app/scripts/render-icons.py`. The Expo template's icon file was removed.
- The wallet address on Profile opens the system share sheet, which includes Copy.
  A one-tap copy needs a clipboard module, which is a new dependency and has not
  been approved.
- Still true: none of it has been reviewed on the phone by the owner yet.
- 2026-10-03: the owner chose a new logo from thirty brushed-gold concepts: a
  "T" whose crossbar ends in a tap spout, with one drop, gold on black. It
  replaces the tap handle on brass, and it is the one exception to "no
  gradients": the rest of the app is still flat.
  - The mark's colours are fixed in both themes (`Brand` in `app/src/theme`).
  - `app/src/components/wordmark.tsx` and `app/scripts/render-icons.py` draw the
    same shapes; change both together.
  - The wordmark is now "Taproom", capitalised.
  - The app icon is the mark on black with a soft gold light behind it; the
    Android icon's background is black; the splash shows the mark alone.
  - Not yet seen on the phone: the icon and splash are native, so they need a
    rebuild.
- 2026-10-03: the theme now matches the logo, chosen by the owner from a mockup
  set ("Set 3: gold theme"). This replaces "flat surfaces … no shadows, glows or
  gradients" above with: flat working surfaces, brushed gold in a few named
  places.
  - **Colours:** the dark theme is true black (`#070706`) with gold-tinted
    hairlines; the light theme keeps its colours and takes a gold-tinted
    hairline. Buy, sell and the safety colours are unchanged.
  - **Gold gradients are used only for:** the logo, the primary button, the
    titles "Taproom" and "On tap", the sign-in screen, and a faint light at the
    top of dark screens. Cards, rows and numbers stay flat.
  - **Gold titles are outlines, not text.** React Native text cannot take a
    gradient without a masking library, so the two phrases were read from the
    Geist Bold font file into `app/src/components/gold-lettering.ts`. No package
    was added. A new gold title needs its outline added there.
  - **Sign-in:** the mark with a glow, the name in gold and sweeping gold lines.
  - **Receipt card:** a black slip with a gold edge, the gold wordmark and the
    multiple in gold, in place of the paper tab. The QR code stays dark on light
    so that scanners read it. The multiple is solid gold, not a gradient, since
    it is live text.
  - **The splash background** is the new black.
  - The indexer's public receipt page keeps its own plain styling.
  - Not yet seen on the phone. Contrast was checked in the mockups: secondary
    text on black is 7.9:1 and button text on the darkest gold is 7.6:1.
