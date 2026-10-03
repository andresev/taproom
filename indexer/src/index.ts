import { ADDRESSES } from "@repo/shared";
import { ponder, type Context, type IndexingFunctionArgs } from "ponder:registry";
import { holder, pendingSwap, pool, token, tokenStats, trade } from "ponder:schema";

import { erc20MetadataAbi } from "../abis/erc20";
import { pancakeV3PoolFeeAbi } from "../abis/pancake-v3-pool";
import { MAX_PAIRS, MULTI_PAIR_V1_POOL_OFFSETS, multiPairV1PoolName } from "./factories";
import { applyTransfer, holderId } from "./holders";
import { isToken0, tradeFromSwap, tradeId } from "./swap";

const lower = (hex: `0x${string}`) => hex.toLowerCase() as `0x${string}`;
const pendingSwapId = (txHash: `0x${string}`, poolAddress: `0x${string}`) =>
  `${lower(txHash)}-${lower(poolAddress)}`;

/** Structured JSON log line; Ponder's own logs go to the same stream. */
function log(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ service: "indexer", event, ...fields }));
}

/** The part of any event that a launch or pool row is stamped with. */
interface EventOrigin {
  block: { number: bigint; timestamp: bigint };
  transaction: { hash: `0x${string}` };
}

interface LaunchedToken {
  token: `0x${string}`;
  /** The factory that emitted the launch event. */
  factory: `0x${string}`;
  creator: `0x${string}`;
  name: string;
  symbol: string;
  totalSupply: bigint;
  metadataURI: string;
}

/** Records a launched token. Every factory's launch event carries these fields. */
async function recordToken(context: Context, origin: EventOrigin, launch: LaunchedToken) {
  const tokenAddress = lower(launch.token);
  // A token's decimals never change, so they are read at the latest block
  // ("immutable") instead of the launch block. Reading at an old block needs an
  // archive node, which would make any backfill depend on one.
  const decimals = await context.client.readContract({
    abi: erc20MetadataAbi,
    address: tokenAddress,
    functionName: "decimals",
    cache: "immutable",
  });

  await context.db.insert(token).values({
    address: tokenAddress,
    symbol: launch.symbol,
    name: launch.name,
    decimals,
    totalSupply: launch.totalSupply,
    deployer: lower(launch.creator),
    factory: lower(launch.factory),
    metadataUri: launch.metadataURI,
    launchTxHash: lower(origin.transaction.hash),
    launchBlock: origin.block.number,
    launchedAt: origin.block.timestamp,
  });
}

interface LaunchedPool {
  pool: `0x${string}`;
  token: `0x${string}`;
  pairToken: `0x${string}`;
  fee: number;
}

/**
 * Records one pool of a launch, then turns the swap that was waiting for it, if
 * any, into a trade: a launch's initial buy is emitted before the launch event.
 */
async function recordPool(context: Context, origin: EventOrigin, launched: LaunchedPool) {
  const poolAddress = lower(launched.pool);
  const tokenAddress = lower(launched.token);
  const pairToken = lower(launched.pairToken);

  const [pairDecimals, pairSymbol] = await Promise.all([
    context.client.readContract({
      abi: erc20MetadataAbi,
      address: pairToken,
      functionName: "decimals",
      cache: "immutable",
    }),
    // Some tokens do not implement symbol(), or return bytes32; that is not worth failing a launch over.
    context.client
      .readContract({ abi: erc20MetadataAbi, address: pairToken, functionName: "symbol", cache: "immutable" })
      .catch(() => null),
  ]);
  const tokenIsToken0 = isToken0(tokenAddress, pairToken);

  await context.db.insert(pool).values({
    address: poolAddress,
    token: tokenAddress,
    pairToken,
    pairSymbol,
    pairDecimals,
    tokenIsToken0,
    fee: launched.fee,
    createdBlock: origin.block.number,
  });

  const pendingId = pendingSwapId(origin.transaction.hash, poolAddress);
  const pending = await context.db.find(pendingSwap, { id: pendingId });
  if (!pending) return;

  const amounts = tradeFromSwap(tokenIsToken0, pending);
  if (amounts) {
    await context.db
      .insert(trade)
      .values({
        id: tradeId(pending.txHash, pending.logIndex),
        txHash: pending.txHash,
        logIndex: pending.logIndex,
        wallet: pending.wallet,
        token: tokenAddress,
        pool: poolAddress,
        pairToken,
        sqrtPriceX96: pending.sqrtPriceX96,
        blockNumber: pending.blockNumber,
        blockTime: pending.blockTime,
        ...amounts,
      })
      .onConflictDoNothing();
  }
  await context.db.delete(pendingSwap, { id: pendingId });
}

ponder.on("BrewFactory:TokenLaunched", async ({ event, context }) => {
  await recordToken(context, event, { ...event.args, factory: ADDRESSES.brewFactory });
  await recordPool(context, event, { ...event.args, pairToken: event.args.quoteToken });

  log("launch", {
    factory: "standard",
    token: lower(event.args.token),
    pool: lower(event.args.pool),
    block: event.block.number.toString(),
  });
});

