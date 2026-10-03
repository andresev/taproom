import { ADDRESSES, BSC_CHAIN_ID, DEPLOYMENT_BLOCKS } from "@repo/shared";
import { createConfig, factory } from "ponder";
import { getAbiItem } from "viem";

import { brewFactoryAbi, brewMultiPairFactoryAbi, brewMultiPairFactoryV2Abi } from "./abis/brew-factory";
import { erc20TransferAbi } from "./abis/erc20";
import { pancakeV3PoolAbi } from "./abis/pancake-v3-pool";
import { loadEnv } from "./src/env";
import {
  firstIndexedBlock,
  MULTI_PAIR_V1_POOL_OFFSETS,
  multiPairV1PoolName,
  type MultiPairV1PoolName,
} from "./src/factories";

const env = loadEnv();
const standardStart = firstIndexedBlock(env.START_BLOCK, DEPLOYMENT_BLOCKS.brewFactory);
const multiPairV1Start = firstIndexedBlock(env.START_BLOCK, DEPLOYMENT_BLOCKS.brewMultiPairFactory);
const multiPairV2Start = firstIndexedBlock(env.START_BLOCK, DEPLOYMENT_BLOCKS.brewMultiPairFactoryV2);

const tokenLaunched = getAbiItem({ abi: brewFactoryAbi, name: "TokenLaunched" });
const tokenLaunchedMultiPair = getAbiItem({ abi: brewMultiPairFactoryAbi, name: "TokenLaunchedMultiPair" });
const launchStarted = getAbiItem({ abi: brewMultiPairFactoryV2Abi, name: "LaunchStarted" });
const poolAdded = getAbiItem({ abi: brewMultiPairFactoryV2Abi, name: "PoolAdded" });

/**
 * One contract entry per position a multi-pair v1 pool can take in its launch
 * event, because Ponder reads a child address at a fixed position (src/factories.ts).
 */
const multiPairV1Pool = (offset: number) => ({
  chain: "bsc" as const,
  abi: pancakeV3PoolAbi,
  address: factory({
    address: ADDRESSES.brewMultiPairFactory,
    event: tokenLaunchedMultiPair,
    location: `offset${offset}`,
  }),
  startBlock: multiPairV1Start,
});
const multiPairV1Pools = Object.fromEntries(
  MULTI_PAIR_V1_POOL_OFFSETS.map((offset) => [multiPairV1PoolName(offset), multiPairV1Pool(offset)]),
) as Record<MultiPairV1PoolName, ReturnType<typeof multiPairV1Pool>>;

export default createConfig({
  database: env.DATABASE_URL
    ? { kind: "postgres", connectionString: env.DATABASE_URL }
    : { kind: "pglite" },
  chains: {
    bsc: { id: BSC_CHAIN_ID, rpc: env.BSC_RPC_URL },
  },
  // Brew's standard and multi-pair factories are indexed. The dividend factory is
  // recorded in shared/src/addresses.ts but waits on an open question (docs/0012).
  // Never register an address or ABI that is not confirmed there.
  contracts: {
    BrewFactory: {
      chain: "bsc",
      abi: brewFactoryAbi,
      address: ADDRESSES.brewFactory,
      startBlock: standardStart,
    },
    BrewMultiPairFactory: {
      chain: "bsc",
      abi: brewMultiPairFactoryAbi,
      address: ADDRESSES.brewMultiPairFactory,
      startBlock: multiPairV1Start,
    },
    BrewMultiPairFactoryV2: {
      chain: "bsc",
      abi: brewMultiPairFactoryV2Abi,
      address: ADDRESSES.brewMultiPairFactoryV2,
      startBlock: multiPairV2Start,
    },
    // Every pool a launch creates, discovered from the launch event itself.
    BrewPool: {
      chain: "bsc",
      abi: pancakeV3PoolAbi,
      address: factory({ address: ADDRESSES.brewFactory, event: tokenLaunched, parameter: "pool" }),
      startBlock: standardStart,
    },
    ...multiPairV1Pools,
    MultiPairV2Pool: {
      chain: "bsc",
      abi: pancakeV3PoolAbi,
      address: factory({ address: ADDRESSES.brewMultiPairFactoryV2, event: poolAdded, parameter: "pool" }),
      startBlock: multiPairV2Start,
    },
    // Every token a launch creates, for holder balances. The mint happens earlier in
    // the launch transaction than the launch event; Ponder still delivers it, because
    // a child contract's events count from the block it was created in.
    BrewToken: {
      chain: "bsc",
      abi: erc20TransferAbi,
      address: factory({ address: ADDRESSES.brewFactory, event: tokenLaunched, parameter: "token" }),
      startBlock: standardStart,
    },
    MultiPairV1Token: {
      chain: "bsc",
      abi: erc20TransferAbi,
      address: factory({ address: ADDRESSES.brewMultiPairFactory, event: tokenLaunchedMultiPair, parameter: "token" }),
      startBlock: multiPairV1Start,
    },
    MultiPairV2Token: {
      chain: "bsc",
      abi: erc20TransferAbi,
      address: factory({ address: ADDRESSES.brewMultiPairFactoryV2, event: launchStarted, parameter: "token" }),
      startBlock: multiPairV2Start,
    },
  },
});
