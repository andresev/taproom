import { ADDRESSES, BSC_CHAIN_ID } from "@repo/shared";
import { createConfig, factory } from "ponder";
import { getAbiItem } from "viem";

import { brewFactoryAbi } from "./abis/brew-factory";
import { pancakeV3PoolAbi } from "./abis/pancake-v3-pool";
import { loadEnv } from "./src/env";

const env = loadEnv();
const startBlock = env.START_BLOCK ?? "latest";

export default createConfig({
  database: env.DATABASE_URL
    ? { kind: "postgres", connectionString: env.DATABASE_URL }
    : { kind: "pglite" },
  chains: {
    bsc: { id: BSC_CHAIN_ID, rpc: env.BSC_RPC_URL },
  },
  // Only Brew's standard factory is indexed so far. The dividend and multi-pair
  // factories are recorded in shared/src/addresses.ts and still to be added
  // (docs/0004). Never register an address or ABI that is not confirmed there.
  contracts: {
    BrewFactory: {
      chain: "bsc",
      abi: brewFactoryAbi,
      address: ADDRESSES.brewFactory,
      startBlock,
    },
    // Every pool a launch creates, discovered from the launch event itself.
    BrewPool: {
      chain: "bsc",
      abi: pancakeV3PoolAbi,
      address: factory({
        address: ADDRESSES.brewFactory,
        event: getAbiItem({ abi: brewFactoryAbi, name: "TokenLaunched" }),
        parameter: "pool",
      }),
      startBlock,
    },
  },
});
