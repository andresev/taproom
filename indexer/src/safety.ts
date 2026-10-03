import type { PairAssetKind } from "@repo/shared";
import { keccak256, toFunctionSelector } from "viem";
import { z } from "zod";

/**
 * Facts for a token's safety score. This file holds only the pure parts: the
 * request and response shapes, the bytecode scan, the template match, the price
 * change and the loss calculation. The
 * route in api/index.ts gathers the facts; the app turns them into a score
 * (app/src/features/safety/rules.ts). Nothing here judges a token.
 */

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase() as `0x${string}`);

export const safetyRequestSchema = z.object({ token: address });

/** A fact that could not be fetched is `null`, which the app scores as Unknown, never as safe. */
export interface SafetyFacts {
  token: `0x${string}`;
  devWallet: {
    deployer: `0x${string}`;
    /** Token base units the deployer bought and sold through the pool, as strings. */
    bought: string;
    sold: string;
    /** Seconds from launch to the deployer's first sell; null if they have not sold. */
    firstSellSecondsAfterLaunch: number | null;
    /** Other tokens this wallet launched, within the indexed history. */
    otherLaunches: number;
  } | null;
  contract: {
    codeSize: number;
    /** Signatures found in the bytecode, for example "owner()". */
    ownerFunctions: string[];
    riskyFunctions: string[];
  } | null;
  sellSimulation:
    | { outcome: "sold"; lossBps: number }
    | { outcome: "sell-reverted" }
    | { outcome: "buy-reverted" }
    /** Not attempted: the reason is shown as-is. */
    | { outcome: "not-simulated"; reason: string }
    | null;
  washActivity: {
    trades: number;
    wallets: number;
    /** Trades made by the single most active wallet. */
    topWalletTrades: number;
  } | null;
  /** The ten largest holders' share of supply, the token's pools and the burn address left out. */
  holders: {
    /** Basis points of total supply: 1,420 is 14.2%. */
    topTenShareBps: number;
  } | null;
  /** Which factory launched the token, and whether its code is that factory's template (docs/0014). */
  origin: {
    /** The indexed factory's name; null when the token's factory is not one Tapped knows. */
    factory: string | null;
    /** Null when there is no recorded template for that factory. */
    matchesTemplate: boolean | null;
  } | null;
  /** What each of the token's pools is brewed with. */
  pairAssets: {
    pairToken: `0x${string}`;
    pairSymbol: string | null;
    /** From Brew's own list, or "brew-token" for another indexed Brew token, or "other". */
    kind: PairAssetKind | "brew-token" | "other";
  }[] | null;
  /** The deployer's earlier Brew launches and how each went, within the indexed history. */
  deployerRecord: {
    deployer: `0x${string}`;
    /** Unix seconds the indexed history starts; null when that is not recorded. */
    historyFrom: number | null;
    /** True when the history reaches back to every indexed factory's deployment. */
    historyComplete: boolean;
    /** All earlier indexed launches by this deployer. */
    earlierLaunchCount: number;
    /** The newest of them, up to DEPLOYER_RECORD_LIMIT. */
    earlierLaunches: {
      token: `0x${string}`;
      symbol: string | null;
      launchedAt: number;
      /** Price at the last indexed trade over price at the first, in basis points; null with no trades. */
      lastToFirstPriceBps: number | null;
      /** Share of what the deployer bought that they sold within an hour of launch, in basis points; null if they bought none. */
      soldWithinHourBps: number | null;
    }[];
  } | null;
  /** Buys in the launch block and the next two (docs/0014). */
  launchHolders: {
    blocks: number;
    totalSupply: string;
    /** Token base units bought in those blocks, by anyone, as strings. */
    bought: string;
    deployerBought: string;
    wallets: number;
  } | null;
}

/** The conventional burn address. Brew sends the token side of its trading fee here. */
export const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";

/**
 * The share of `totalSupply` held by the ten largest of `balances`, in basis
 * points. `balances` must already leave out the pools and the burn address.
 * Null when the supply is zero.
 */
export function topTenShareBps(balances: bigint[], totalSupply: bigint): number | null {
  const held = [...balances]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .slice(0, 10)
    .reduce((total, balance) => total + balance, 0n);
  return shareBps(held, totalSupply);
}

