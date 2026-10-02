# Research: competitive landscape and what makes Taproom different

Date: 2026-10-02. Status: adopted in 0011 the same day. Written as findings for
review; the text below is as written then, except where "Since then" says otherwise.

Method: web search and public pages only. Brew's own site and docs render in the
browser and returned no content to the fetch tool, so every Brew fact below comes
from secondary sources (CoinMarketCap, IQ.wiki, news articles) and still needs
checking against the contracts.

## 1. Brew today

- Launched early September 2026. About four weeks old.
- Launch counts differ by source: 1,785 (CoinMarketCap, 26 Sept) and 3,269 (late
  September search summary).
- $BREW market cap has swung from about $30M at its 7 Sept peak to single-digit
  millions. CoinMarketCap showed $0.01024 with 917M circulating.
- The team is anonymous. News coverage calls this out as an operational risk.
- Mechanics reported consistently across sources:
  - A token can launch with **up to five pairs at once**, each its own PancakeSwap
    V3 pool.
  - Pair assets include WBNB, USDT, $BREW, memecoins and Binance tokenized stocks
    (bStocks).
  - Every token has a fixed 1,000,000,000 supply at 18 decimals, zero transfer tax,
    no owner privileges after deployment and no mint.
  - The 1% fee: the token side is burned; the pair side is split between creator
    and protocol, with the protocol taking at most 50%.
  - Creators can route their fees to holders or to buyback-and-burn instead.
- Brew is not the largest launchpad in this wave. Flap reported about $2.88M in
  24-hour fees in the same coverage; Four.meme had fallen to under $10k.
- A second domain, brewfamily.dev, shows the same page title as brew.family. I
  could not tell whether it is official. Treat it as unverified.

## 2. Who already does what Taproom does

| Product | BSC | Mobile app | Follow + feed | One-tap buy | Safety checks | Wallet model |
|---|---|---|---|---|---|---|
| Fomo | Yes | iOS, Android | Yes, core feature | Yes | Basic contract and honeypot screens | Embedded, self-custodial |
| GMGN | Yes | iOS, Android | Wallet tracking, data-led | Yes, automated copy trade | Honeypot, tax, mint, ownership | Non-custodial |
| Axiom | Yes | Web | Wallet tracking | Yes | Bundle checker | Non-custodial |
| MoonRush | Yes | Mobile | Yes | Yes | "AI risk protection" | Not confirmed |
| Binance Wallet Meme Rush | Yes | In Binance app | No follow graph | Yes | Binance-gated | Binance Wallet |

What this means:

- **Brew tokens are ordinary PancakeSwap V3 pools, so every BSC terminal can
  already trade them.** News coverage of $BREW cites GMGN data. Brew has no
  technical barrier that keeps incumbents out.
- **ADR 0007 moved Taproom to Fomo's wallet model.** Fomo already covers BNB
  Chain. As specified today, Taproom's core loop is Fomo's core loop restricted to
  one launchpad. "External wallet, we never touch keys" is no longer a difference.
- I found no social app or tracker built specifically for Brew. That gap is real
  but it is a head start, not a moat.

## 3. Where the gaps are

- **Deployer tracking.** One comparison names missing dev-wallet tracking as
  Fomo's main research gap. GMGN and Axiom have it, but generically, not as a
  per-launchpad reputation record.
- **Contract checks say little on Brew.** If every Brew token has no owner, no
  mint, no tax and locked liquidity, then the checks every scanner runs return
  "fine" for all of them. The risk on Brew is elsewhere: deployer and sniper
  holdings at launch, deployer history, wash volume, and the pair asset itself (a
  token brewed with a memecoin has liquidity priced in something that can go to
  zero).
- **Fake proof.** Faked PnL screenshots are a documented problem. The products
  fixing it (ProofTrade, TrustCrypto, PurffleTrade) target exchange accounts or
  generic copy trading. None is tied to a launchpad or built as a share loop.
- **Trust in the feed.** Reviews of Fomo complain about misleading trader stats
  and herd behaviour. A feed where each trader's record, including losses, is
  computed from chain data is a response to that.

## 4. Risks that need a decision

- **bStock pairs and Apple.** Guideline 3.1.5(iv) says apps facilitating
  "crypto-securities or quasi-securities trading" must come from approved
  financial institutions. Buying a token paired with a tokenized stock, inside the
  app, may fall under that.
