import { useAccount, useAppKit } from '@reown/appkit-react-native';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getAddress } from 'viem';
import { generateSiweNonce } from 'viem/siwe';
import { useSignMessage } from 'wagmi';

import { supabase } from '@/lib/api/supabase';
import { buildSignInMessage } from '@/lib/chain/siwe';
import { appUrl } from '@/lib/chain/wallet';

import { sessionWalletAddress, useSession } from './use-session';

/**
 * Sign in with Ethereum: the connected wallet signs a message, Supabase Auth
 * verifies the signature and issues the session. A database trigger creates the
 * `profiles` row from the verified address, so nothing the client sends decides
 * which wallet a profile belongs to.
 */
export function useWalletSignIn() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect a wallet first.');
      const message = buildSignInMessage({
        address: getAddress(address),
        appUrl,
        nonce: generateSiweNonce(),
        issuedAt: new Date(),
      });
      const signature = await signMessageAsync({ message });
      const { data, error } = await supabase.auth.signInWithWeb3({ chain: 'ethereum', message, signature });
      if (error) throw error;
      return data.session;
    },
  });
}

/** Ends the Supabase session and disconnects the wallet. */
export function useWalletSignOut() {
  const { disconnect } = useAppKit();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      disconnect();
    },
  });
}

/**
 * Ends the session if the connected wallet is not the one it was created for,
 * for example after switching accounts in the wallet app. A disconnected wallet
 * is left alone: on a cold start the session is restored before the wallet
 * reconnects.
 */
export function useWalletSessionGuard() {
  const { address, isConnected } = useAccount();
  const { session } = useSession();
  const sessionAddress = sessionWalletAddress(session);

  useEffect(() => {
    if (isConnected && address && sessionAddress && address.toLowerCase() !== sessionAddress) {
      void supabase.auth.signOut();
    }
  }, [isConnected, address, sessionAddress]);
}
