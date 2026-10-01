import { index, onchainTable, relations } from "ponder";

/**
 * Indexed on-chain data for Brew tokens. Mirrors the domain types in @repo/shared.
 * Amounts are integer base units (bigint). Addresses and hashes are lowercase hex.
 */

export const token = onchainTable(
  "token",
  (t) => ({
    address: t.hex().primaryKey(),
    symbol: t.text(),
    name: t.text(),
    decimals: t.integer().notNull(),
    totalSupply: t.bigint().notNull(),
    /** Dev wallet: the wallet that launched the token. */
    deployer: t.hex().notNull(),
    /** As emitted at launch: usually a data: URI holding JSON with a description and image. */
    metadataUri: t.text(),
    launchTxHash: t.hex().notNull(),
    launchBlock: t.bigint().notNull(),
    launchedAt: t.bigint().notNull(),
  }),
  (table) => ({
    deployerTimeIdx: index().on(table.deployer, table.launchedAt),
    launchedAtIdx: index().on(table.launchedAt),
  }),
);

/**
 * A PancakeSwap V3 pool created by a Brew launch. A separate table because
 * multi-pair launches create several pools for one token.
 */
export const pool = onchainTable(
  "pool",
  (t) => ({
    address: t.hex().primaryKey(),
    /** The Brew token this pool was launched for. */
    token: t.hex().notNull(),
    /** The asset the token was brewed with (WBNB, $BREW, a memecoin or a bStock). */
    pairToken: t.hex().notNull(),
    /** Null if the pair token does not report a symbol. */
    pairSymbol: t.text(),
    pairDecimals: t.integer().notNull(),
    /** Whether `token` is the pool's token0, which decides how Swap amounts are read. */
    tokenIsToken0: t.boolean().notNull(),
    /** Pool fee in hundredths of a basis point: 10000 is 1%. */
    fee: t.integer().notNull(),
    createdBlock: t.bigint().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.token),
  }),
);

export const trade = onchainTable(
  "trade",
  (t) => ({
    /** `${txHash}-${logIndex}`: one transaction can contain several swaps. */
    id: t.text().primaryKey(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    /** The wallet that sent the transaction. */
    wallet: t.hex().notNull(),
    token: t.hex().notNull(),
    pool: t.hex().notNull(),
    side: t.text().$type<"buy" | "sell">().notNull(),
    amountBaseUnits: t.bigint().notNull(),
    pairToken: t.hex().notNull(),
    pairAmountBaseUnits: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTime: t.bigint().notNull(),
  }),
  (table) => ({
    walletTimeIdx: index().on(table.wallet, table.blockTime),
    tokenTimeIdx: index().on(table.token, table.blockTime),
  }),
);

/**
 * A swap seen before its pool's launch event. A launch's initial buy is emitted
 * earlier in the same transaction than TokenLaunched, so the pool is not known
 * yet when the swap arrives. The launch handler turns the row into a trade and
 * deletes it.
 */
export const pendingSwap = onchainTable("pending_swap", (t) => ({
  /** `${txHash}-${pool}`. */
  id: t.text().primaryKey(),
  txHash: t.hex().notNull(),
  logIndex: t.integer().notNull(),
  wallet: t.hex().notNull(),
  pool: t.hex().notNull(),
  amount0: t.bigint().notNull(),
  amount1: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTime: t.bigint().notNull(),
}));

export const poolRelations = relations(pool, ({ one }) => ({
  tokenInfo: one(token, { fields: [pool.token], references: [token.address] }),
}));

export const tradeRelations = relations(trade, ({ one }) => ({
  tokenInfo: one(token, { fields: [trade.token], references: [token.address] }),
  poolInfo: one(pool, { fields: [trade.pool], references: [pool.address] }),
}));
