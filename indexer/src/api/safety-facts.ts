import { ADDRESSES, knownPairAsset } from "@repo/shared";
import { and, asc, between, count, countDistinct, desc, eq, inArray, lt, ne, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { parseEther } from "viem";

import { erc20TradeAbi } from "../../abis/erc20";
import { pancakeSwapRouterAbi } from "../../abis/pancake-swap-router";
import { buildCoverage } from "../coverage";
import { loadEnv } from "../env";
import { FACTORIES } from "../factories";
import {
  DEPLOYER_RECORD_LIMIT,
  LAUNCH_BLOCKS,
  lastToFirstPriceBps,
  matchesTemplate,
  roundTripLossBps,
  scanBytecode,
  shareBps,
  type SafetyFacts,
} from "../safety";
import { blockTime, rpc } from "./rpc";

// Lives under src/api because it reads the database through `ponder:api`, which
// Ponder only allows API files to import.
const { pool, token, trade } = schema;

/** Small on purpose: Brew pools are thin, and a larger test buy would lose to price impact, not to the token. */
const SIMULATED_BUY_WEI = parseEther("0.0001");
/** A throwaway address that only ever exists inside the simulation. */
const SIMULATED_TRADER = "0x000000000000000000000000000000000000c0de";

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

/** The token's runtime code, or null if it has none. */
async function runtimeCode(row: TokenRow): Promise<`0x${string}` | null> {
  const code = await rpc().getCode({ address: row.address });
  return code && code !== "0x" ? code : null;
}

function contractFacts(code: `0x${string}` | null): SafetyFacts["contract"] {
  if (!code) return null;
  return { codeSize: (code.length - 2) / 2, ...scanBytecode(code) };
}

/** Which known factory launched the token, and whether its code is that factory's template. */
function originFacts(row: TokenRow, code: `0x${string}` | null): SafetyFacts["origin"] {
  const factory = FACTORIES.find((item) => item.address === row.factory);
  if (!factory) return { factory: null, matchesTemplate: null };
  if (!factory.template) return { factory: factory.name, matchesTemplate: null };
  if (!code) return null;
  return { factory: factory.name, matchesTemplate: matchesTemplate(code, factory.template) };
}

/** Each pool's pair asset: one of Brew's listed assets, another indexed Brew token, or something else. */
async function pairAssetFacts(pools: PoolRow[]): Promise<SafetyFacts["pairAssets"]> {
  if (pools.length === 0) return null;
  const pairTokens = [...new Set(pools.map((item) => item.pairToken))];
  const brewTokens = await db
    .select({ address: token.address })
    .from(token)
    .where(inArray(token.address, pairTokens));
  const isBrewToken = new Set(brewTokens.map((item) => item.address));

  return pairTokens.map((pairToken) => {
    const known = knownPairAsset(pairToken);
    const pairSymbol = pools.find((item) => item.pairToken === pairToken)?.pairSymbol ?? null;
    return {
      pairToken,
      pairSymbol,
      kind: known ? known.kind : isBrewToken.has(pairToken) ? "brew-token" : "other",
    };
  });
}

/** Where the indexed history starts, for stating the period a deployer record covers. */
const historyCoverage = buildCoverage(loadEnv().START_BLOCK);

/**
 * The deployer's earlier launches, newest first, and for each: how the price at
 * its last indexed trade compares with its first, and how much of what the
 * deployer bought they sold within an hour.
 */
async function deployerRecordFacts(row: TokenRow): Promise<SafetyFacts["deployerRecord"]> {
  const earlier = and(eq(token.deployer, row.deployer), lt(token.launchedAt, row.launchedAt));
  const [countRow] = await db.select({ launches: count() }).from(token).where(earlier);
  const launches = await db
    .select({ address: token.address, symbol: token.symbol, launchedAt: token.launchedAt })
    .from(token)
    .where(earlier)
    .orderBy(desc(token.launchedAt))
    .limit(DEPLOYER_RECORD_LIMIT);

  const starts = historyCoverage.factories.filter((item) => item.indexed).map((item) => item.fromBlock);
  const firstBlock = starts.every((block) => block !== null) ? Math.min(...(starts as number[])) : null;
  const base = {
    deployer: row.deployer,
    historyFrom: firstBlock === null ? null : await blockTime(firstBlock),
    historyComplete: historyCoverage.factories.filter((item) => item.indexed).every((item) => item.complete),
    earlierLaunchCount: Number(countRow?.launches ?? 0),
  };
  if (launches.length === 0) return { ...base, earlierLaunches: [] };

  const tokens = launches.map((item) => item.address);
  // The first trade of each token, which fixes the pool it is priced in, then
  // the last trade in each of its pools.
  const firstTrades = await db
    .selectDistinctOn([trade.token], { token: trade.token, pool: trade.pool, sqrtPriceX96: trade.sqrtPriceX96 })
    .from(trade)
    .where(inArray(trade.token, tokens))
    .orderBy(trade.token, asc(trade.blockNumber), asc(trade.logIndex));
  const lastTrades = await db
    .selectDistinctOn([trade.token, trade.pool], {
      token: trade.token,
      pool: trade.pool,
      sqrtPriceX96: trade.sqrtPriceX96,
      tokenIsToken0: pool.tokenIsToken0,
    })
    .from(trade)
    .innerJoin(pool, eq(pool.address, trade.pool))
    .where(inArray(trade.token, tokens))
    .orderBy(trade.token, trade.pool, desc(trade.blockNumber), desc(trade.logIndex));
  const deployerTrades = await db
    .select({
      token: trade.token,
      bought: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'buy'), 0)::text`,
      soldWithinHour: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'sell' and ${trade.blockTime} <= ${token.launchedAt} + 3600), 0)::text`,
    })
    .from(trade)
    .innerJoin(token, eq(token.address, trade.token))
    .where(and(eq(trade.wallet, row.deployer), inArray(trade.token, tokens)))
    .groupBy(trade.token);

  return {
    ...base,
    earlierLaunches: launches.map((launch) => {
      const first = firstTrades.find((item) => item.token === launch.address);
      const last = first && lastTrades.find((item) => item.token === launch.address && item.pool === first.pool);
      const own = deployerTrades.find((item) => item.token === launch.address);
      return {
        token: launch.address,
        symbol: launch.symbol,
        launchedAt: Number(launch.launchedAt),
        lastToFirstPriceBps:
          first && last && first.sqrtPriceX96 > 0n && last.sqrtPriceX96 > 0n
            ? lastToFirstPriceBps(first.sqrtPriceX96, last.sqrtPriceX96, last.tokenIsToken0)
            : null,
        soldWithinHourBps: own ? shareBps(BigInt(own.soldWithinHour), BigInt(own.bought)) : null,
      };
    }),
  };
}

