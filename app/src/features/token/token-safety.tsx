import { SafetyBadge } from '@/features/safety/safety-badge';
import { useSafety } from '@/features/safety/use-safety';

import type { TokenDetails } from './types';

/** The token page's safety badge: the score and every reason behind it. */
export function TokenSafety({ token }: { token: TokenDetails }) {
  const { score } = useSafety(token.address);

  return <SafetyBadge score={score} />;
}
