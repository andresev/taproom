import { createPublicClient, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";

import { loadEnv } from "../env";

let client: PublicClient | undefined;

/** Created on first use, with the same server-side RPC the indexer syncs from. */
export function rpc(): PublicClient {
  client ??= createPublicClient({ chain: bsc, transport: http(loadEnv().BSC_RPC_URL) });
  return client;
}
