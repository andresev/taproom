import { createPublicClient, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";

import { loadEnv } from "../env";

let client: PublicClient | undefined;

/** Created on first use, with the same server-side RPC the indexer syncs from. */
export function rpc(): PublicClient {
  client ??= createPublicClient({ chain: bsc, transport: http(loadEnv().BSC_RPC_URL) });
  return client;
}

const blockTimes = new Map<number, number>();

/** A block's unix time, read once and kept: it never changes. Null if the read fails; the next call retries. */
export async function blockTime(blockNumber: number): Promise<number | null> {
  const known = blockTimes.get(blockNumber);
  if (known !== undefined) return known;
  try {
    const block = await rpc().getBlock({ blockNumber: BigInt(blockNumber) });
    blockTimes.set(blockNumber, Number(block.timestamp));
    return Number(block.timestamp);
  } catch {
    return null;
  }
}
