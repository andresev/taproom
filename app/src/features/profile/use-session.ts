import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/api/supabase';

const WEB3_IDENTITY = /^web3:ethereum:(0x[0-9a-fA-F]{40})$/;

const ADDRESS = /^0x[0-9a-f]{40}$/;

/**
 * The wallet a session belongs to, lowercase. For a Privy sign-in it is the
 * embedded wallet the `privy-session` function wrote into `app_metadata`, which
 * a signed-in user cannot edit. For the older wallet-signature sign-in it is the
 * identity Supabase recorded when it verified the signature. Null otherwise.
 */
export function sessionWalletAddress(session: Session | null): string | null {
  const fromPrivy = session?.user.app_metadata.wallet_address;
  if (typeof fromPrivy === 'string' && ADDRESS.test(fromPrivy)) return fromPrivy;

  for (const identity of session?.user.identities ?? []) {
    const match = identity.provider === 'web3' ? WEB3_IDENTITY.exec(identity.id) : null;
    if (match?.[1]) return match[1].toLowerCase();
  }
  return null;
}

/** The current Supabase session. `isLoading` is true until the stored session has been read. */
export function useSession(): { session: Session | null; isLoading: boolean } {
  const [state, setState] = useState<{ session: Session | null; isLoading: boolean }>({
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    // Fires once with the stored session (INITIAL_SESSION), then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
