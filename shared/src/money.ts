/**
 * Token amounts are integer base units (bigint), never floats.
 * See DECISIONS.md: "Money math: integer base units only; no floats."
 *
 * Solana SPL tokens have 0–9 decimals in practice (SOL = 9, USDC = 6),
 * but these helpers accept any non-negative integer decimals.
 */

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new RangeError(`Invalid token decimals: ${decimals}`);
  }
}

/**
 * Parse a human decimal string ("1.5") into base units (1500000000n for 9 decimals).
 * Takes a string on purpose: a JS number has already lost precision.
 * Throws if the value has more fractional digits than the token supports.
 */
export function toBaseUnits(amount: string, decimals: number): bigint {
  assertDecimals(decimals);
  const match = DECIMAL_RE.exec(amount.trim());
  if (!match) throw new TypeError(`Not a decimal amount: "${amount}"`);

  const [, sign, whole = "0", frac = ""] = match;
  if (frac.length > decimals) {
    throw new RangeError(
      `"${amount}" has ${frac.length} fractional digits; token supports ${decimals}`,
    );
  }
  const units = BigInt(whole + frac.padEnd(decimals, "0"));
  return sign ? -units : units;
}

/** Format base units back into an exact decimal string, trimming trailing zeros. */
export function formatBaseUnits(units: bigint, decimals: number): string {
  assertDecimals(decimals);
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const s = abs.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = decimals ? s.slice(s.length - decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** bigint does not survive JSON.stringify; serialize as a decimal string of base units. */
export function baseUnitsToJSON(units: bigint): string {
  return units.toString();
}

export function baseUnitsFromJSON(value: string): bigint {
  if (!/^-?\d+$/.test(value)) throw new TypeError(`Not an integer string: "${value}"`);
  return BigInt(value);
}
