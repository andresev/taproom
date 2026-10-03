import { Hono } from "hono";
import { and, desc, eq, graphql, gte, inArray, isNotNull, or, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { ACTIVITY_LIMIT, activityRequestSchema, type ActivityRow } from "../activity";
import { buildCoverage } from "../coverage";
import { loadEnv } from "../env";
import { safetyRequestSchema, type SafetyFacts } from "../safety";
import { gatherSafetyFacts } from "./safety-facts";

const { pool, token, trade } = schema;
const app = new Hono();

app.use("/graphql", graphql({ db, schema }));

/**
 * Per-token trading totals since a unix time, ranked. Totals are computed here,
 * in SQL, because a long window holds far more trades than a client should
 * download to add up itself.
 */
app.post("/activity", async (c) => {
  const started = Date.now();
  const parsed = activityRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request", fields: parsed.error.issues.map((issue) => issue.path.join(".")) }, 400);
  }
  const { sort, wallets, token: onlyToken } = parsed.data;
  const since = BigInt(parsed.data.since);

  const totals = db
    .select({
      token: trade.token,
      buys: sql<number>`count(*) filter (where ${trade.side} = 'buy')`.as("buys"),
      sells: sql<number>`count(*) filter (where ${trade.side} = 'sell')`.as("sells"),
      bought: sql<string>`coalesce(sum(${trade.pairAmountBaseUnits}) filter (where ${trade.side} = 'buy'), 0)::text`.as(
        "bought",
      ),
      sold: sql<string>`coalesce(sum(${trade.pairAmountBaseUnits}) filter (where ${trade.side} = 'sell'), 0)::text`.as(
        "sold",
      ),
      walletCount: sql<number>`count(distinct ${trade.wallet})`.as("wallet_count"),
      // Only worth listing when the caller narrowed to a handful of followed wallets.
      wallets: (wallets
        ? sql<`0x${string}`[]>`array_agg(distinct ${trade.wallet})`
        : sql<`0x${string}`[]>`array[]::text[]`
      ).as("wallets"),
      pairCount: sql<number>`count(distinct ${trade.pairToken})`.as("pair_count"),
      anyPool: sql<`0x${string}`>`min(${trade.pool})`.as("any_pool"),
      lastTradeAt: sql<string>`max(${trade.blockTime})`.as("last_trade_at"),
    })
    .from(trade)
    .where(
      and(
        gte(trade.blockTime, since),
        wallets ? inArray(trade.wallet, wallets) : undefined,
        onlyToken ? eq(trade.token, onlyToken) : undefined,
      ),
    )
    .groupBy(trade.token)
    .as("totals");

  const launchedInWindow = and(
    gte(token.launchedAt, since),
    wallets ? inArray(token.deployer, wallets) : undefined,
  );
  const hasTrades = isNotNull(totals.token);
  const lastTime = sql<string>`coalesce(${totals.lastTradeAt}, ${token.launchedAt})`;
  const tradeCount = sql`coalesce(${totals.buys}, 0) + coalesce(${totals.sells}, 0)`;

  const rows = await db
    .select({
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      deployer: token.deployer,
      launchedAt: token.launchedAt,
      buys: totals.buys,
      sells: totals.sells,
      bought: totals.bought,
      sold: totals.sold,
      walletCount: totals.walletCount,
      wallets: totals.wallets,
      pairCount: totals.pairCount,
      pairSymbol: pool.pairSymbol,
      pairDecimals: pool.pairDecimals,
      lastTime,
    })
    .from(token)
    .leftJoin(totals, eq(totals.token, token.address))
    .leftJoin(pool, eq(pool.address, totals.anyPool))
    .where(
      and(
        onlyToken ? eq(token.address, onlyToken) : undefined,
        sort === "launches"
          ? and(gte(token.launchedAt, since), or(hasTrades, launchedInWindow))
          : or(hasTrades, launchedInWindow),
      ),
    )
    .orderBy(
      ...(sort === "trending"
        ? [desc(sql`coalesce(${totals.walletCount}, 0)`), desc(tradeCount), desc(lastTime)]
        : sort === "launches"
          ? [desc(token.launchedAt)]
          : [desc(lastTime)]),
    )
    .limit(ACTIVITY_LIMIT);

  const items: ActivityRow[] = rows.map((row) => ({
    tokenAddress: row.tokenAddress,
    tokenSymbol: row.tokenSymbol,
    tokenName: row.tokenName,
    buys: Number(row.buys ?? 0),
    sells: Number(row.sells ?? 0),
    volume:
      Number(row.pairCount ?? 0) === 1 && row.pairDecimals !== null
        ? {
            pairSymbol: row.pairSymbol,
            pairDecimals: row.pairDecimals,
            bought: row.bought ?? "0",
            sold: row.sold ?? "0",
          }
        : null,
    walletCount: Number(row.walletCount ?? 0),
    wallets: row.wallets ?? [],
    launch: row.launchedAt >= since ? { wallet: row.deployer, time: Number(row.launchedAt) } : null,
    lastTime: Number(row.lastTime),
  }));

  console.log(
    JSON.stringify({
      service: "indexer",
      event: "activity",
      sort,
      since: parsed.data.since,
      wallets: wallets?.length ?? null,
      token: onlyToken ?? null,
      rows: items.length,
      ms: Date.now() - started,
    }),
  );
  return c.json({ items });
});

/**
 * Which factories are indexed and from which block. A record built from the
 * index is only as complete as this says: callers that present history (trader
 * records, a deployer's earlier launches) state the period from it. It does not
 * say how far the sync has got; Ponder's own /ready and /status do.
 */
const coverage = buildCoverage(loadEnv().START_BLOCK);
app.get("/coverage", (c) => c.json(coverage));

/** How long one token's facts are reused. The simulation is the costly part. */
const SAFETY_CACHE_MS = 60_000;
const safetyCache = new Map<string, { at: number; facts: SafetyFacts }>();

/**
 * The facts behind a token's safety score: dev-wallet trades, a bytecode scan, a
 * simulated buy and sell, and trade concentration. Facts only; the app's pure
 * rules turn them into Safe, Caution or Danger with reasons.
 */
app.post("/safety", async (c) => {
  const started = Date.now();
  const parsed = safetyRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { token: tokenAddress } = parsed.data;

  const cached = safetyCache.get(tokenAddress);
  if (cached && started - cached.at < SAFETY_CACHE_MS) return c.json(cached.facts);

  const facts = await gatherSafetyFacts(tokenAddress);
  if (!facts) return c.json({ error: "Token not indexed" }, 404);
  safetyCache.set(tokenAddress, { at: started, facts });

  console.log(
    JSON.stringify({
      service: "indexer",
      event: "safety",
      token: tokenAddress,
      sellSimulation: facts.sellSimulation?.outcome ?? null,
      ms: Date.now() - started,
    }),
  );
  return c.json(facts);
});

export default app;
