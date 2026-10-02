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
}
