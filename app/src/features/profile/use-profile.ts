import type { Address, Profile } from '@repo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/api/supabase';

const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** Postgres unique_violation: another profile already has this display name. */
const UNIQUE_VIOLATION = '23505';

const PROFILE_COLUMNS = 'wallet_address, display_name, created_at';

function toProfile(row: { wallet_address: unknown; display_name: unknown; created_at: unknown }): Profile {
  return {
    walletAddress: row.wallet_address as Address,
    displayName: row.display_name as string | null,
    createdAt: new Date(row.created_at as string),
  };
}

/**
 * The signed-in user's profile. Resolves to null if the row does not exist,
 * which callers must treat as an error: the sign-in trigger should have created it.
 */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId),
    enabled: userId !== undefined,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },
  });
}

/** The profile keyed to a wallet, or null if that wallet has none. Public: works signed out. */
export function useProfileByWallet(address: Address) {
  return useQuery({
    queryKey: ['profile-by-wallet', address],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('wallet_address', address)
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },
  });
}

/** Sets the signed-in user's display name. The wallet address can never be changed. */
export function useUpdateDisplayName(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', userId);
      if (error?.code === UNIQUE_VIOLATION) throw new Error('That name is already taken.');
      if (error) throw error;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['profile-by-wallet'] }),
      ]),
  });
}
