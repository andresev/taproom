/**
 * Contract addresses live in @repo/shared (shared/src/addresses.ts) so the app
 * and the indexer use the same ones. Never guess or invent an address: an
 * unconfirmed one is `null` there and `requireAddress` throws on it.
 */
export { ADDRESSES, BSC_CHAIN_ID, requireAddress, type AddressName } from '@repo/shared';
