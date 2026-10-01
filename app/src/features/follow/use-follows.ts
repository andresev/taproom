import type { Address } from '@repo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/api/supabase';

import type { WalletSummary } from './types';

/** Most wallets shown in the "Following" list; v1 has no pagination. */
const FOLLOWING_LIMIT = 200;

const followKeys = {
  all: ['follows'] as const,
  following: (userId: string | undefined) => ['follows', 'following', userId] as const,
  isFollowing: (userId: string | undefined, address: Address) => ['follows', 'is-following', userId, address] as const,
  followerCount: (address: Address) => ['follows', 'follower-count', address] as const,
};

/** Display names for the wallets that have a profile; wallets without one are absent. */
async function displayNamesFor(addresses: Address[]): Promise<Map<string, string | null>> {
  if (addresses.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address, display_name')
    .in('wallet_address', addresses);
  if (error) throw error;
  return new Map(data.map((row) => [row.wallet_address as string, row.display_name as string | null]));
}

/** The wallets the signed-in user follows, newest first. */
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: followKeys.following(userId),
    enabled: userId !== undefined,
    queryFn: async (): Promise<WalletSummary[]> => {
      const { data, error } = await supabase
        .from('follows')
        .select('followee_address')
        .eq('follower_id', userId ?? '')
        .order('created_at', { ascending: false })
        .limit(FOLLOWING_LIMIT);
      if (error) throw error;

      const addresses = data.map((row) => row.followee_address as Address);
      const names = await displayNamesFor(addresses);
      return addresses.map((address) => ({ address, displayName: names.get(address) ?? null }));
    },
  });
}

/** Whether the signed-in user follows `address`. */
export function useIsFollowing(userId: string | undefined, address: Address) {
  return useQuery({
    queryKey: followKeys.isFollowing(userId, address),
    enabled: userId !== undefined,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId ?? '')
        .eq('followee_address', address);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

/** How many profiles follow `address`. Public: works signed out. */
export function useFollowerCount(address: Address) {
  return useQuery({
    queryKey: followKeys.followerCount(address),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_address', address);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/**
 * Follow (`true`) or unfollow (`false`) a wallet as the signed-in user. The
 * button flips immediately and is put back if the write fails.
 */
export function useSetFollowing(userId: string | undefined, address: Address) {
  const queryClient = useQueryClient();
  const key = followKeys.isFollowing(userId, address);

  return useMutation({
    mutationFn: async (follow: boolean) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = follow
        ? await supabase
            .from('follows')
            .upsert(
              { follower_id: userId, followee_address: address },
              { onConflict: 'follower_id,followee_address', ignoreDuplicates: true },
            )
        : await supabase.from('follows').delete().eq('follower_id', userId).eq('followee_address', address);
      if (error) throw error;
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData(key, follow);
      return { previous };
    },
    onError: (_error, _follow, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: followKeys.all }),
  });
}
