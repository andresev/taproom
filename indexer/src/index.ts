import { ponder } from "ponder:registry";
import { holder, pendingSwap, pool, token, tokenStats, trade } from "ponder:schema";

import { erc20MetadataAbi } from "../abis/erc20";
import { applyTransfer, holderId } from "./holders";
import { isToken0, tradeFromSwap, tradeId } from "./swap";

const lower = (hex: `0x${string}`) => hex.toLowerCase() as `0x${string}`;
const pendingSwapId = (txHash: `0x${string}`, poolAddress: `0x${string}`) =>
  `${lower(txHash)}-${lower(poolAddress)}`;

/** Structured JSON log line; Ponder's own logs go to the same stream. */
function log(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ service: "indexer", event, ...fields }));
}

ponder.on("BrewFactory:TokenLaunched", async ({ event, context }) => {
  const tokenAddress = lower(event.args.token);
  const pairToken = lower(event.args.quoteToken);
  const poolAddress = lower(event.args.pool);

  // A token's decimals and symbol never change, so they are read at the latest
  // block ("immutable") instead of the launch block. Reading at an old block needs
  // an archive node, which would make any backfill depend on one.
  const [decimals, pairDecimals, pairSymbol] = await Promise.all([
    context.client.readContract({
      abi: erc20MetadataAbi,
      address: tokenAddress,
      functionName: "decimals",
      cache: "immutable",
    }),
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

  await context.db.insert(token).values({
    address: tokenAddress,
    symbol: event.args.symbol,
    name: event.args.name,
    decimals,
    totalSupply: event.args.totalSupply,
    deployer: lower(event.args.creator),
    metadataUri: event.args.metadataURI,
    launchTxHash: lower(event.transaction.hash),
    launchBlock: event.block.number,
    launchedAt: event.block.timestamp,
  });
  await context.db.insert(pool).values({
    address: poolAddress,
    token: tokenAddress,
    pairToken,
    pairSymbol,
    pairDecimals,
    tokenIsToken0,
    fee: event.args.fee,
    createdBlock: event.block.number,
  });

  // The launch's initial buy, if any, was emitted before this event.
  const pendingId = pendingSwapId(event.transaction.hash, poolAddress);
  const pending = await context.db.find(pendingSwap, { id: pendingId });
  if (pending) {
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

  log("launch", { token: tokenAddress, pool: poolAddress, block: event.block.number.toString() });
});

ponder.on("BrewPool:Swap", async ({ event, context }) => {
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
});

ponder.on("BrewToken:Transfer", async ({ event, context }) => {
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
});
