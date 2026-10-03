import {
  bscscanTxUrl,
  formatMultiple,
  formatTokenAmount,
  formatUtcDateTime,
  shortAddress,
  type Receipt,
} from "@repo/shared";

/**
 * The public receipt page (GET /r/:id): a receipt re-rendered from indexed chain
 * data, so anyone holding a shared image can check it against the chain. Pure:
 * the route builds the receipt, this only prints it. Every value is escaped.
 */

/** Trade ids are `${txHash}-${logIndex}`; nothing else reaches a query. */
export const TRADE_ID = /^0x[0-9a-f]{64}-\d{1,6}$/;

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const STYLE = `
  :root { color-scheme: dark; --ink: #f5f5f0; --muted: #a6a69c; --paper: #16161a; --rule: #2e2e36; --page: #0b0b0d; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 440px; margin: 0 auto; padding: 24px 16px 48px; }
  .card { background: var(--paper); border-radius: 24px; padding: 24px; display: grid; gap: 8px; }
  .head { display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; }
  .head strong { color: var(--ink); }
  h1 { margin: 4px 0 0; font-size: 34px; overflow-wrap: anywhere; }
  .multiple { font-size: 56px; font-weight: 700; line-height: 1.05; margin-top: 8px; }
  .muted { color: var(--muted); font-size: 13px; }
  hr { border: 0; border-top: 1px solid var(--rule); width: 100%; margin: 6px 0; }
  .line { display: flex; justify-content: space-between; gap: 16px; }
  .line span:first-child { color: var(--muted); }
  .line span:last-child { font-weight: 600; text-align: right; overflow-wrap: anywhere; }
  .note { color: var(--muted); font-size: 13px; margin-top: 16px; }
  a { color: var(--ink); }
`;

function page(title: string, description: string, url: string | null, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="website">
${url ? `<meta property="og:url" content="${escape(url)}">\n` : ""}<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<p class="note">Tapped is an independent, community-built app. Not affiliated with Brew.</p>
</main>
</body>
</html>`;
}

const line = (label: string, value: string) =>
  `<div class="line"><span>${escape(label)}</span><span>${escape(value)}</span></div>`;

/**
 * The receipt as a page. `checkedAt` is when the current market cap was read;
 * `url` is this page's own address, for link previews.
 */
export function renderReceiptPage(receipt: Receipt, checkedAt: Date, url: string | null): string {
  const symbol = receipt.token.symbol ?? shortAddress(receipt.token.address);
  const pair = receipt.pair.symbol ?? "pair asset";
  const cap = (value: bigint) => `${formatTokenAmount(value, receipt.pair.decimals, 2)} ${pair}`;
  const multiple = receipt.multiple === null ? "—" : formatMultiple(receipt.multiple);
  const bought = `${formatTokenAmount(receipt.amountBought, receipt.token.decimals)} ${symbol}`;
  const paid = `${formatTokenAmount(receipt.amountPaid, receipt.pair.decimals, 6)} ${pair}`;
  const txUrl = bscscanTxUrl(receipt.txHash);

  const body = `<div class="card">
<div class="head"><strong>Tapped receipt</strong><span>BNB Smart Chain</span></div>
<h1>${escape(symbol)}</h1>
${receipt.token.name && receipt.token.name !== receipt.token.symbol ? `<div class="muted">${escape(receipt.token.name)}</div>` : ""}
<div class="multiple">${escape(multiple)}</div>
<div class="muted">market cap now ÷ market cap at entry</div>
<hr>
${line("Bought", bought)}
${line("Paid", paid)}
${line("When", formatUtcDateTime(receipt.boughtAt))}
${line("Wallet", receipt.wallet)}
<hr>
${line("Market cap at entry", cap(receipt.entryMarketCap))}
${line("Market cap now", receipt.currentMarketCap === null ? "Unknown" : cap(receipt.currentMarketCap))}
<hr>
${line("Token", receipt.token.address)}
<div class="muted">Transaction <a href="${escape(txUrl)}">${escape(receipt.txHash)}</a> on BscScan</div>
</div>
<p class="note">This page is computed from Tapped's index of BNB Smart Chain, not from any image of it. It proves that the wallet above bought this token in that transaction, at that time and price. It does not show whether the wallet still holds the token or made a profit. Market cap now was read at ${escape(formatUtcDateTime(checkedAt))}; both market caps are in ${escape(pair)} and count the whole supply.</p>`;

  return page(
    `${symbol} receipt · Tapped`,
    `Wallet ${shortAddress(receipt.wallet)} bought ${bought} for ${paid} on ${formatUtcDateTime(receipt.boughtAt)}. ${multiple} market cap since.`,
    url,
    body,
  );
}

/** A page for an id that is not a receipt, saying why. */
export function renderNoReceiptPage(reason: string): string {
  return page("No receipt · Tapped", reason, null, `<div class="card"><h1>No receipt</h1><p>${escape(reason)}</p></div>`);
}
