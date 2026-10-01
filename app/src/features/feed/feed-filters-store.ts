import { create } from 'zustand';

import { DEFAULT_FEED_FILTERS, type FeedFilters } from './feed-filters';

interface FeedFiltersState extends FeedFilters {
  setFilters: (filters: Partial<FeedFilters>) => void;
  reset: () => void;
}

/** In memory only: the Feed tab opens on the defaults (Trending) every launch. */
export const useFeedFiltersStore = create<FeedFiltersState>((set) => ({
  ...DEFAULT_FEED_FILTERS,
  setFilters: (filters) => set(filters),
  reset: () => set(DEFAULT_FEED_FILTERS),
}));
