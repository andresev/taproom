/**
 * Display helpers for on-chain values. They live in @repo/shared
 * (shared/src/format.ts) so the indexer's public receipt page prints numbers
 * exactly as the app does. Screens and features format through these, never inline.
 */
export {
  formatMultiple,
  formatPoolFee,
  formatPrice,
  formatTimeAgo,
  formatTokenAmount,
  formatUsdCompact,
  formatUtcDateTime,
  shortAddress,
} from '@repo/shared';
