/** Slippage in basis points (1 bps = 0.01%). */
export const DEFAULT_SLIPPAGE_BPS = 50;
/** Above this the swap screen must warn loudly. Slippage is never raised automatically. */
export const HIGH_SLIPPAGE_WARNING_BPS = 500;
/** The choices offered. The last is above the warning line on purpose: thin pools can need it. */
export const SLIPPAGE_OPTIONS_BPS = [50, 100, 300, 500, 1000] as const;
/** Nothing above this is accepted: past it, "minimum received" stops protecting anyone. */
export const MAX_SLIPPAGE_BPS = 5000;

export function isHighSlippage(bps: number): boolean {
  return bps > HIGH_SLIPPAGE_WARNING_BPS;
}

/** "0.5%", "3%". */
export function formatSlippage(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}
