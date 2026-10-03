import { describe, expect, it } from 'vitest';

import type { SafetyFacts } from './facts';
import {
  checksFromFacts,
  contractCheck,
  deployerRecordCheck,
  devWalletCheck,
  holderConcentrationCheck,
  launchHoldersCheck,
  originCheck,
  pairAssetCheck,
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
  origin: { factory: 'standard', matchesTemplate: true },
  pairAssets: [{ pairToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', pairSymbol: 'WBNB', kind: 'major' }],
  deployerRecord: {
    deployer: '0x77de6a0ed0ad7479e2e7de553cfe9452438cd8b5',
    historyFrom: 1790828216,
    historyComplete: false,
    earlierLaunchCount: 0,
    earlierLaunches: [],
  },
  // The deployer's own buy in the launch transaction: 11.16% of supply.
  launchHolders: {
    blocks: 3,
    totalSupply: '1000000000000000000000000000',
    bought: '111624980300487585037288067',
    deployerBought: '111624980300487585037288067',
    wallets: 1,
  },
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

  it('leaves earlier launches to the deployer record', () => {
    expect(dev({ sold: '0', otherLaunches: 3 }).reason).toBe('Deployer has not sold any of this token.');
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
    expect(score.reasons).toHaveLength(9);
  });

  it('is Safe only when all nine inputs are known and pass', () => {
    const clean: SafetyFacts = {
      ...rsun,
      devWallet: { ...rsun.devWallet!, sold: '0', firstSellSecondsAfterLaunch: null },
      launchHolders: { ...rsun.launchHolders!, bought: '0', deployerBought: '0', wallets: 0 },
    };
    expect(scoreToken(checksFromFacts(clean, 0.0002)).level).toBe('safe');
    expect(scoreToken(checksFromFacts(clean, null)).level).toBe('caution');
    expect(scoreToken(checksFromFacts({ ...clean, sellSimulation: null }, 0.0002)).level).toBe('caution');
    expect(scoreToken(checksFromFacts({ ...clean, origin: null }, 0.0002)).level).toBe('caution');
    expect(scoreToken(checksFromFacts({ ...clean, deployerRecord: null }, 0.0002)).level).toBe('caution');
  });

  it('is never Safe for a token whose code is not its factory\'s template', () => {
    const clean: SafetyFacts = {
      ...rsun,
      devWallet: { ...rsun.devWallet!, sold: '0', firstSellSecondsAfterLaunch: null },
      launchHolders: { ...rsun.launchHolders!, bought: '0', deployerBought: '0', wallets: 0 },
    };
    const off = { ...clean, origin: { factory: 'standard', matchesTemplate: false } };
    expect(scoreToken(checksFromFacts(off, 0.0002)).level).not.toBe('safe');
  });

  it('is Caution with every input Unknown when the indexer cannot be reached', () => {
    const score = scoreToken(checksFromFacts(null, null));
    expect(score.level).toBe('caution');
    expect(score.reasons.every((check) => check.status === 'unknown')).toBe(true);
  });
});

describe('originCheck', () => {
  it('passes a token whose code is its factory\'s template', () => {
    expect(originCheck(rsun.origin)).toEqual({
      id: 'origin',
      status: 'pass',
      reason: "Launched by Brew's standard factory; its code is the template every token from that factory shares.",
    });
  });

  it('warns when the code differs from the template', () => {
    expect(originCheck({ factory: 'multiPairV1', matchesTemplate: false })).toMatchObject({
      status: 'warn',
      reason: "Launched by Brew's multi-pair v1 factory, but its code differs from the template other tokens from that factory share.",
    });
  });

  it('fails a token from no known Brew factory', () => {
    expect(originCheck({ factory: null, matchesTemplate: null }).status).toBe('fail');
  });

  it('is unknown without a recorded template or without facts', () => {
    expect(originCheck({ factory: 'dividend', matchesTemplate: null }).status).toBe('unknown');
    expect(originCheck(null).status).toBe('unknown');
  });
});

describe('pairAssetCheck', () => {
  it('passes a token brewed with WBNB', () => {
    expect(pairAssetCheck(rsun.pairAssets)).toEqual({ id: 'pair-asset', status: 'pass', reason: 'Brewed with WBNB.' });
  });

  // Real pools: Super Inu (multi-pair v1) and Mystery Stock (multi-pair v2).
  it('warns about a $BREW pool beside a WBNB one', () => {
    expect(
      pairAssetCheck([
        { pairToken: '0xfa6d9b504848606eb9aec04ccc161d169b3f2159', pairSymbol: 'BREW', kind: 'brew' },
        { pairToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', pairSymbol: 'WBNB', kind: 'major' },
      ]),
    ).toEqual({
      id: 'pair-asset',
      status: 'warn',
      reason: 'Liquidity is priced in BREW (the $BREW token), and can lose value with it.',
    });
  });

  it('names a tokenized stock, and lets Cake pass as one of Brew\'s majors', () => {
    expect(
      pairAssetCheck([
        { pairToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', pairSymbol: 'WBNB', kind: 'major' },
        { pairToken: '0x80106cb3ead06659a5ad19df39d9b4733863b9b0', pairSymbol: 'MSFTB', kind: 'tokenized-stock' },
        { pairToken: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', pairSymbol: 'Cake', kind: 'major' },
      ]),
    ).toMatchObject({
      status: 'warn',
      reason: 'Liquidity is priced in MSFTB (a tokenized stock), and can lose value with it.',
    });
  });

  it('warns about another Brew token or an unlisted token', () => {
    expect(
      pairAssetCheck([{ pairToken: '0x8fa39ff32b316e2296630aa05bdd6a4a2e4b7598', pairSymbol: 'MIXUx', kind: 'other' }]),
    ).toMatchObject({ status: 'warn', reason: expect.stringContaining('MIXUx (another token)') });
    expect(
      pairAssetCheck([{ pairToken: '0x06e248c4a57f89cda03db94c04fe2d9b3525b528', pairSymbol: 'SOON', kind: 'brew-token' }]),
    ).toMatchObject({ status: 'warn', reason: expect.stringContaining('SOON (another Brew token)') });
  });

  it('is unknown without facts', () => {
    expect(pairAssetCheck(null).status).toBe('unknown');
    expect(pairAssetCheck([]).status).toBe('unknown');
  });
});

describe('deployerRecordCheck', () => {
  // Real records from the indexer (2026-10-02), history from 2026-10-01 04:16 UTC.
  const history = { historyFrom: 1790828216, historyComplete: false };

  it('passes a first launch, and says over what period', () => {
    expect(deployerRecordCheck(rsun.deployerRecord)).toEqual({
      id: 'deployer-record',
      status: 'pass',
      reason: 'No earlier launches by this deployer since 2026-10-01 04:16 UTC.',
    });
  });

  it('passes earlier launches that did not go badly (CADIS\'s deployer)', () => {
    expect(
      deployerRecordCheck({
        deployer: '0xb4ba779f15621df0f9884c8116dc0789acb4dae5',
        ...history,
        earlierLaunchCount: 3,
        earlierLaunches: [
          { token: '0x050eb95eae026f317a6a4602f87da2daa61a8440', symbol: 'PIXAR', launchedAt: 1790886490, lastToFirstPriceBps: 10000, soldWithinHourBps: 0 },
          { token: '0x2ae4bdf355c9e7240571a07399654f20d5304d65', symbol: 'BOP', launchedAt: 1790885899, lastToFirstPriceBps: 10000, soldWithinHourBps: 0 },
          { token: '0x1cd50645695a8b438d068050ef76ec73f2addce0', symbol: 'CWS', launchedAt: 1790884736, lastToFirstPriceBps: 10000, soldWithinHourBps: 0 },
        ],
      }),
    ).toEqual({
      id: 'deployer-record',
      status: 'pass',
      reason:
        'Deployer has 3 earlier launches since 2026-10-01 04:16 UTC: none fell 90% or more from its first price, and in none did the deployer sell half or more within an hour.',
    });
  });

  it("warns from one launch that went badly (BKA's deployer: two)", () => {
    expect(
      deployerRecordCheck({
        deployer: '0x71cd9e116c36bb7133f731b0bc185413805cc852',
        ...history,
        earlierLaunchCount: 2,
        earlierLaunches: [
          { token: '0x1ed947149d29905d3b51460a149e20bcab8d8361', symbol: 'bstocks', launchedAt: 1790857550, lastToFirstPriceBps: 10030, soldWithinHourBps: 10000 },
          { token: '0xbe215dad3a44e7cac0bd40d6f3d86093a2d8e900', symbol: '雪王币', launchedAt: 1790831412, lastToFirstPriceBps: 10000, soldWithinHourBps: 10000 },
        ],
      }),
    ).toEqual({
      id: 'deployer-record',
      status: 'warn',
      reason:
        'Deployer has 2 earlier launches since 2026-10-01 04:16 UTC: 2 went badly; in 2 the deployer sold half or more within an hour.',
    });
  });

  it("fails from three (Dpots's deployer)", () => {
    const check = deployerRecordCheck({
      deployer: '0x1229580449f8fa3dd59e42c867d29b44491d7f9b',
      ...history,
      earlierLaunchCount: 3,
      earlierLaunches: [
        { token: '0x2d555d297ea9e9c59a963e57f8092ca721bfc9d2', symbol: '韭菜', launchedAt: 1790830717, lastToFirstPriceBps: 9998, soldWithinHourBps: 10000 },
        { token: '0xbf949bcfa119c330f676ec6d5fb0411d4cfde75a', symbol: 'BOB', launchedAt: 1790830312, lastToFirstPriceBps: 9998, soldWithinHourBps: 10000 },
        { token: '0x6ed204eef0651601371ac5b8bd64030ec3828729', symbol: '雪王', launchedAt: 1790829730, lastToFirstPriceBps: 10000, soldWithinHourBps: 10000 },
      ],
    });
    expect(check.status).toBe('fail');
  });

  it('counts a 90% price fall, and says how many launches were examined', () => {
    const check = deployerRecordCheck({
      deployer: '0x1229580449f8fa3dd59e42c867d29b44491d7f9b',
      ...history,
      earlierLaunchCount: 60,
      earlierLaunches: [
        { token: '0x2d555d297ea9e9c59a963e57f8092ca721bfc9d2', symbol: 'A', launchedAt: 1, lastToFirstPriceBps: 1000, soldWithinHourBps: 0 },
        { token: '0xbf949bcfa119c330f676ec6d5fb0411d4cfde75a', symbol: 'B', launchedAt: 1, lastToFirstPriceBps: 1001, soldWithinHourBps: null },
      ],
    });
    expect(check).toEqual({
      id: 'deployer-record',
      status: 'warn',
      reason:
        'Deployer has 60 earlier launches since 2026-10-01 04:16 UTC (newest 2 examined): 1 went badly; 1 fell 90% or more from its first price.',
    });
  });

  it('says when the period is the whole of Brew history, or not recorded', () => {
    const none = { deployer: '0x1', earlierLaunchCount: 0, earlierLaunches: [] };
    expect(deployerRecordCheck({ ...none, historyFrom: 1, historyComplete: true }).reason).toBe(
      'No earlier launches by this deployer in Brew history.',
    );
    expect(deployerRecordCheck({ ...none, historyFrom: null, historyComplete: false }).reason).toBe(
      'No earlier launches by this deployer since the indexer last started.',
    );
  });

  it('is unknown without facts', () => {
    expect(deployerRecordCheck(null).status).toBe('unknown');
  });
});

describe('launchHoldersCheck', () => {
  it("warns on RSUN, where the deployer's own launch buy was 11.2% of supply", () => {
    expect(launchHoldersCheck(rsun.launchHolders)).toEqual({
      id: 'launch-holders',
      status: 'warn',
      reason:
        '11.2% of supply was bought in the launch block and the next 2, by 1 wallet (the deployer: 11.2%). Wallets funded from one source are not detected.',
    });
  });

  it('passes under 10%, warns from 10%, fails from 30%', () => {
    const at = (bought: string) => launchHoldersCheck({ ...rsun.launchHolders!, bought, deployerBought: '0', wallets: 2 });
    expect(at('99999999999999999999999999').status).toBe('pass');
    expect(at('100000000000000000000000000').status).toBe('warn');
    expect(at('300000000000000000000000000').status).toBe('fail');
  });

  it('passes a launch nobody bought into, saying so plainly', () => {
    expect(launchHoldersCheck({ ...rsun.launchHolders!, bought: '0', deployerBought: '0', wallets: 0 })).toMatchObject({
      status: 'pass',
      reason: '0.0% of supply was bought in the launch block and the next 2. Wallets funded from one source are not detected.',
    });
  });

  it('is unknown without facts', () => {
    expect(launchHoldersCheck(null).status).toBe('unknown');
  });
});
