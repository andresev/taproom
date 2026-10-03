/**
 * The facts the indexer's POST /safety route returns (indexer/src/safety.ts).
 * A fact that could not be fetched is `null`. Token amounts are base-unit
 * integers as strings.
 */
export interface SafetyFacts {
  token: string;
  devWallet: {
    deployer: string;
    bought: string;
    sold: string;
    /** Seconds from launch to the deployer's first sell; null if they have not sold. */
    firstSellSecondsAfterLaunch: number | null;
    otherLaunches: number;
  } | null;
  contract: {
    codeSize: number;
    ownerFunctions: string[];
    riskyFunctions: string[];
  } | null;
  sellSimulation:
    | { outcome: 'sold'; lossBps: number }
    | { outcome: 'sell-reverted' }
    | { outcome: 'buy-reverted' }
    | { outcome: 'not-simulated'; reason: string }
    | null;
  washActivity: {
    trades: number;
    wallets: number;
    topWalletTrades: number;
  } | null;
  /** The ten largest holders' share of supply, pools and burn address left out, in basis points. */
  holders: { topTenShareBps: number } | null;
  origin: {
    /** The launch factory's name ("standard", "multiPairV1", …); null if not a factory Taproom knows. */
    factory: string | null;
    matchesTemplate: boolean | null;
  } | null;
  pairAssets: {
    pairToken: string;
    pairSymbol: string | null;
    kind: 'major' | 'brew' | 'tokenized-stock' | 'gold' | 'brew-token' | 'other';
  }[] | null;
  deployerRecord: {
    deployer: string;
    historyFrom: number | null;
    historyComplete: boolean;
    earlierLaunchCount: number;
    earlierLaunches: {
      token: string;
      symbol: string | null;
      launchedAt: number;
      lastToFirstPriceBps: number | null;
      soldWithinHourBps: number | null;
    }[];
  } | null;
  launchHolders: {
    blocks: number;
    totalSupply: string;
    bought: string;
    deployerBought: string;
    wallets: number;
  } | null;
}
