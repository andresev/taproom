import type { Address, Profile } from '@repo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/api/supabase';

const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** Postgres unique_violation: another profile already has this display name. */
const UNIQUE_VIOLATION = '23505';

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
        .select('wallet_address, display_name, created_at')
        .eq('id', userId ?? '')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        walletAddress: data.wallet_address as Address,
        displayName: data.display_name as string | null,
        createdAt: new Date(data.created_at as string),
      };
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}
