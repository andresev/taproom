import type { SafetyCheck, SafetyCheckStatus, SafetyLevel } from './types';

/** `unknown` is shown while a score is loading or could not be worked out. It is never styled as safe. */
export type SafetyPillLevel = SafetyLevel | 'unknown';

/** How each check's status is shown: the icon and colour of a rating, and a word. */
export const STATUS_DISPLAY: Record<SafetyCheckStatus, { level: SafetyPillLevel; label: string; plural: string }> = {
  fail: { level: 'danger', label: 'Problem', plural: 'problems' },
  warn: { level: 'caution', label: 'Caution', plural: 'cautions' },
  unknown: { level: 'unknown', label: 'Unknown', plural: 'unknown' },
  pass: { level: 'safe', label: 'OK', plural: 'OK' },
};

const WORST_FIRST: SafetyCheckStatus[] = ['fail', 'warn', 'unknown', 'pass'];

/** "1 problem · 2 cautions · 6 OK", worst first, leaving out any status with no checks. */
export function summarizeChecks(checks: readonly SafetyCheck[]): string {
  return WORST_FIRST.map((status) => {
    const count = checks.filter((check) => check.status === status).length;
    if (count === 0) return null;
    const { label, plural } = STATUS_DISPLAY[status];
    const countable = status === 'fail' || status === 'warn';
    return `${count} ${countable && count === 1 ? label.toLowerCase() : plural}`;
  })
    .filter((part) => part !== null)
    .join(' · ');
}
