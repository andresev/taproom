import type { SafetyFacts } from './facts';
import type { SafetyCheck } from './types';

/**
 * The per-input rules: facts in, one check out, with a factual sentence. Pure
 * and deterministic. Thresholds are recorded in docs/0009-safety-checks.md and,
 * for the Brew-specific inputs, docs/0014-brew-safety-inputs.md.
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
/** An earlier launch "went badly" when its price fell to this share of its first price, or below. */
const DEPLOYER_PRICE_FALL_BPS = 1_000;
/** …or when its deployer sold at least this share of what they bought within an hour of launch. */
const DEPLOYER_QUICK_SELL_BPS = 5_000;
/** Earlier launches that went badly: warn from the first, fail from this many. */
const DEPLOYER_BAD_LAUNCHES_FAIL = 3;
/** Share of supply bought in the launch block and the next two. */
const LAUNCH_BOUGHT_WARN_SHARE = 0.1;
const LAUNCH_BOUGHT_FAIL_SHARE = 0.3;
/** Pair assets that pass: Brew's own "Majors" and "Gold" groups. */
const PASSING_PAIR_KINDS = new Set(['major', 'gold']);

const FACTORY_LABELS: Record<string, string> = {
  standard: 'standard',
  multiPairV1: 'multi-pair v1',
  multiPairV2: 'multi-pair v2',
  dividend: 'dividend',
};

