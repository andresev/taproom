/**
 * The receipt maths lives in @repo/shared (shared/src/receipt.ts), so the app and
 * the indexer's public receipt page build the same receipt from the same trade.
 */
export { buildReceipt, marketCapMultiple, type Receipt, type ReceiptTradeRow } from '@repo/shared';
