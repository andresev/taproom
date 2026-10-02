import { parseAbi } from 'viem';

/** The standard BEP-20 reads the app makes. */
export const erc20Abi = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);
