import { ADDRESSES } from "@repo/shared";
import { and, count, countDistinct, eq, ne, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { createPublicClient, http, parseEther, type PublicClient } from "viem";
import { bsc } from "viem/chains";

import { erc20TradeAbi } from "../../abis/erc20";
import { pancakeSwapRouterAbi } from "../../abis/pancake-swap-router";
import { loadEnv } from "../env";
import { roundTripLossBps, scanBytecode, type SafetyFacts } from "../safety";

// Lives under src/api because it reads the database through `ponder:api`, which
// Ponder only allows API files to import.
const { pool, token, trade } = schema;

/** Small on purpose: Brew pools are thin, and a larger test buy would lose to price impact, not to the token. */
const SIMULATED_BUY_WEI = parseEther("0.0001");
/** A throwaway address that only ever exists inside the simulation. */
const SIMULATED_TRADER = "0x000000000000000000000000000000000000c0de";

let client: PublicClient | undefined;
/** Created on first use, with the same server-side RPC the indexer syncs from. */
function rpc(): PublicClient {
  client ??= createPublicClient({ chain: bsc, transport: http(loadEnv().BSC_RPC_URL) });
  return client;
}

type TokenRow = typeof token.$inferSelect;
type PoolRow = typeof pool.$inferSelect;

async function devWalletFacts(row: TokenRow): Promise<SafetyFacts["devWallet"]> {
  const [totals] = await db
    .select({
      bought: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'buy'), 0)::text`,
      sold: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'sell'), 0)::text`,
      firstSellAt: sql<string | null>`min(${trade.blockTime}) filter (where ${trade.side} = 'sell')`,
    })
    .from(trade)
    .where(and(eq(trade.token, row.address), eq(trade.wallet, row.deployer)));
  const [others] = await db
    .select({ launches: count() })
    .from(token)
    .where(and(eq(token.deployer, row.deployer), ne(token.address, row.address)));

  const firstSellAt = totals?.firstSellAt ?? null;
  return {
    deployer: row.deployer,
    bought: totals?.bought ?? "0",
    sold: totals?.sold ?? "0",
    firstSellSecondsAfterLaunch: firstSellAt === null ? null : Math.max(0, Number(BigInt(firstSellAt) - row.launchedAt)),
    otherLaunches: Number(others?.launches ?? 0),
  };
}

async function washFacts(row: TokenRow): Promise<SafetyFacts["washActivity"]> {
  const [totals] = await db
    .select({ trades: count(), wallets: countDistinct(trade.wallet) })
    .from(trade)
    .where(eq(trade.token, row.address));
  const perWallet = db
    .select({ trades: count().as("wallet_trades") })
    .from(trade)
    .where(eq(trade.token, row.address))
    .groupBy(trade.wallet)
    .as("per_wallet");
  const [top] = await db.select({ most: sql<number>`coalesce(max(${perWallet.trades}), 0)` }).from(perWallet);

  return {
    trades: Number(totals?.trades ?? 0),
    wallets: Number(totals?.wallets ?? 0),
    topWalletTrades: Number(top?.most ?? 0),
  };
}

async function contractFacts(row: TokenRow): Promise<SafetyFacts["contract"]> {
  const code = await rpc().getCode({ address: row.address });
  if (!code || code === "0x") return null;
  return { codeSize: (code.length - 2) / 2, ...scanBytecode(code) };
}

/**
 * Buys a little of the token with BNB and sells it straight back, inside one
 * simulated block (`eth_simulateV1`). Nothing is sent and no real account is
 * involved. If the sell reverts, or returns far less than two pool fees would
 * explain, a real buyer would be stuck or taxed the same way.
 */
async function sellSimulationFacts(row: TokenRow, pools: PoolRow[]): Promise<SafetyFacts["sellSimulation"]> {
  const bnbPool = pools.find((item) => item.pairToken === ADDRESSES.wbnb);
  if (!bnbPool) {
    const [first] = pools;
    return {
      outcome: "not-simulated",
      reason: `not available for tokens brewed with ${first?.pairSymbol ?? "an asset other than BNB"}`,
    };
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const swap = (tokenIn: `0x${string}`, tokenOut: `0x${string}`, amountIn: bigint) =>
    ({
      to: ADDRESSES.pancakeV3SwapRouter,
      abi: pancakeSwapRouterAbi,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          fee: bnbPool.fee,
          recipient: SIMULATED_TRADER,
          deadline,
          amountIn,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }) as const;
  const buy = { ...swap(ADDRESSES.wbnb, row.address, SIMULATED_BUY_WEI), value: SIMULATED_BUY_WEI };
  const stateOverrides = [{ address: SIMULATED_TRADER, balance: parseEther("1") }] as const;

  // First pass: buy, and read what actually arrived (a transfer tax would make it less than quoted).
  const first = await rpc().simulateCalls({
    account: SIMULATED_TRADER,
    stateOverrides: [...stateOverrides],
    calls: [buy, { to: row.address, abi: erc20TradeAbi, functionName: "balanceOf", args: [SIMULATED_TRADER] }],
  });
  const [buyResult, balanceResult] = first.results;
  if (buyResult.status !== "success" || balanceResult.status !== "success") return { outcome: "buy-reverted" };
  const received = balanceResult.result;
  if (received <= 0n) return { outcome: "sell-reverted" };

  // Second pass: the same buy, then approve and sell everything that arrived.
  const second = await rpc().simulateCalls({
    account: SIMULATED_TRADER,
    stateOverrides: [...stateOverrides],
    calls: [
      buy,
      {
        to: row.address,
        abi: erc20TradeAbi,
        functionName: "approve",
        args: [ADDRESSES.pancakeV3SwapRouter, received],
      },
      swap(row.address, ADDRESSES.wbnb, received),
    ],
  });
  const sell = second.results[2];
  if (sell.status !== "success") return { outcome: "sell-reverted" };
  return { outcome: "sold", lossBps: roundTripLossBps(SIMULATED_BUY_WEI, sell.result) };
}

/** Runs one fact-gatherer; a failure becomes `null` (Unknown) and is logged, never thrown. */
async function orUnknown<T>(name: string, tokenAddress: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    console.log(
      JSON.stringify({
        service: "indexer",
        event: "safety_fact_failed",
        fact: name,
        token: tokenAddress,
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      }),
    );
    return null;
  }
}

/** Every fact for one token, or null if the indexer does not know the token. */
export async function gatherSafetyFacts(tokenAddress: `0x${string}`): Promise<SafetyFacts | null> {
  const [row] = await db.select().from(token).where(eq(token.address, tokenAddress)).limit(1);
  if (!row) return null;
  const pools = await db.select().from(pool).where(eq(pool.token, tokenAddress));

  const [devWallet, contract, sellSimulation, washActivity] = await Promise.all([
    orUnknown("dev-wallet", tokenAddress, () => devWalletFacts(row)),
    orUnknown("contract", tokenAddress, () => contractFacts(row)),
    orUnknown("sell-simulation", tokenAddress, () => sellSimulationFacts(row, pools)),
    orUnknown("wash-activity", tokenAddress, () => washFacts(row)),
  ]);
  return { token: tokenAddress, devWallet, contract, sellSimulation, washActivity };
}
