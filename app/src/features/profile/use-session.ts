import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/api/supabase';

const WEB3_IDENTITY = /^web3:ethereum:(0x[0-9a-fA-F]{40})$/;

/**
 * The wallet a session was created for, lowercase, read from the identity
 * Supabase recorded when it verified the signature. Null if the session did not
 * come from a wallet sign-in.
 */
export function sessionWalletAddress(session: Session | null): string | null {
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
