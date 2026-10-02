import { create } from 'zustand';

/**
 * Where sign-in stands, across both systems: Privy (identity and the embedded
 * wallet) and Supabase (profile, follows).
 *
 * - `loading`: Privy has not finished starting up.
 * - `signed-out`: no Privy user.
 * - `linking`: signed in to Privy; creating the wallet or the Supabase session.
 * - `ready`: both sessions exist and belong to the same user.
 * - `error`: linking failed; `error` says why and `retry` tries again.
 */
export type AuthStatus = 'loading' | 'signed-out' | 'linking' | 'ready' | 'error';

interface AuthState {
  status: AuthStatus;
  error: string | null;
  /** Bumped to make the bridge try again after an error. */
  attempt: number;
  set: (state: { status: AuthStatus; error?: string | null }) => void;
  retry: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  error: null,
  attempt: 0,
  set: ({ status, error = null }) => set({ status, error }),
  retry: () => set((state) => ({ status: 'linking', error: null, attempt: state.attempt + 1 })),
}));