const percent = (share: number, digits = 0) => `${(share * 100).toFixed(digits)}%`;
const plural = (count: number, word: string, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

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

  if (sold === 0n) {
    return { id: 'dev-wallet', status: 'pass', reason: 'Deployer has not sold any of this token.' };
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
    reason: `Deployer sold ${percent(share)} of the tokens they bought${when}.`,
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

export function originCheck(facts: SafetyFacts['origin']): SafetyCheck {
  if (!facts) return { id: 'origin', status: 'unknown', reason: 'Origin: Unknown' };
  if (facts.factory === null) {
    return { id: 'origin', status: 'fail', reason: 'Not launched by a Brew factory Tapped knows.' };
  }
  const factory = `Brew's ${FACTORY_LABELS[facts.factory] ?? facts.factory} factory`;
  if (facts.matchesTemplate === null) {
    return { id: 'origin', status: 'unknown', reason: `Launched by ${factory}; its contract template is not recorded.` };
  }
  if (!facts.matchesTemplate) {
    return {
      id: 'origin',
      status: 'warn',
      reason: `Launched by ${factory}, but its code differs from the template other tokens from that factory share.`,
    };
  }
  return {
    id: 'origin',
    status: 'pass',
    reason: `Launched by ${factory}; its code is the template every token from that factory shares.`,
  };
}

const PAIR_KIND_WORDS: Record<NonNullable<SafetyFacts['pairAssets']>[number]['kind'], string> = {
  major: 'a major asset',
  gold: 'tokenized gold',
  brew: 'the $BREW token',
  'brew-token': 'another Brew token',
  'tokenized-stock': 'a tokenized stock',
  other: 'another token',
};

export function pairAssetCheck(facts: SafetyFacts['pairAssets']): SafetyCheck {
  if (!facts || facts.length === 0) return { id: 'pair-asset', status: 'unknown', reason: 'Pair asset: Unknown' };
  const name = (asset: (typeof facts)[number]) => asset.pairSymbol ?? asset.pairToken;
  const risky = facts.filter((asset) => !PASSING_PAIR_KINDS.has(asset.kind));
  if (risky.length === 0) {
    return { id: 'pair-asset', status: 'pass', reason: `Brewed with ${facts.map(name).join(' and ')}.` };
  }
  const described = risky.map((asset) => `${name(asset)} (${PAIR_KIND_WORDS[asset.kind]})`).join(' and ');
  return {
    id: 'pair-asset',
    status: 'warn',
    reason: `Liquidity is priced in ${described}, and can lose value with ${risky.length === 1 ? 'it' : 'them'}.`,
  };
}

/** "since 2026-10-01 04:16 UTC", or how the history is bounded when its start is not known. */
function historyPhrase(facts: NonNullable<SafetyFacts['deployerRecord']>): string {
  if (facts.historyComplete) return 'in Brew history';
  if (facts.historyFrom === null) return 'since the indexer last started';
  return `since ${new Date(facts.historyFrom * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function deployerRecordCheck(facts: SafetyFacts['deployerRecord']): SafetyCheck {
  if (!facts) return { id: 'deployer-record', status: 'unknown', reason: 'Deployer record: Unknown' };
  const period = historyPhrase(facts);
  if (facts.earlierLaunchCount === 0) {
    return { id: 'deployer-record', status: 'pass', reason: `No earlier launches by this deployer ${period}.` };
  }

  let fell = 0;
  let quickSold = 0;
  let bad = 0;
  for (const launch of facts.earlierLaunches) {
    const didFall = launch.lastToFirstPriceBps !== null && launch.lastToFirstPriceBps <= DEPLOYER_PRICE_FALL_BPS;
    const didSell = launch.soldWithinHourBps !== null && launch.soldWithinHourBps >= DEPLOYER_QUICK_SELL_BPS;
    if (didFall) fell++;
    if (didSell) quickSold++;
    if (didFall || didSell) bad++;
  }

  const examined = facts.earlierLaunches.length;
  const scope =
    examined < facts.earlierLaunchCount
      ? `${plural(facts.earlierLaunchCount, 'earlier launch', 'earlier launches')} ${period} (newest ${examined} examined)`
      : `${plural(facts.earlierLaunchCount, 'earlier launch', 'earlier launches')} ${period}`;
  const details =
    bad === 0
      ? 'none fell 90% or more from its first price, and in none did the deployer sell half or more within an hour'
      : [
          `${bad} went badly`,
          fell > 0 ? `${fell} fell 90% or more from its first price` : null,
          quickSold > 0 ? `in ${quickSold} the deployer sold half or more within an hour` : null,
        ]
          .filter((part) => part !== null)
          .join('; ');
  return {
    id: 'deployer-record',
    status: bad >= DEPLOYER_BAD_LAUNCHES_FAIL ? 'fail' : bad > 0 ? 'warn' : 'pass',
    reason: `Deployer has ${scope}: ${details}.`,
  };
}

export function launchHoldersCheck(facts: SafetyFacts['launchHolders']): SafetyCheck {
  if (!facts) return { id: 'launch-holders', status: 'unknown', reason: 'Buying at launch: Unknown' };
  const supply = BigInt(facts.totalSupply);
  if (supply <= 0n) return { id: 'launch-holders', status: 'unknown', reason: 'Buying at launch: Unknown' };

  const share = Number((BigInt(facts.bought) * 1_000_000n) / supply) / 1_000_000;
  const deployerShare = Number((BigInt(facts.deployerBought) * 1_000_000n) / supply) / 1_000_000;
  const who =
    facts.wallets === 0
      ? ''
      : `, by ${plural(facts.wallets, 'wallet')}${deployerShare > 0 ? ` (the deployer: ${percent(deployerShare, 1)})` : ''}`;
  return {
    id: 'launch-holders',
    status: share >= LAUNCH_BOUGHT_FAIL_SHARE ? 'fail' : share >= LAUNCH_BOUGHT_WARN_SHARE ? 'warn' : 'pass',
    reason: `${percent(share, 1)} of supply was bought in the launch block and the next ${facts.blocks - 1}${who}. Wallets funded from one source are not detected.`,
  };
}

/**
 * Every check. `facts` is null when the indexer could not be reached, and then
 * every check is Unknown.
 */
export function checksFromFacts(facts: SafetyFacts | null): SafetyCheck[] {
  const topTenHolderShare = facts?.holders ? facts.holders.topTenShareBps / 10_000 : null;
  return [
    originCheck(facts?.origin ?? null),
    deployerRecordCheck(facts?.deployerRecord ?? null),
    launchHoldersCheck(facts?.launchHolders ?? null),
    pairAssetCheck(facts?.pairAssets ?? null),
    devWalletCheck(facts?.devWallet ?? null),
    holderConcentrationCheck(topTenHolderShare),
    contractCheck(facts?.contract ?? null),
    sellSimulationCheck(facts?.sellSimulation ?? null),
    washActivityCheck(facts?.washActivity ?? null),
  ];
}
