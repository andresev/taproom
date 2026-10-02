import type { SafetyFacts } from './facts';
import type { SafetyCheck } from './types';

/**
 * The per-input rules: facts in, one check out, with a factual sentence. Pure
 * and deterministic. Thresholds are recorded in docs/0009-safety-checks.md.
 *
 * Every function takes `null` to mean "could not be fetched" and returns
 * Unknown for it. Missing data is never a pass.
 */

/** Deployer selling at least this share of what they bought is a fail. */
const DEV_SOLD_FAIL_SHARE = 0.5;
/** Top-10 holders' share of supply, pool and burn address excluded. */
const HOLDERS_WARN_SHARE = 0.1;
const HOLDERS_FAIL_SHARE = 0.3;
/** Round-trip loss from buying then selling. Two 1% pool fees alone are about 200 bps. */
const SELL_LOSS_WARN_BPS = 500;
const SELL_LOSS_FAIL_BPS = 2000;
/** Average trades per wallet, and the busiest wallet's share of all trades. */
const WASH_TRADES_PER_WALLET_WARN = 5;
const WASH_TOP_WALLET_WARN_SHARE = 0.3;
const WASH_TOP_WALLET_FAIL_SHARE = 0.6;
/** Below this many trades, one wallet's share says little either way. */
const WASH_MIN_TRADES = 10;

const percent = (share: number, digits = 0) => `${(share * 100).toFixed(digits)}%`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "39 seconds", "10 minutes", "3 hours", "2 days". */
function duration(seconds: number): string {
  if (seconds < 60) return plural(Math.floor(seconds), 'second');
  if (seconds < 3600) return plural(Math.floor(seconds / 60), 'minute');
  if (seconds < 86400) return plural(Math.floor(seconds / 3600), 'hour');
  return plural(Math.floor(seconds / 86400), 'day');
}

export function devWalletCheck(facts: SafetyFacts['devWallet']): SafetyCheck {
  if (!facts) return { id: 'dev-wallet', status: 'unknown', reason: 'Dev wallet activity: Unknown' };

  const bought = BigInt(facts.bought);
  const sold = BigInt(facts.sold);
  const others =
    facts.otherLaunches > 0
      ? ` This wallet has ${facts.otherLaunches} other indexed ${facts.otherLaunches === 1 ? 'launch' : 'launches'}.`
      : '';

  if (sold === 0n) {
    return { id: 'dev-wallet', status: 'pass', reason: `Deployer has not sold any of this token.${others}` };
  }

  // Selling tokens that were never bought through the pool counts as selling all of them.
  const share = bought > 0n ? Math.min(1, Number((sold * 10_000n) / bought) / 10_000) : 1;
  const when =
    facts.firstSellSecondsAfterLaunch === null
      ? ''
      : `, first sale ${duration(facts.firstSellSecondsAfterLaunch)} after launch`;
  return {
    id: 'dev-wallet',
    status: share >= DEV_SOLD_FAIL_SHARE ? 'fail' : 'warn',
    reason: `Deployer sold ${percent(share)} of the tokens they bought${when}.${others}`,
  };
}

/** `share` is the top-10 holders' share of supply, 0 to 1, with the pool and burn address already excluded. */
export function holderConcentrationCheck(share: number | null): SafetyCheck {
  if (share === null) return { id: 'holder-concentration', status: 'unknown', reason: 'Holder concentration: Unknown' };
  return {
    id: 'holder-concentration',
    status: share >= HOLDERS_FAIL_SHARE ? 'fail' : share >= HOLDERS_WARN_SHARE ? 'warn' : 'pass',
    reason: `Top 10 holders own ${percent(share, 2)} of supply, pool and burn address excluded.`,
  };
}

export function contractCheck(facts: SafetyFacts['contract']): SafetyCheck {
  if (!facts) return { id: 'contract', status: 'unknown', reason: 'Contract checks: Unknown' };
  if (facts.riskyFunctions.length > 0) {
    return {
      id: 'contract',
      status: 'fail',
      reason: `Contract has functions that can mint, block holders or change trading costs: ${facts.riskyFunctions.join(', ')}.`,
    };
  }
  if (facts.ownerFunctions.length > 0) {
    return {
      id: 'contract',
      status: 'warn',
      reason: `Contract has an owner: ${facts.ownerFunctions.join(', ')}.`,
    };
  }
  return {
    id: 'contract',
    status: 'pass',
    reason: 'Contract has no owner, mint, blacklist or tax-setting functions.',
  };
}

export function sellSimulationCheck(facts: SafetyFacts['sellSimulation']): SafetyCheck {
  if (!facts) return { id: 'sell-simulation', status: 'unknown', reason: 'Sell simulation: Unknown' };
  switch (facts.outcome) {
    case 'not-simulated':
      return { id: 'sell-simulation', status: 'unknown', reason: `Sell simulation: Unknown (${facts.reason}).` };
    case 'buy-reverted':
      return { id: 'sell-simulation', status: 'unknown', reason: 'Sell simulation: Unknown (the simulated buy reverted).' };
    case 'sell-reverted':
      return {
        id: 'sell-simulation',
        status: 'fail',
        reason: 'A simulated sell reverted: tokens bought could not be sold back.',
      };
    case 'sold': {
      const returned = percent(1 - facts.lossBps / 10_000, 2);
      return {
        id: 'sell-simulation',
        status:
          facts.lossBps > SELL_LOSS_FAIL_BPS ? 'fail' : facts.lossBps > SELL_LOSS_WARN_BPS ? 'warn' : 'pass',
        reason: `A simulated buy and sell went through, returning ${returned} of the BNB spent.`,
      };
    }
  }
}

export function washActivityCheck(facts: SafetyFacts['washActivity']): SafetyCheck {
  if (!facts) return { id: 'wash-activity', status: 'unknown', reason: 'Wash activity: Unknown' };
  if (facts.trades === 0 || facts.wallets === 0) {
    return { id: 'wash-activity', status: 'pass', reason: 'No trades indexed yet.' };
  }

  const topShare = facts.topWalletTrades / facts.trades;
  const perWallet = facts.trades / facts.wallets;
  const enough = facts.trades >= WASH_MIN_TRADES;
  const status =
    enough && topShare > WASH_TOP_WALLET_FAIL_SHARE
      ? 'fail'
      : enough && (topShare > WASH_TOP_WALLET_WARN_SHARE || perWallet > WASH_TRADES_PER_WALLET_WARN)
        ? 'warn'
        : 'pass';
  return {
    id: 'wash-activity',
    status,
    reason: `${plural(facts.trades, 'trade')} by ${plural(facts.wallets, 'wallet')}; the most active wallet made ${percent(topShare)} of them.`,
  };
}

/**
 * All five checks. `facts` is null when the indexer could not be reached, which
 * leaves only holder concentration (computed by the app) possibly known.
 */
export function checksFromFacts(facts: SafetyFacts | null, topTenHolderShare: number | null): SafetyCheck[] {
  return [
    devWalletCheck(facts?.devWallet ?? null),
    holderConcentrationCheck(topTenHolderShare),
    contractCheck(facts?.contract ?? null),
    sellSimulationCheck(facts?.sellSimulation ?? null),
    washActivityCheck(facts?.washActivity ?? null),
  ];
}
