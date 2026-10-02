import { describe, expect, it } from 'vitest';

import type { SafetyFacts } from './facts';
import {
  checksFromFacts,
  contractCheck,
  devWalletCheck,
  holderConcentrationCheck,
  sellSimulationCheck,
  washActivityCheck,
} from './rules';
import { scoreToken } from './score';

// Real facts from the indexer for RSUN (BSC, 2026-10-02).
const rsun: SafetyFacts = {
  token: '0xa908182208fd07b4d790faef7bbdab26afa2fa2f',
  devWallet: {
    deployer: '0x77de6a0ed0ad7479e2e7de553cfe9452438cd8b5',
    bought: '111624980300487585037288067',
    sold: '111624980300487585037288067',
    firstSellSecondsAfterLaunch: 598,
    otherLaunches: 0,
  },
  contract: { codeSize: 1991, ownerFunctions: [], riskyFunctions: [] },
  sellSimulation: { outcome: 'sold', lossBps: 198 },
  washActivity: { trades: 144, wallets: 58, topWalletTrades: 8 },
};

const dev = (overrides: Partial<NonNullable<SafetyFacts['devWallet']>>) =>
  devWalletCheck({ ...rsun.devWallet!, ...overrides });

describe('devWalletCheck', () => {
  it('fails a deployer who sold everything they bought, and says when', () => {
    expect(devWalletCheck(rsun.devWallet)).toEqual({
      id: 'dev-wallet',
      status: 'fail',
      reason: 'Deployer sold 100% of the tokens they bought, first sale 9 minutes after launch.',
    });
  });

  it('passes a deployer who has not sold', () => {
    expect(dev({ sold: '0', firstSellSecondsAfterLaunch: null })).toMatchObject({
      status: 'pass',
      reason: 'Deployer has not sold any of this token.',
    });
  });

  it('warns below half and fails from half', () => {
    expect(dev({ bought: '1000', sold: '499' }).status).toBe('warn');
    expect(dev({ bought: '1000', sold: '500' }).status).toBe('fail');
  });

  it('treats selling tokens never bought through the pool as selling all of them', () => {
    expect(dev({ bought: '0', sold: '5' })).toMatchObject({ status: 'fail' });
    expect(dev({ bought: '0', sold: '5' }).reason).toContain('100%');
  });

  it('mentions other launches by the same wallet', () => {
    expect(dev({ sold: '0', otherLaunches: 3 }).reason).toBe(
      'Deployer has not sold any of this token. This wallet has 3 other indexed launches.',
    );
  });

  it('is unknown without facts', () => {
    expect(devWalletCheck(null).status).toBe('unknown');
  });
});

describe('holderConcentrationCheck', () => {
  it('passes under 10%, warns from 10%, fails from 30%', () => {
    expect(holderConcentrationCheck(0.0002)).toEqual({
      id: 'holder-concentration',
      status: 'pass',
      reason: 'Top 10 holders own 0.02% of supply, pool and burn address excluded.',
    });
    expect(holderConcentrationCheck(0.1).status).toBe('warn');
    expect(holderConcentrationCheck(0.2999).status).toBe('warn');
    expect(holderConcentrationCheck(0.3).status).toBe('fail');
  });

  it('is unknown without a share', () => {
    expect(holderConcentrationCheck(null).status).toBe('unknown');
  });
});

describe('contractCheck', () => {
  it('passes the plain Brew template', () => {
    expect(contractCheck(rsun.contract).status).toBe('pass');
  });

  it('warns when the contract has an owner', () => {
    const check = contractCheck({ codeSize: 3000, ownerFunctions: ['owner()'], riskyFunctions: [] });
    expect(check).toMatchObject({ status: 'warn', reason: 'Contract has an owner: owner().' });
  });

  it('fails on mint, blacklist or tax functions, and names them', () => {
    const check = contractCheck({
      codeSize: 9000,
      ownerFunctions: ['owner()'],
      riskyFunctions: ['mint(address,uint256)', 'blacklist(address)'],
    });
    expect(check.status).toBe('fail');
    expect(check.reason).toContain('mint(address,uint256), blacklist(address)');
  });

  it('is unknown without facts', () => {
    expect(contractCheck(null).status).toBe('unknown');
  });
});

