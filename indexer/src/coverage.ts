import { BSC_CHAIN_ID } from "@repo/shared";

import { FACTORIES, firstIndexedBlock, type FactoryName } from "./factories";

/**
 * What the index covers, so that anything computed from it (a trader record, a
 * deployer's history) can state its period instead of passing as complete.
 * Derived from configuration alone: it says where indexing starts, not how far
 * the sync has got. Ponder's own /ready and /status routes answer that.
 */
export interface FactoryCoverage {
  name: FactoryName;
  address: `0x${string}`;
  /** The block the factory was created in; none of its launches is older. */
  deploymentBlock: number;
  /** Whether the indexer follows this factory at all. */
  indexed: boolean;
  /**
   * First block indexed for it. Null when it is not indexed, and when the
   * indexer was started at the chain head, a block that is not recorded.
   */
  fromBlock: number | null;
  /** Unix seconds of `fromBlock`; null when that block is unknown or its time could not be read. */
  fromTime: number | null;
  /** True only when it is indexed from its deployment block, so no launch is missing. */
  complete: boolean;
}

export interface Coverage {
  chainId: number;
  factories: FactoryCoverage[];
  /** True only when every factory is complete. Anything less is partial history. */
  complete: boolean;
}

export function buildCoverage(startBlock: number | undefined): Coverage {
  const factories = FACTORIES.map((factory): FactoryCoverage => {
    const first = firstIndexedBlock(startBlock, factory.deploymentBlock);
    const fromBlock = factory.indexed && first !== "latest" ? first : null;
    return {
      name: factory.name,
      address: factory.address,
      deploymentBlock: factory.deploymentBlock,
      indexed: factory.indexed,
      fromBlock,
      fromTime: null,
      complete: fromBlock !== null && fromBlock <= factory.deploymentBlock,
    };
  });
  return { chainId: BSC_CHAIN_ID, factories, complete: factories.every((factory) => factory.complete) };
}

/** The coverage with each start block's time filled in from `times` (block number to unix seconds). */
export function withBlockTimes(coverage: Coverage, times: Map<number, number>): Coverage {
  return {
    ...coverage,
    factories: coverage.factories.map((factory) => ({
      ...factory,
      fromTime: factory.fromBlock === null ? null : (times.get(factory.fromBlock) ?? null),
    })),
  };
}
