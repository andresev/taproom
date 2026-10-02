import { parseAbi } from "viem";

/** Standard BEP-20 Transfer, for holder balances. */
export const erc20TransferAbi = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

/** The two BEP-20 metadata reads the indexer makes for a launch. */
export const erc20MetadataAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

/** What the sell simulation needs from a token: approve the router, read a balance. */
export const erc20TradeAbi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);
