import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

/**
 * Read-only BSC client for the app. EXPO_PUBLIC_* values ship in the bundle, so
 * this URL must be a public, keyless endpoint; keyed RPC providers stay
 * server-side in the indexer. Falls back to viem's default public BSC RPC.
 */
export const publicClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.EXPO_PUBLIC_BSC_RPC_URL),
});
