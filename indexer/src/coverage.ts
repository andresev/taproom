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
      complete: fromBlock !== null && fromBlock <= factory.deploymentBlock,
    };
  });
  return { chainId: BSC_CHAIN_ID, factories, complete: factories.every((factory) => factory.complete) };
}
