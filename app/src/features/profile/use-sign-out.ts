import { usePrivy } from '@privy-io/expo';
import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/api/supabase';

/**
 * Signs out of Privy and Supabase. The embedded wallet is not deleted: signing
 * in again with the same Google or Apple account brings the same wallet back.
 */
export function useSignOut() {
  const { logout } = usePrivy();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await logout();
    },
  });
}
