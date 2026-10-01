import { create } from 'zustand';

import { DEFAULT_SLIPPAGE_BPS } from './slippage';

interface SlippageState {
  slippageBps: number;
  /** Only ever called from an explicit user action. */
  setSlippageBps: (bps: number) => void;
}

export const useSlippageStore = create<SlippageState>((set) => ({
  slippageBps: DEFAULT_SLIPPAGE_BPS,
  setSlippageBps: (slippageBps) => set({ slippageBps }),
}));
