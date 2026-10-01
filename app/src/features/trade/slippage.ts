/** Slippage in basis points (1 bps = 0.01%). */
export const DEFAULT_SLIPPAGE_BPS = 50;
/** Above this the swap screen must warn loudly. Slippage is never raised automatically. */
export const HIGH_SLIPPAGE_WARNING_BPS = 500;

export function isHighSlippage(bps: number): boolean {
  return bps > HIGH_SLIPPAGE_WARNING_BPS;
}
