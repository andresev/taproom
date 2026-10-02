import { useEmbeddedEthereumWallet, useIdentityToken, usePrivy } from '@privy-io/expo';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useEffect } from 'react';

import { supabase } from '@/lib/api/supabase';

import { useAuthStore } from './auth-store';
import { useSession } from './use-session';

/** The message from the sign-in function's JSON error body, when there is one. */
async function describe(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: unknown } | null;
    if (typeof body?.error === 'string') return body.error;
  }
  return error instanceof Error ? error.message : 'Sign-in failed.';
}

/**
 * Keeps the Supabase session in step with the Privy one. Mount once, at the root.
 *
 * After a Privy sign-in it makes sure the embedded wallet exists, then trades
 * Privy's signed identity token for a Supabase session through the
 * `privy-session` function, which also creates the profile. After a Privy
 * sign-out it ends the Supabase session. Progress is published to the auth store.
 */
export function useAuthBridge() {
  const { isReady, user, refreshUser } = usePrivy();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const { getIdentityToken } = useIdentityToken();
  const { session, isLoading: sessionLoading } = useSession();
  const attempt = useAuthStore((state) => state.attempt);
  const setAuth = useAuthStore((state) => state.set);

  const privyDid = user?.id ?? null;
  const sessionDid = (session?.user.app_metadata.privy_did as string | undefined) ?? null;
  const walletAddress = wallets.at(0)?.address;

  useEffect(() => {
    if (!isReady || sessionLoading) return;
    let cancelled = false;

    async function sync() {
      if (!privyDid) {
        // Only end sessions this bridge created; leave any other kind alone.
        if (sessionDid) await supabase.auth.signOut();
        if (!cancelled) setAuth({ status: 'signed-out' });
        return;
      }
      if (sessionDid === privyDid) {
        setAuth({ status: 'ready' });
        return;
      }

      setAuth({ status: 'linking' });
      // A session for a different Privy user must not survive a switch of account.
      if (sessionDid) await supabase.auth.signOut();

      let address: string | undefined = walletAddress;
      if (!address) {
        const created = await create();
        address = created.user.linked_accounts.find(
          (account): account is typeof account & { address: string } =>
            account.type === 'wallet' && 'address' in account && typeof account.address === 'string',
        )?.address;
      }

      // The identity token must list the wallet, so refresh it after any wallet creation.
      await refreshUser();
      const identityToken = await getIdentityToken();
      if (!identityToken) throw new Error('Privy returned no identity token. Is it enabled in the Privy dashboard?');
      if (cancelled) return;

      const { data, error } = await supabase.functions.invoke<{ tokenHash: string }>('privy-session', {
        body: { identityToken, walletAddress: address },
      });
      if (error) throw error;
      if (!data?.tokenHash) throw new Error('The sign-in service returned no session.');

      const verified = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: 'email' });
      if (verified.error) throw verified.error;
      if (!cancelled) setAuth({ status: 'ready' });
    }

    sync().catch(async (error: unknown) => {
      const message = await describe(error);
      if (!cancelled) setAuth({ status: 'error', error: message });
    });

    return () => {
      cancelled = true;
    };
    // `create`, `refreshUser` and `getIdentityToken` are not stable between renders;
    // the values below are what should restart the sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, sessionLoading, privyDid, sessionDid, attempt]);
}
