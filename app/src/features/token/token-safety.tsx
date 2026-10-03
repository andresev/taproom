import { SafetyCard } from '@/features/safety/safety-card';
import { useSafety } from '@/features/safety/use-safety';

import type { TokenDetails } from './types';

/** The token page's safety card: the rating, its worst finding, and every reason one tap away. */
export function TokenSafety({ token }: { token: TokenDetails }) {
  const { score } = useSafety(token.address);

  return <SafetyCard score={score} />;
}