/** How many of a deployer's earlier launches are examined, newest first. */
export const DEPLOYER_RECORD_LIMIT = 50;
/** The launch block and the next two. BSC blocks are under half a second apart. */
export const LAUNCH_BLOCKS = 3;

/**
 * Whether `code` is `template` with only the deployer's address changed. Every
 * token from a Brew factory carries its deployer's address at one fixed place in
 * its code; with those 20 bytes set to zero, the rest must hash to the template.
 */
export function matchesTemplate(
  code: `0x${string}`,
  template: { codeSize: number; deployerOffset: number; hash: `0x${string}` },
): boolean {
  const hex = code.slice(2).toLowerCase();
  if (hex.length !== template.codeSize * 2) return false;
  const start = template.deployerOffset * 2;
  const masked = `0x${hex.slice(0, start)}${"0".repeat(40)}${hex.slice(start + 40)}` as const;
  return keccak256(masked) === template.hash;
}

/**
 * The token's price at its last trade over its price at its first, in basis
 * points, from the pool's sqrtPriceX96 after each trade. 10,000 is unchanged;
 * 1,000 is a 90% fall. Capped so a huge rise still fits in a number.
 */
export function lastToFirstPriceBps(firstSqrtPriceX96: bigint, lastSqrtPriceX96: bigint, tokenIsToken0: boolean): number {
  if (firstSqrtPriceX96 <= 0n || lastSqrtPriceX96 <= 0n) throw new RangeError("sqrtPriceX96 must be positive");
  // A pool's price is token1 per token0, the square of sqrtPriceX96. For a token
  // that is token1, its own price is the inverse.
  const [numerator, denominator] = tokenIsToken0
    ? [lastSqrtPriceX96, firstSqrtPriceX96]
    : [firstSqrtPriceX96, lastSqrtPriceX96];
  const bps = (numerator * numerator * 10_000n) / (denominator * denominator);
  return bps > 1_000_000_000n ? 1_000_000_000 : Number(bps);
}

/** `part` over `whole` in basis points, or null when `whole` is zero. */
export function shareBps(part: bigint, whole: bigint): number | null {
  if (whole <= 0n) return null;
  return Number((part * 10_000n) / whole);
}

/** Functions that let an owner exist at all. Not harmful alone, but worth stating. */
const OWNER_FUNCTIONS = ["owner()", "transferOwnership(address)", "renounceOwnership()"];

/** Functions that let someone create supply, block holders, or change what trading costs. */
const RISKY_FUNCTIONS = [
  "mint(address,uint256)",
  "mint(uint256)",
  "blacklist(address)",
  "addToBlacklist(address)",
  "setBlacklist(address,bool)",
  "blacklistAddress(address,bool)",
  "setFee(uint256)",
  "setFees(uint256,uint256)",
  "setTax(uint256)",
  "setTaxes(uint256,uint256)",
  "setBuyTax(uint256)",
  "setSellTax(uint256)",
  "setMaxTxAmount(uint256)",
  "setTradingEnabled(bool)",
  "pause()",
];

/**
 * Which of the listed functions a contract's runtime bytecode dispatches to.
 * A function is counted when its 4-byte selector appears as a PUSH4 operand,
 * which is how Solidity's dispatcher compares it. A heuristic: a proxy or an
 * unusual compiler would hide functions from it.
 */
export function scanBytecode(code: `0x${string}`): { ownerFunctions: string[]; riskyFunctions: string[] } {
  const hex = code.toLowerCase();
  const has = (signature: string) => hex.includes(`63${toFunctionSelector(signature).slice(2)}`);
  return { ownerFunctions: OWNER_FUNCTIONS.filter(has), riskyFunctions: RISKY_FUNCTIONS.filter(has) };
}

/** Share of `amountIn` not returned by buying then selling, in basis points, never negative. */
export function roundTripLossBps(amountIn: bigint, amountBack: bigint): number {
  if (amountIn <= 0n) throw new RangeError("amountIn must be positive");
  if (amountBack >= amountIn) return 0;
  return Number(((amountIn - amountBack) * 10_000n) / amountIn);
}
