import { useSafety } from '@/features/safety/use-safety';
import type { TokenDetails } from '@/features/token/types';

/** The safety score a buy or sell review shows before its confirm button. */
export function useTradeSafety(token: TokenDetails) {
  return useSafety(token.address);
}
