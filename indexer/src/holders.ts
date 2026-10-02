/**
 * Pure balance bookkeeping for one ERC-20 Transfer. No I/O, so it is unit-tested.
 *
 * The zero address is the mint source and burn sink, not a holder: its balance
 * is never tracked or counted.
 */

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface TransferEffect {
  /** New balance of the sender, or null when the sender is the zero address (a mint). */
  fromBalance: bigint | null;
  /** New balance of the recipient, or null when the recipient is the zero address (a burn). */
  toBalance: bigint | null;
  /** Change in the number of addresses holding a non-zero balance. */
  holderDelta: number;
}

/**
 * Applies a transfer of `value` to the two current balances (0n for an address
 * never seen). A balance that would go negative means transfers were missed,
 * for example a token indexed from after its first block, so it is clamped to
 * zero rather than stored as a negative holding.
 */
export function applyTransfer(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  fromBalanceBefore: bigint,
  toBalanceBefore: bigint,
): TransferEffect {
  const fromIsHolder = from.toLowerCase() !== ZERO_ADDRESS;
  const toIsHolder = to.toLowerCase() !== ZERO_ADDRESS;

  if (from.toLowerCase() === to.toLowerCase()) {
    return { fromBalance: fromIsHolder ? fromBalanceBefore : null, toBalance: toIsHolder ? toBalanceBefore : null, holderDelta: 0 };
  }

  const fromAfter = fromBalanceBefore > value ? fromBalanceBefore - value : 0n;
  const toAfter = toBalanceBefore + value;

  let holderDelta = 0;
  if (fromIsHolder && fromBalanceBefore > 0n && fromAfter === 0n) holderDelta -= 1;
  if (toIsHolder && toBalanceBefore === 0n && toAfter > 0n) holderDelta += 1;

  return {
    fromBalance: fromIsHolder ? fromAfter : null,
    toBalance: toIsHolder ? toAfter : null,
    holderDelta,
  };
}

/** Primary key of a holder row. */
export function holderId(token: `0x${string}`, holder: `0x${string}`): string {
  return `${token.toLowerCase()}-${holder.toLowerCase()}`;
}
