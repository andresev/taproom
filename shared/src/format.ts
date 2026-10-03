import { formatBaseUnits } from "./money.js";

/**
 * Shared display helpers for on-chain values. The app (through
 * app/src/lib/chain/format.ts) and the indexer's receipt page format through
 * these, never inline.
 */

/** "0x1234…abcd". Returns the input unchanged if it is too short to shorten. */
export function shortAddress(address: string, chars = 4): string {
  if (address.length <= 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Base units to a display string, truncated (never rounded up) to
 * `maxFractionDigits`. A non-zero amount too small to show reads "<0.0001"
 * rather than "0".
 */
export function formatTokenAmount(units: bigint, decimals: number, maxFractionDigits = 4): string {
  const exact = formatBaseUnits(units, decimals);
  const negative = exact.startsWith('-');
  const [whole = '0', frac = ''] = (negative ? exact.slice(1) : exact).split('.');
  const shown = frac.slice(0, maxFractionDigits).replace(/0+$/, '');

  if (units !== 0n && whole === '0' && shown === '') {
    const floor = maxFractionDigits > 0 ? `0.${'0'.repeat(maxFractionDigits - 1)}1` : '1';
    return `${negative ? '>-' : '<'}${floor}`;
  }
  return `${negative ? '-' : ''}${groupThousands(whole)}${shown ? `.${shown}` : ''}`;
}

const USD_UNITS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
] as const;

/**
 * Compact USD for market cap, liquidity and volume: "$1.23M", "$45.6K", "$812".
 * USD figures are display values derived from prices, so a JS number is fine here.
 */
export function formatUsdCompact(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return '—';
  for (const { value, suffix } of USD_UNITS) {
    if (usd >= value) return `$${trimZeros((usd / value).toPrecision(3))}${suffix}`;
  }
  if (usd >= 1) return `$${Math.round(usd)}`;
  if (usd === 0) return '$0';
  return `$${trimZeros(usd.toPrecision(2))}`;
}

function trimZeros(n: string): string {
  // toPrecision can return exponent form for very small values; expand it.
  const plain = n.includes('e') ? Number(n).toFixed(20) : n;
  return plain.includes('.') ? plain.replace(/\.?0+$/, '') : plain;
}

/**
 * The name a pair asset is shown by. A pool holds wrapped BNB, but users pay and
 * are paid in BNB, so WBNB reads "BNB". Anything else keeps its own symbol.
 */
export function pairAssetLabel(symbol: string | null, fallback = 'pair asset'): string {
  if (!symbol) return fallback;
  return symbol === 'WBNB' ? 'BNB' : symbol;
}

/**
 * A multiple for receipts and trader records: "3.2x", "0.24x", "12.3x". Truncated,
 * never rounded up, so 0.2499 reads "0.24x", not "0.25x". Cut by digits, not by
 * floating-point maths, which would turn 0.29 into 0.28.
 */
export function formatMultiple(multiple: number): string {
  if (!Number.isFinite(multiple) || multiple < 0) return '—';
  const [whole = '0', frac = ''] = multiple.toFixed(6).split('.');
  const kept = frac.slice(0, multiple >= 10 ? 1 : 2);
  return `${trimZeros(`${whole}.${kept}`)}x`;
}

/**
 * A price, which can be far below one: keeps `significant` digits after the
 * leading zeros instead of a fixed number of decimals. "0.000000008006",
 * "0.01234", "1,234.5". Truncates, never rounds up.
 */
export function formatPrice(units: bigint, decimals: number, significant = 4): string {
  if (units <= 0n) return units === 0n ? '0' : '—';
  const [whole = '0', frac = ''] = formatBaseUnits(units, decimals).split('.');
  if (whole !== '0') {
    const keep = Math.max(0, significant - whole.length);
    const shown = frac.slice(0, keep).replace(/0+$/, '');
    return `${groupThousands(whole)}${shown ? `.${shown}` : ''}`;
  }
  const leadingZeros = frac.length - frac.replace(/^0+/, '').length;
  const shown = frac.slice(0, leadingZeros + significant).replace(/0+$/, '');
  return shown ? `0.${shown}` : '0';
}

/** A V3 pool fee, in hundredths of a basis point, as a percentage: 10000 is "1%", 2500 is "0.25%". */
export function formatPoolFee(fee: number): string {
  if (!Number.isInteger(fee) || fee < 0) return '—';
  return `${trimZeros((fee / 10_000).toFixed(4))}%`;
}

/** A block time as an unambiguous UTC timestamp for receipts: "2026-10-02 20:01 UTC". */
export function formatUtcDateTime(time: Date): string {
  if (Number.isNaN(time.getTime())) return '—';
  return `${time.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** How long ago a block time was, for feed rows: "now", "45s", "12m", "3h", "5d". */
export function formatTimeAgo(time: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - time.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
