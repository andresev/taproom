# 0020: Design system and the "On tap" feed

Date: 2026-10-03. Status: accepted; the owner chose this design from two mockup
sets. Foundations, sign-in and the feed are built; other screens still use the
earlier layouts in the new colours and type.

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
- **Not every screen is redesigned yet:** token page, buy and sell sheet, wallet,
  Portfolio, Profile, Discover and the receipt card still have their earlier
  layouts.
- **The app icon and splash screen are still the Expo defaults.**
- **Seen in mockups and a bundle build, not yet reviewed on the phone.**
