import { parseAbi } from "viem";

/**
 * Brew standard launch factory. Only the launch event is declared: it is all the
 * indexer reads. The signature comes from the ABI in Brew's site bundle (see
 * shared/src/addresses.ts) and was checked by decoding a real launch:
 * https://bscscan.com/tx/0xc647d09d80d7669c628d668dec0c8f6e2872907c89d688fd22f9ca2f26f8ea1a
 */
export const brewFactoryAbi = parseAbi([
  "event TokenLaunched(address indexed token, address indexed creator, address indexed quoteToken, address pool, uint24 fee, int24 initialTick, uint256 totalSupply, uint256[] lockedPositionIds, string name, string symbol, string metadataURI)",
]);
