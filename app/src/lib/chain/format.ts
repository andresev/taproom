import { formatBaseUnits } from '@repo/shared';

/**
 * Shared display helpers for on-chain values. Screens and features format
 * through these, never inline.
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

/** Entry-to-now multiple for receipts: "3.2x". */
export function formatMultiple(multiple: number): string {
  if (!Number.isFinite(multiple) || multiple < 0) return '—';
  return `${trimZeros(multiple.toFixed(multiple >= 10 ? 1 : 2))}x`;
}