/**
 * What was bought in the block the token's first pool was created and the next
 * two, and by how many wallets. That block is the launch block, except for a
 * multi-pair v2 launch whose first pool came later.
 */
async function launchHolderFacts(row: TokenRow, pools: PoolRow[]): Promise<SafetyFacts["launchHolders"]> {
  if (pools.length === 0) return null;
  const firstBlock = pools.reduce((min, item) => (item.createdBlock < min ? item.createdBlock : min), pools[0]!.createdBlock);
  const [totals] = await db
    .select({
      bought: sql<string>`coalesce(sum(${trade.amountBaseUnits}), 0)::text`,
      deployerBought: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.wallet} = ${row.deployer}), 0)::text`,
      wallets: countDistinct(trade.wallet),
    })
    .from(trade)
    .where(
      and(
        eq(trade.token, row.address),
        eq(trade.side, "buy"),
        between(trade.blockNumber, firstBlock, firstBlock + BigInt(LAUNCH_BLOCKS - 1)),
      ),
    );
  return {
    blocks: LAUNCH_BLOCKS,
    totalSupply: row.totalSupply.toString(),
    bought: totals?.bought ?? "0",
    deployerBought: totals?.deployerBought ?? "0",
    wallets: Number(totals?.wallets ?? 0),
  };
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

  // Read once: the contract scan and the template match both use it. A failed
  // read leaves both Unknown.
  const code = await orUnknown("code", tokenAddress, () => runtimeCode(row));

  const [devWallet, sellSimulation, washActivity, pairAssets, deployerRecord, launchHolders] = await Promise.all([
    orUnknown("dev-wallet", tokenAddress, () => devWalletFacts(row)),
    orUnknown("sell-simulation", tokenAddress, () => sellSimulationFacts(row, pools)),
    orUnknown("wash-activity", tokenAddress, () => washFacts(row)),
    orUnknown("pair-assets", tokenAddress, () => pairAssetFacts(pools)),
    orUnknown("deployer-record", tokenAddress, () => deployerRecordFacts(row)),
    orUnknown("launch-holders", tokenAddress, () => launchHolderFacts(row, pools)),
  ]);
  return {
    token: tokenAddress,
    devWallet,
    contract: contractFacts(code),
    sellSimulation,
    washActivity,
    origin: originFacts(row, code),
    pairAssets,
    deployerRecord,
    launchHolders,
  };
}
