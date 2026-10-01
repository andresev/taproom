import type { SafetyCheck, SafetyCheckId, SafetyCheckStatus, SafetyLevel, SafetyScore } from './types';

/** Every input a v1 score needs. One missing from the results counts as unknown. */
export const SAFETY_CHECK_IDS: readonly SafetyCheckId[] = [
  'dev-wallet',
  'holder-concentration',
  'contract',
  'sell-simulation',
  'wash-activity',
];

const UNKNOWN_REASON: Record<SafetyCheckId, string> = {
  'dev-wallet': 'Dev wallet activity: Unknown',
  'holder-concentration': 'Holder concentration: Unknown',
  contract: 'Contract checks: Unknown',
  'sell-simulation': 'Sell simulation: Unknown',
  'wash-activity': 'Wash activity: Unknown',
};

// Worst first, so the reasons that drove the level lead the list.
const SEVERITY: Record<SafetyCheckStatus, number> = { fail: 0, unknown: 1, warn: 2, pass: 3 };

/**
 * Combine per-input check results into a score. Pure and deterministic.
 *
 * - any `fail` gives Danger
 * - otherwise any `warn` or `unknown` gives Caution: missing data is never safe
 * - Safe only when every input was fetched and passed
 *
 * The per-input rules (thresholds for what counts as warn or fail) are added
 * alongside each input's fetcher; this only aggregates.
 */
export function scoreToken(checks: readonly SafetyCheck[]): SafetyScore {
  const byId = new Map(checks.map((check) => [check.id, check]));
  const all = SAFETY_CHECK_IDS.map(
    (id): SafetyCheck => byId.get(id) ?? { id, status: 'unknown', reason: UNKNOWN_REASON[id] },
  );
  const sorted = all
    .map((check, i) => ({ check, i }))
    .sort((a, b) => SEVERITY[a.check.status] - SEVERITY[b.check.status] || a.i - b.i)
    .map(({ check }) => check);

  let level: SafetyLevel = 'safe';
  if (all.some((c) => c.status === 'fail')) level = 'danger';
  else if (all.some((c) => c.status === 'warn' || c.status === 'unknown')) level = 'caution';

  const [first, ...rest] = sorted;
  if (!first) throw new Error('scoreToken: no safety checks defined');
  return { level, reasons: [first, ...rest] };
}