describe('sellSimulationCheck', () => {
  it('passes a round trip that only lost the two pool fees', () => {
    expect(sellSimulationCheck(rsun.sellSimulation)).toEqual({
      id: 'sell-simulation',
      status: 'pass',
      reason: 'A simulated buy and sell went through, returning 98.02% of the BNB spent.',
    });
  });

  it('warns above 5% loss and fails above 20%', () => {
    expect(sellSimulationCheck({ outcome: 'sold', lossBps: 500 }).status).toBe('pass');
    expect(sellSimulationCheck({ outcome: 'sold', lossBps: 501 }).status).toBe('warn');
    expect(sellSimulationCheck({ outcome: 'sold', lossBps: 2001 }).status).toBe('fail');
  });

  it('fails when the sell reverts', () => {
    expect(sellSimulationCheck({ outcome: 'sell-reverted' }).status).toBe('fail');
  });

  it('is unknown, never a pass, when the simulation could not run', () => {
    expect(sellSimulationCheck(null).status).toBe('unknown');
    expect(sellSimulationCheck({ outcome: 'buy-reverted' }).status).toBe('unknown');
    expect(
      sellSimulationCheck({ outcome: 'not-simulated', reason: 'not available for tokens brewed with BREW' }),
    ).toEqual({
      id: 'sell-simulation',
      status: 'unknown',
      reason: 'Sell simulation: Unknown (not available for tokens brewed with BREW).',
    });
  });
});

describe('washActivityCheck', () => {
  it('passes spread-out trading and states the numbers', () => {
    expect(washActivityCheck(rsun.washActivity)).toEqual({
      id: 'wash-activity',
      status: 'pass',
      reason: '144 trades by 58 wallets; the most active wallet made 6% of them.',
    });
  });

  it('warns when one wallet makes over 30% of trades or wallets average over 5 trades', () => {
    expect(washActivityCheck({ trades: 100, wallets: 40, topWalletTrades: 31 }).status).toBe('warn');
    expect(washActivityCheck({ trades: 100, wallets: 10, topWalletTrades: 12 }).status).toBe('warn');
  });

  it('fails when one wallet makes over 60% of trades', () => {
    expect(washActivityCheck({ trades: 100, wallets: 5, topWalletTrades: 61 }).status).toBe('fail');
  });

  it('does not judge a token with only a handful of trades', () => {
    expect(washActivityCheck({ trades: 3, wallets: 1, topWalletTrades: 3 }).status).toBe('pass');
    expect(washActivityCheck({ trades: 0, wallets: 0, topWalletTrades: 0 })).toMatchObject({
      status: 'pass',
      reason: 'No trades indexed yet.',
    });
  });

  it('is unknown without facts', () => {
    expect(washActivityCheck(null).status).toBe('unknown');
  });
});

describe('checksFromFacts with scoreToken', () => {
  it('scores RSUN as Danger, led by the deployer having sold out', () => {
    const score = scoreToken(checksFromFacts(rsun, 0.0002));
    expect(score.level).toBe('danger');
    expect(score.reasons[0]).toMatchObject({ id: 'dev-wallet', status: 'fail' });
    expect(score.reasons).toHaveLength(5);
  });

  it('is Safe only when all five inputs are known and pass', () => {
    const clean: SafetyFacts = {
      ...rsun,
      devWallet: { ...rsun.devWallet!, sold: '0', firstSellSecondsAfterLaunch: null },
    };
    expect(scoreToken(checksFromFacts(clean, 0.0002)).level).toBe('safe');
    expect(scoreToken(checksFromFacts(clean, null)).level).toBe('caution');
    expect(scoreToken(checksFromFacts({ ...clean, sellSimulation: null }, 0.0002)).level).toBe('caution');
  });

  it('is Caution with every input Unknown when the indexer cannot be reached', () => {
    const score = scoreToken(checksFromFacts(null, null));
    expect(score.level).toBe('caution');
    expect(score.reasons.every((check) => check.status === 'unknown')).toBe(true);
  });
});
