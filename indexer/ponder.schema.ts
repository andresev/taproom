import { index, onchainTable } from "ponder";

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
    /** The asset the token was brewed with (WBNB, $BREW, a memecoin or a bStock). */
    pairToken: t.hex().notNull(),
    /** PancakeSwap V3 pool created at launch. */
    pool: t.hex().notNull(),
    launchTxHash: t.hex().notNull(),
    launchBlock: t.bigint().notNull(),
    launchedAt: t.bigint().notNull(),
  }),
  (table) => ({
    deployerIdx: index().on(table.deployer),
    launchedAtIdx: index().on(table.launchedAt),
  }),
);

export const trade = onchainTable(
  "trade",
  (t) => ({
    /** `${txHash}-${logIndex}`: one transaction can contain several swaps. */
    id: t.text().primaryKey(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    wallet: t.hex().notNull(),
    token: t.hex().notNull(),
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