- **Apple account and licensing.** 3.1.5(i) requires an organization developer
  account for wallet apps. 3.1.5(iii) ties exchange features to licensing in each
  region. Google confirmed non-custodial wallets are outside its licensing rule.
- **Rewards.** 3.1.5(v) bars paying crypto for tasks such as inviting users or
  posting. That limits referral and season reward designs.
- **Platform dependency.** Taproom's ceiling is Brew's volume. Brew is four weeks
  old, has an anonymous team, and is smaller than Flap.
- **Holder rewards.** Some Brew tokens route fees to holders, and Flap tokens pay
  stock dividends. CLAUDE.md bans Taproom itself from doing this, but says nothing
  about displaying or trading third-party tokens that do.

## 5. Proposed CLAUDE.md changes

1. **Add a "Positioning" section.** Name Fomo, GMGN and Axiom as the incumbents.
   State that Taproom does not compete on execution speed or terminal features.
   State the two things it must be best at: provable records (receipts and trader
   track records) and Brew-specific deployer reputation.
2. **Update "Brew context."** Add: launched September 2026; up to five pools per
   token; USDT as a pair asset; the pair-side fee split; the standard token
   template (fixed supply, no owner, no mint, no tax). Mark all as "from secondary
   sources, verify on-chain."
3. **Rework the safety inputs for Brew.**
   - Replace generic contract checks with "confirm the token was created by the
     Brew factory and matches the standard template; anything else is Danger or
     Unknown."
   - Add sniper and bundled-wallet share of supply in the first blocks.
   - Add pair-asset risk as its own reason.
   - Keep dev wallet, concentration, sell simulation and wash activity.
4. **Strengthen receipts.** A receipt image can itself be edited. Add a public
   verification link or QR code on each card that re-renders the receipt from
   indexed data. Without that, "verified" is only a claim.
5. **Move a verified trader record into v1.** On the wallet screen: entries,
   exits, wins and losses computed from the indexer. Leaderboard seasons stay v2.
6. **Add to "Open questions":** bStock-paired tokens and Apple 3.1.5(iv); the
   organization developer account; whether to show or trade tokens with
   holder-reward routing; launchpad dependency.
7. **Add a data-model note:** keep the indexer's launch and pool tables free of
   Brew-only assumptions, so a second launchpad (Flap, Four.meme) could be added
   without a rewrite. Not v1 work.
8. **Tighten the Taproom token note:** rewards must not pay users for inviting or
   posting (3.1.5(v)).

## Not verified

- Whether Fomo, GMGN or Axiom label or filter Brew launches as a category.
- Brew's locker contract, and the standard factory's deployment block. (Corrected:
  this item first listed the factory address and launch event too, which 0004 had
  already confirmed.)
- Brew's own roadmap, and whether it plans profiles or a feed.
- MoonRush details. Its press release would not load.

## Since then

- 2026-10-02: the proposals in section 5 were adopted in 0011, with one change to
  item 3 recorded there.
- 2026-10-02: Brew's site and its published analytics were read directly for 0011.
  The site has no profiles, follow graph, feed, leaderboard or mobile app, and it
  ships Chinese and Japanese translations. Its roadmap is still unknown.
- 2026-10-02: the launch counts in section 1 can be replaced by the on-chain count
  in 0004: 3,225 across the five factories on 2026-10-01.

## Sources

- https://coinmarketcap.com/cmc-ai/brew/what-is/
- https://iq.wiki/wiki/brew
- https://longbridge.com/news/298210180
- https://www.weex.com/news/detail/bnb-chain-launches-a-battleground-is-the-keyword-this-round-coin-stock-meme-utny8ed25ndfte6lmwj7ccud
- https://coinspot.io/en/reviews/fomo-crypto-app/
- https://fomobyte.com/fomo-app-alternative
- https://solbotrank.com/compare/fomo-vs-gmgn
- https://play.google.com/store/apps/details?id=com.gmgn.app
- https://www.datawallet.com/crypto/gmgn-explained
- https://beincrypto.com/binance-wallet-meme-coin-market-expansion/
- https://developer.apple.com/app-store/review/guidelines/
- https://finance.yahoo.com/news/google-confirms-non-custodial-wallets-235926150.html
- https://parthsamin.medium.com/the-10-000-screenshot-why-crypto-trading-has-a-trust-problem-and-how-we-can-fix-it-24beef2309e1
