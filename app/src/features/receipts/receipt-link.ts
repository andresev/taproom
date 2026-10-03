/**
 * The public address of a receipt: the indexer's GET /r/:id page, served from
 * Taproom's own domain (docs/0010). The base comes from
 * EXPO_PUBLIC_RECEIPT_PAGE_URL; until it is set, cards carry no link or QR code
 * rather than one that leads nowhere.
 */
const base = process.env.EXPO_PUBLIC_RECEIPT_PAGE_URL;

/** A web address, typed so Expo Router accepts it as an external link. */
type WebUrl = `https://${string}` | `http://${string}`;

/** `${base}/r/${tradeId}`, or null when `base` is missing or not an http(s) URL. */
export function receiptPageUrlFrom(baseUrl: string | undefined, tradeId: string): WebUrl | null {
  if (!baseUrl) return null;
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const root = url.toString().replace(/\/+$/, '');
  return `${root}/r/${encodeURIComponent(tradeId)}` as WebUrl;
}

export function receiptPageUrl(tradeId: string): WebUrl | null {
  return receiptPageUrlFrom(base, tradeId);
}
