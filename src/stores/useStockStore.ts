import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { Stock, FilterConfig, SortConfig, PriceUpdate } from '@/types/stock';

enableMapSet();
import { executeFilterEngine } from '@/lib/filterEngine';
import { FilterPreset } from '@/lib/filterPresets';

interface StockState {
  stocks: Stock[];
  filteredStocks: Stock[];
  activeFilters: FilterConfig[];
  sortConfig: SortConfig | null;
  selectedSymbol: string | null;
  watchlist: Set<string>;
  pinnedColumns: string[];
  filterExecutionTimeMs: number;
  priceFlashes: Record<string, 'up' | 'down'>;
  isStreaming: boolean;

  // Actions
  setStocks: (stocks: Stock[]) => void;
  setFilter: (filter: FilterConfig) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  applyPreset: (preset: FilterPreset) => void;
  setSortConfig: (sort: SortConfig | null) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleWatchlist: (symbol: string) => void;
  batchUpdatePrices: (updates: Map<string, Partial<Stock>> | PriceUpdate[]) => void;
  clearFlash: (symbol: string) => void;
  setStreaming: (isStreaming: boolean) => void;
}

const LOCAL_STORAGE_WATCHLIST_KEY = 'stock_screener_watchlist_v1';

function loadWatchlistFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set(['RELIANCE', 'TCS', 'HDFCBANK']);
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    console.error('Failed to load watchlist from storage', e);
  }
  return new Set(['RELIANCE', 'TCS', 'HDFCBANK']);
}

function saveWatchlistToStorage(watchlist: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(Array.from(watchlist)));
  } catch (e) {
    console.error('Failed to save watchlist to storage', e);
  }
}

export const useStockStore = create<StockState>()(
  immer((set, get) => ({
    stocks: [],
    filteredStocks: [],
    activeFilters: [],
    sortConfig: null,
    selectedSymbol: null,
    watchlist: loadWatchlistFromStorage(),
    pinnedColumns: ['symbol', 'companyName'],
    filterExecutionTimeMs: 0,
    priceFlashes: {},
    isStreaming: true,

    setStocks: (stocks: Stock[]) => {
      set((state) => {
        state.stocks = stocks;
        const result = executeFilterEngine(
          stocks,
          state.activeFilters,
          state.sortConfig,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    setFilter: (filter: FilterConfig) => {
      set((state) => {
        const idx = state.activeFilters.findIndex((f) => f.id === filter.id);
        if (idx >= 0) {
          state.activeFilters[idx] = filter;
        } else {
          state.activeFilters.push(filter);
        }

        const result = executeFilterEngine(
          state.stocks,
          state.activeFilters,
          state.sortConfig,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    removeFilter: (filterId: string) => {
      set((state) => {
        state.activeFilters = state.activeFilters.filter((f) => f.id !== filterId);
        const result = executeFilterEngine(
          state.stocks,
          state.activeFilters,
          state.sortConfig,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.activeFilters = [];
        const result = executeFilterEngine(
          state.stocks,
          [],
          state.sortConfig,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    applyPreset: (preset: FilterPreset) => {
      set((state) => {
        state.activeFilters = [...preset.filters];
        const result = executeFilterEngine(
          state.stocks,
          state.activeFilters,
          state.sortConfig,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    setSortConfig: (sort: SortConfig | null) => {
      set((state) => {
        state.sortConfig = sort;
        const result = executeFilterEngine(
          state.stocks,
          state.activeFilters,
          sort,
          state.watchlist
        );
        state.filteredStocks = result.filtered;
        state.filterExecutionTimeMs = result.executionTimeMs;
      });
    },

    setSelectedSymbol: (symbol: string | null) => {
      set((state) => {
        state.selectedSymbol = symbol;
      });
    },

    toggleWatchlist: (symbol: string) => {
      set((state) => {
        const nextWatchlist = new Set(state.watchlist);
        if (nextWatchlist.has(symbol)) {
          nextWatchlist.delete(symbol);
        } else {
          nextWatchlist.add(symbol);
        }
        state.watchlist = nextWatchlist;
        saveWatchlistToStorage(nextWatchlist);

        // If filtering by watchlist, re-run
        const hasWatchlistFilter = state.activeFilters.some(
          (f) => f.id === 'watchlist-only' && f.enabled
        );
        if (hasWatchlistFilter) {
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            nextWatchlist
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        }
      });
    },

    batchUpdatePrices: (updates: Map<string, Partial<Stock>> | PriceUpdate[]) => {
      set((state) => {
        const updateEntries: [string, Partial<Stock>][] =
          updates instanceof Map
            ? Array.from(updates.entries())
            : updates.map((u) => [u.symbol, u]);

        if (updateEntries.length === 0) return;

        // Build fast lookup index for filteredStocks
        const filteredMap = new Map<string, number>();
        for (let i = 0; i < state.filteredStocks.length; i++) {
          filteredMap.set(state.filteredStocks[i].symbol, i);
        }

        // Apply mutations
        for (const [sym, patch] of updateEntries) {
          const filteredIdx = filteredMap.get(sym);
          if (filteredIdx !== undefined) {
            const stock = state.filteredStocks[filteredIdx];
            const oldPrice = stock.lastPrice;
            const newPrice = patch.lastPrice ?? oldPrice;

            if (newPrice !== oldPrice) {
              state.priceFlashes[sym] = newPrice > oldPrice ? 'up' : 'down';
            }

            Object.assign(stock, patch);
          }
        }
      });
    },

    clearFlash: (symbol: string) => {
      set((state) => {
        delete state.priceFlashes[symbol];
      });
    },

    setStreaming: (isStreaming: boolean) => {
      set((state) => {
        state.isStreaming = isStreaming;
      });
    },
  }))
);
