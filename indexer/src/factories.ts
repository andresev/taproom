import { ADDRESSES, DEPLOYMENT_BLOCKS } from "@repo/shared";

/**
 * Brew's launch factories and whether the indexer follows each one. Pure config,
 * shared by ponder.config.ts and the /coverage route so the two cannot disagree.
 */
export const FACTORIES = [
  {
    name: "standard",
    address: ADDRESSES.brewFactory,
    deploymentBlock: DEPLOYMENT_BLOCKS.brewFactory,
    indexed: true,
    // Checked on 40 tokens from 40 deployers (2026-10-02, docs/0014).
    template: {
      codeSize: 1991,
      deployerOffset: 1424,
      hash: "0xe56fe7a81e7bbcca329d3fe5ddc2f73fea66f86bbfe46375aadeefc734c8e8d2",
    },
  },
  {
    name: "multiPairV1",
    address: ADDRESSES.brewMultiPairFactory,
    deploymentBlock: DEPLOYMENT_BLOCKS.brewMultiPairFactory,
    indexed: true,
    // Checked on 10 tokens (2026-10-02, docs/0014).
    template: {
      codeSize: 2088,
      deployerOffset: 1495,
      hash: "0x235547828d3af8b23084eba909100d938308240c1c71789824187e7b158a9882",
    },
  },
  {
    name: "multiPairV2",
    address: ADDRESSES.brewMultiPairFactoryV2,
    deploymentBlock: DEPLOYMENT_BLOCKS.brewMultiPairFactoryV2,
    indexed: true,
    // Checked on 2 tokens only: few v2 launches were in the indexed range (docs/0014).
    template: {
      codeSize: 2088,
      deployerOffset: 1495,
      hash: "0xad3a73afe9e6d3af863bf9d50064c15f65a9724f34e8bcf02720ab4a87cd8b10",
    },
  },
  // Not indexed: whether Taproom shows tokens that route fees to holders is an
  // open question in CLAUDE.md.
  {
    name: "dividend",
    address: ADDRESSES.brewDividendFactory,
    deploymentBlock: DEPLOYMENT_BLOCKS.brewDividendFactory,
    indexed: false,
    template: null,
  },
] as const;

/**
 * The contract code every token from one factory shares. Each token's code
 * differs from the others only in its deployer's address, written into the code
 * at `deployerOffset`; with those 20 bytes set to zero, the code hashes to `hash`
 * (keccak256).
 */
export interface Template {
  codeSize: number;
  deployerOffset: number;
  hash: `0x${string}`;
}

export type FactoryName = (typeof FACTORIES)[number]["name"];

/**
 * The first block to index for a factory: the configured start, but never before
 * the factory existed. With no configured start the indexer begins at the chain
 * head, which is what Ponder's "latest" means.
 */
export function firstIndexedBlock(startBlock: number | undefined, deploymentBlock: number): number | "latest" {
  return startBlock === undefined ? "latest" : Math.max(startBlock, deploymentBlock);
}

/** The most pairs one Brew launch is reported to have (docs/0012). */
export const MAX_PAIRS = 5;

/**
 * Where `pools[index]` sits in the data of a TokenLaunchedMultiPair event that
 * has `pairs` pairs, in bytes.
 *
 * The data starts with nine 32-byte head words (three values, then one pointer
 * for each of the six arrays and strings). `quoteTokens` follows as a length
 * word and `pairs` addresses, then `pools` as a length word and its addresses.
 */
export function multiPairPoolOffset(pairs: number, index: number): number {
  const head = 9 * 32;
  const quoteTokens = 32 + 32 * pairs;
  const poolsLength = 32;
  return head + quoteTokens + poolsLength + 32 * index;
}

/**
 * Every offset at which a pool address can sit, for launches of up to `maxPairs`
 * pairs. Ponder finds a child contract at one fixed position in an event and
 * cannot read an array, so the multi-pair v1 pools are followed once per offset.
 * An offset that does not hold a pool for a given launch holds some other word
 * of the event (a length, a position id, part of the name), which is never the
 * address of a PancakeSwap pool, so it adds no trades.
 */
export function multiPairPoolOffsets(maxPairs: number): number[] {
  const offsets = new Set<number>();
  for (let pairs = 1; pairs <= maxPairs; pairs++) {
    for (let index = 0; index < pairs; index++) offsets.add(multiPairPoolOffset(pairs, index));
  }
  return [...offsets].sort((a, b) => a - b);
}

/**
 * `multiPairPoolOffsets(MAX_PAIRS)`, written out so the contract names built from
 * it are known to the type checker. A test keeps the two equal.
 */
export const MULTI_PAIR_V1_POOL_OFFSETS = [384, 416, 448, 480, 512, 544, 576, 608, 640] as const;

export type MultiPairV1PoolName = `MultiPairV1PoolAt${(typeof MULTI_PAIR_V1_POOL_OFFSETS)[number]}`;

export function multiPairV1PoolName<offset extends (typeof MULTI_PAIR_V1_POOL_OFFSETS)[number]>(
  offset: offset,
): `MultiPairV1PoolAt${offset}` {
  return `MultiPairV1PoolAt${offset}`;
}
