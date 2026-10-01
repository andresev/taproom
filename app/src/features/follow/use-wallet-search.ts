import type { Address } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/api/supabase';

import type { SearchInput } from './search-input';
import type { WalletSummary } from './types';

const RESULT_LIMIT = 20;

/**
 * Wallets matching the Discover search. An address always yields exactly that
 * wallet, named if it has a profile. A name matches profile display names by
 * prefix, case-insensitively.
 */
export function useWalletSearch(input: SearchInput) {
  const term = input.kind === 'address' ? input.address : input.kind === 'name' ? input.pattern : null;

  return useQuery({
    queryKey: ['wallet-search', input.kind, term],
    enabled: term !== null,
    queryFn: async (): Promise<WalletSummary[]> => {
      if (input.kind === 'address') {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('wallet_address', input.address)
          .maybeSingle();
        if (error) throw error;
        return [{ address: input.address, displayName: (data?.display_name as string | null | undefined) ?? null }];
      }
      if (input.kind !== 'name') return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address, display_name')
        .ilike('display_name', input.pattern)
        .order('display_name')
        .limit(RESULT_LIMIT);
      if (error) throw error;
      return data.map((row) => ({
        address: row.wallet_address as Address,
        displayName: row.display_name as string | null,
      }));
    },
  });
}
