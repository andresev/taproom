/** The inputs to a safety score. See CLAUDE.md "Safety model". */
export type SafetyCheckId =
  | 'dev-wallet'
  | 'holder-concentration'
  | 'contract'
  | 'sell-simulation'
  | 'wash-activity';

/**
 * `unknown` means the input could not be fetched. It is never treated as a pass.
 */
export type SafetyCheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface SafetyCheck {
  id: SafetyCheckId;
  status: SafetyCheckStatus;
  /** Factual statement ("Deployer sold 40% of supply within 10 minutes"), never advice. */
  reason: string;
}

export type SafetyLevel = 'safe' | 'caution' | 'danger';

export interface SafetyScore {
  level: SafetyLevel;
  /** Non-empty by type: a score is never shown without its reasons. */
  reasons: [SafetyCheck, ...SafetyCheck[]];
}
