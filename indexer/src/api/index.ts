import { Hono } from "hono";
import { and, desc, eq, graphql, gte, inArray, isNotNull, or, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { ACTIVITY_LIMIT, activityRequestSchema, type ActivityRow } from "../activity";
import { buildReceipt, quoteAtSpot, type ReceiptTradeRow } from "@repo/shared";

import { erc20SupplyAbi } from "../../abis/erc20";
import { pancakeV3PoolSlot0Abi } from "../../abis/pancake-v3-pool";
import { buildCoverage, withBlockTimes } from "../coverage";
import { loadEnv } from "../env";
import { renderNoReceiptPage, renderReceiptPage, TRADE_ID } from "../receipt-page";
import { imageFromCode, imageRefFromMetadata, sniffImageType } from "../token-image";
import { recordRequestSchema, toPositions, type LegRow, type RecordResponse, type TokenInfo } from "../record";
import { safetyRequestSchema, type SafetyFacts } from "../safety";
import { blockTime, rpc } from "./rpc";
import { gatherSafetyFacts } from "./safety-facts";

const { holder, pool, token, trade } = schema;
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

  // The newest trade of each listed token, by the same wallets and in the same window.
  const tokenAddresses = rows.map((row) => row.tokenAddress);
  const latestTrades = tokenAddresses.length
    ? await db
        .selectDistinctOn([trade.token], {
          token: trade.token,
          wallet: trade.wallet,
          side: trade.side,
          pairAmount: trade.pairAmountBaseUnits,
          time: trade.blockTime,
          pairSymbol: pool.pairSymbol,
          pairDecimals: pool.pairDecimals,
        })
        .from(trade)
        .innerJoin(pool, eq(pool.address, trade.pool))
        .where(
          and(
            inArray(trade.token, tokenAddresses),
            gte(trade.blockTime, since),
            wallets ? inArray(trade.wallet, wallets) : undefined,
          ),
        )
        .orderBy(trade.token, desc(trade.blockTime), desc(trade.logIndex))
    : [];
  const latestByToken = new Map(latestTrades.map((item) => [item.token, item]));

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
    latest: ((item) =>
      item
        ? {
            wallet: item.wallet,
            side: item.side,
            pairAmount: item.pairAmount.toString(),
            pairSymbol: item.pairSymbol,
            pairDecimals: item.pairDecimals,
            time: Number(item.time),
          }
        : null)(latestByToken.get(row.tokenAddress)),
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
app.get("/coverage", async (c) => {
  // A start block whose time cannot be read is left out: the response says the
  // time is unknown rather than guessing it.
  const blocks = [...new Set(coverage.factories.map((factory) => factory.fromBlock))].filter(
    (block): block is number => block !== null,
  );
  const times = new Map<number, number>();
  await Promise.all(
    blocks.map(async (block) => {
      const time = await blockTime(block);
      if (time !== null) times.set(block, time);
    }),
  );
  return c.json(withBlockTimes(coverage, times));
});

/**
 * A wallet's indexed trades, added up per token and pair asset, with its current
 * balance of each token. Facts only: the record maths (open or closed, result,
 * totals) is in @repo/shared and runs in the app.
 */
app.post("/record", async (c) => {
  const started = Date.now();
  const parsed = recordRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { wallet } = parsed.data;

  const legs: LegRow[] = await db
    .select({
      token: trade.token,
      pairToken: trade.pairToken,
      pairSymbol: sql<string | null>`min(${pool.pairSymbol})`,
      pairDecimals: sql<number>`min(${pool.pairDecimals})`,
      buys: sql<number>`count(*) filter (where ${trade.side} = 'buy')`,
      sells: sql<number>`count(*) filter (where ${trade.side} = 'sell')`,
      tokensBought: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'buy'), 0)::text`,
      tokensSold: sql<string>`coalesce(sum(${trade.amountBaseUnits}) filter (where ${trade.side} = 'sell'), 0)::text`,
      paid: sql<string>`coalesce(sum(${trade.pairAmountBaseUnits}) filter (where ${trade.side} = 'buy'), 0)::text`,
      received: sql<string>`coalesce(sum(${trade.pairAmountBaseUnits}) filter (where ${trade.side} = 'sell'), 0)::text`,
      firstTradeAt: sql<string>`min(${trade.blockTime})::text`,
      lastTradeAt: sql<string>`max(${trade.blockTime})::text`,
    })
    .from(trade)
    .innerJoin(pool, eq(pool.address, trade.pool))
    .where(eq(trade.wallet, wallet))
    .groupBy(trade.token, trade.pairToken);

  const tokenAddresses = [...new Set(legs.map((leg) => leg.token))];
  const [tokenRows, holderRows] = tokenAddresses.length
    ? await Promise.all([
        db
          .select({ address: token.address, symbol: token.symbol, name: token.name, decimals: token.decimals })
          .from(token)
          .where(inArray(token.address, tokenAddresses)),
        db
          .select({ token: holder.token, balance: holder.balance })
          .from(holder)
          .where(and(eq(holder.holder, wallet), inArray(holder.token, tokenAddresses))),
      ])
    : [[], []];

  const tokens = new Map<`0x${string}`, TokenInfo>(tokenRows.map((row) => [row.address, row]));
  const balances = new Map<`0x${string}`, string>(holderRows.map((row) => [row.token, row.balance.toString()]));
  const { positions, truncated } = toPositions(legs, tokens, balances);
  const response: RecordResponse = { wallet, positions, truncated };

  console.log(
    JSON.stringify({
      service: "indexer",
      event: "record",
      wallet,
      positions: positions.length,
      truncated,
      ms: Date.now() - started,
    }),
  );
  return c.json(response);
});

/** The pool's market cap now, in pair-asset base units, or null if the read fails. */
async function currentMarketCap(row: ReceiptTradeRow): Promise<bigint | null> {
  if (!row.tokenInfo || !row.poolInfo) return null;
  try {
    const [slot0, supply] = await rpc().multicall({
      allowFailure: true,
      contracts: [
        { address: row.poolInfo.address as `0x${string}`, abi: pancakeV3PoolSlot0Abi, functionName: "slot0" },
        { address: row.tokenInfo.address as `0x${string}`, abi: erc20SupplyAbi, functionName: "totalSupply" },
      ],
    });
    if (slot0.status !== "success" || supply.status !== "success" || slot0.result[0] <= 0n) return null;
    return quoteAtSpot(slot0.result[0], row.poolInfo.tokenIsToken0, supply.result);
  } catch {
    return null;
  }
}

/**
 * The public receipt page, linked from the QR code on a shared card. It rebuilds
 * the receipt from the indexed trade with the same code as the app
 * (@repo/shared), so a shared image can be checked against the chain.
 */
app.get("/r/:id", async (c) => {
  const started = Date.now();
  const id = c.req.param("id").toLowerCase();
  if (!TRADE_ID.test(id)) return c.html(renderNoReceiptPage("That is not a valid receipt link."), 404);

  const [found] = await db
    .select({ trade, token, pool })
    .from(trade)
    .leftJoin(token, eq(token.address, trade.token))
    .leftJoin(pool, eq(pool.address, trade.pool))
    .where(eq(trade.id, id))
    .limit(1);
  if (!found) {
    return c.html(renderNoReceiptPage("This trade is not indexed, so there is nothing to prove."), 404);
  }

  const row: ReceiptTradeRow = {
    id: found.trade.id,
    txHash: found.trade.txHash,
    wallet: found.trade.wallet,
    side: found.trade.side,
    amountBaseUnits: found.trade.amountBaseUnits.toString(),
    pairAmountBaseUnits: found.trade.pairAmountBaseUnits.toString(),
    sqrtPriceX96: found.trade.sqrtPriceX96.toString(),
    blockTime: found.trade.blockTime.toString(),
    tokenInfo: found.token && {
      address: found.token.address,
      symbol: found.token.symbol,
      name: found.token.name,
      decimals: found.token.decimals,
      totalSupply: found.token.totalSupply.toString(),
    },
    poolInfo: found.pool && {
      address: found.pool.address,
      pairSymbol: found.pool.pairSymbol,
      pairDecimals: found.pool.pairDecimals,
      tokenIsToken0: found.pool.tokenIsToken0,
    },
  };
  const checkedAt = new Date();
  const result = buildReceipt(row, await currentMarketCap(row));

  console.log(
    JSON.stringify({ service: "indexer", event: "receipt_page", id, ok: result.ok, ms: Date.now() - started }),
  );
  if (!result.ok) return c.html(renderNoReceiptPage(result.reason), 404);
  // The entry never changes; the current market cap is re-read at most once a minute.
  c.header("Cache-Control", "public, max-age=60");
  return c.html(renderReceiptPage(result.receipt, checkedAt, c.req.url));
});

/** Token artwork never changes once launched, so each image is read from the chain once. */
const IMAGE_CACHE_LIMIT = 1_000;
const imageCache = new Map<string, { type: string; bytes: Uint8Array } | null>();

/**
 * A token's picture, from its launch metadata: an image contract's code, or an
 * inline image. Only WebP, PNG and JPEG are served, recognised by their first
 * bytes, since the content comes from whoever launched the token.
 */
app.get("/image/:token", async (c) => {
  const address = c.req.param("token").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return c.body(null, 404);

  let image = imageCache.get(address);
  if (image === undefined) {
    const [row] = await db
      .select({ metadataUri: token.metadataUri })
      .from(token)
      .where(eq(token.address, address as `0x${string}`))
      .limit(1);
    if (!row) return c.body(null, 404);

    const ref = imageRefFromMetadata(row.metadataUri);
    let bytes: Uint8Array | null = null;
    if (ref?.kind === "inline") bytes = ref.bytes;
    if (ref?.kind === "onchain") {
      try {
        const code = await rpc().getCode({ address: ref.address });
        bytes = code ? imageFromCode(code) : null;
      } catch {
        // Not cached: the next request tries the chain again.
        return c.body(null, 503);
      }
    }
    const type = bytes ? sniffImageType(bytes) : null;
    image = bytes && type ? { type, bytes } : null;
    if (imageCache.size >= IMAGE_CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value as string);
    imageCache.set(address, image);
  }

  if (!image) return c.body(null, 404);
  // Copied into a plain buffer, which is what the response body takes.
  return c.body(new Uint8Array(image.bytes), 200, {
    "Content-Type": image.type,
    "Cache-Control": "public, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff",
  });
});

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
