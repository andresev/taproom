import { parseAbi } from 'viem';

/** The standard BEP-20 calls the app makes: reads, and the approval a sell needs. */
export const erc20Abi = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);
