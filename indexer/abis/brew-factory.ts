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

/**
 * Brew multi-pair factory v1: one event per launch, naming every pool at once.
 * Signature from the ABI in Brew's site bundle, checked by decoding nine real
 * launches, every one of which had two pairs. The first of them:
 * https://bscscan.com/tx/0x52b080cb4bda9e9ad45259ffb649c1a668dfc2c313efbab2dc30243ee973aafb
 */
export const brewMultiPairFactoryAbi = parseAbi([
  "event TokenLaunchedMultiPair(address indexed token, address indexed creator, address creatorFeeRecipient, uint24 fee, uint256 totalSupply, address[] quoteTokens, address[] pools, uint256[] lockedPositionIds, string name, string symbol, string metadataURI)",
]);

/**
 * Brew multi-pair factory v2: a launch is spread over several transactions.
 * LaunchStarted names the token, then one PoolAdded per pool. LaunchCompleted
 * repeats the pools and is not read. Signatures from the ABI in Brew's site
 * bundle, checked by decoding a real launch that starts here:
 * https://bscscan.com/tx/0xa0456f8456cc0f884a5acaf15b9589cadfa82ce923df63e8f600dc5e7976c07f
 */
export const brewMultiPairFactoryV2Abi = parseAbi([
  "event LaunchStarted(address indexed token, address indexed creator, address creatorFeeRecipient, uint24 fee, uint256 totalSupply, uint8 totalPairs, string name, string symbol, string metadataURI)",
  "event PoolAdded(address indexed token, uint8 indexed index, address quoteToken, address pool, uint256 lockedPositionId)",
]);