// Multi-pair v1: one event names every pool of the launch.
ponder.on("BrewMultiPairFactory:TokenLaunchedMultiPair", async ({ event, context }) => {
  const { quoteTokens, pools } = event.args;
  await recordToken(context, event, { ...event.args, factory: ADDRESSES.brewMultiPairFactory });
  for (const [index, poolAddress] of pools.entries()) {
    const pairToken = quoteTokens[index];
    if (!pairToken) continue;
    await recordPool(context, event, { pool: poolAddress, token: event.args.token, pairToken, fee: event.args.fee });
  }

  const fields = {
    factory: "multiPairV1",
    token: lower(event.args.token),
    pools: pools.map(lower),
    block: event.block.number.toString(),
  };
  log("launch", fields);
  // Swaps are followed only in the pool positions ponder.config.ts registers. A
  // launch with more pairs than that has pools whose trades are not indexed.
  if (pools.length > MAX_PAIRS) log("launch_pools_not_followed", { ...fields, followed: MAX_PAIRS });
});

// Multi-pair v2: the launch is spread over several transactions. LaunchStarted
// names the token; each pool then arrives in its own PoolAdded.
ponder.on("BrewMultiPairFactoryV2:LaunchStarted", async ({ event, context }) => {
  await recordToken(context, event, { ...event.args, factory: ADDRESSES.brewMultiPairFactoryV2 });
  log("launch", { factory: "multiPairV2", token: lower(event.args.token), block: event.block.number.toString() });
});

ponder.on("BrewMultiPairFactoryV2:PoolAdded", async ({ event, context }) => {
  // PoolAdded does not carry the fee, so it is read from the pool, where it never changes.
  const fee = await context.client.readContract({
    abi: pancakeV3PoolFeeAbi,
    address: event.args.pool,
    functionName: "fee",
    cache: "immutable",
  });
  await recordPool(context, event, { ...event.args, pairToken: event.args.quoteToken, fee });
  log("pool_added", {
    factory: "multiPairV2",
    token: lower(event.args.token),
    pool: lower(event.args.pool),
    block: event.block.number.toString(),
  });
});

async function onSwap({ event, context }: IndexingFunctionArgs<"BrewPool:Swap">) {
  const poolAddress = lower(event.log.address);
  // The trader is whoever sent the transaction. The event's own sender and
  // recipient are usually a router, not the wallet behind the trade.
  const wallet = lower(event.transaction.from);
  const txHash = lower(event.transaction.hash);

  const knownPool = await context.db.find(pool, { address: poolAddress });
  if (!knownPool) {
    await context.db
      .insert(pendingSwap)
      .values({
        id: pendingSwapId(txHash, poolAddress),
        txHash,
        logIndex: event.log.logIndex,
        wallet,
        pool: poolAddress,
        amount0: event.args.amount0,
        amount1: event.args.amount1,
        sqrtPriceX96: event.args.sqrtPriceX96,
        blockNumber: event.block.number,
        blockTime: event.block.timestamp,
      })
      .onConflictDoNothing();
    return;
  }

  const amounts = tradeFromSwap(knownPool.tokenIsToken0, event.args);
  if (!amounts) return;

  await context.db
    .insert(trade)
    .values({
      id: tradeId(txHash, event.log.logIndex),
      txHash,
      logIndex: event.log.logIndex,
      wallet,
      token: knownPool.token,
      pool: poolAddress,
      pairToken: knownPool.pairToken,
      sqrtPriceX96: event.args.sqrtPriceX96,
      blockNumber: event.block.number,
      blockTime: event.block.timestamp,
      ...amounts,
    })
    .onConflictDoNothing();
}

async function onTransfer({ event, context }: IndexingFunctionArgs<"BrewToken:Transfer">) {
  const tokenAddress = lower(event.log.address);
  const from = lower(event.args.from);
  const to = lower(event.args.to);
  const fromId = holderId(tokenAddress, from);
  const toId = holderId(tokenAddress, to);

  const [fromRow, toRow] = await Promise.all([
    context.db.find(holder, { id: fromId }),
    context.db.find(holder, { id: toId }),
  ]);
  const effect = applyTransfer(from, to, event.args.value, fromRow?.balance ?? 0n, toRow?.balance ?? 0n);

  if (effect.fromBalance !== null) {
    const balance = effect.fromBalance;
    await context.db
      .insert(holder)
      .values({ id: fromId, token: tokenAddress, holder: from, balance })
      .onConflictDoUpdate({ balance });
  }
  if (effect.toBalance !== null && from !== to) {
    const balance = effect.toBalance;
    await context.db
      .insert(holder)
      .values({ id: toId, token: tokenAddress, holder: to, balance })
      .onConflictDoUpdate({ balance });
  }
  if (effect.holderDelta !== 0) {
    await context.db
      .insert(tokenStats)
      .values({ token: tokenAddress, holderCount: effect.holderDelta })
      .onConflictDoUpdate((row) => ({ holderCount: row.holderCount + effect.holderDelta }));
  }
}

// The pools and tokens of every indexed factory are handled alike; ponder.config.ts
// says why each has its own contract entry.
const POOL_SOURCES = ["BrewPool", "MultiPairV2Pool", ...MULTI_PAIR_V1_POOL_OFFSETS.map(multiPairV1PoolName)] as const;
const TOKEN_SOURCES = ["BrewToken", "MultiPairV1Token", "MultiPairV2Token"] as const;

for (const source of POOL_SOURCES) ponder.on(`${source}:Swap`, onSwap);
for (const source of TOKEN_SOURCES) ponder.on(`${source}:Transfer`, onTransfer);
