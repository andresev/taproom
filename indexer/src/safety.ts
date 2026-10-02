import { toFunctionSelector } from "viem";
import { z } from "zod";

/**
 * Facts for a token's safety score. This file holds only the pure parts: the
 * request and response shapes, the bytecode scan and the loss calculation. The
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
