import { parseAbi } from "viem";

/** The two BEP-20 metadata reads the indexer makes for a launch. */
export const erc20MetadataAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);
