import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Stock, FilterConfig, SortConfig, PriceUpdate } from '@/types/stock';
import { generateMockStocks } from '@/lib/mockDataGenerator';
import { executeFilterEngine } from '@/lib/filterEngine';
import { FilterPreset } from '@/lib/filterPresets';

enableMapSet();

export interface StockStoreState {
  stocks: Stock[];
  filteredStocks: Stock[];
  activeFilters: FilterConfig[];
  sortConfig: SortConfig;
  selectedSymbol: string | null;
  watchlist: string[];
  pinnedColumns: string[];
  filterExecutionTimeMs: number;
  priceFlashes: Record<string, 'up' | 'down'>;
  isStreaming: boolean;

  // Actions
  setStocks: (stocks: Stock[]) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleWatchlist: (symbol: string) => void;
  setSortConfig: (columnOrSort: keyof Stock | SortConfig | null) => void;
  batchUpdatePrices: (
    updates: Map<string, { lastPrice: number; changePercent?: number; [key: string]: any }> | PriceUpdate[]
  ) => void;
  clearFlash: (symbol: string) => void;
  setStreaming: (isStreaming: boolean) => void;

  // Filter actions
  setFilter: (filter: FilterConfig) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  applyPreset: (preset: FilterPreset) => void;
}

// Initial 5,000 stocks sorted by marketCap desc
const initialStocks = generateMockStocks(5000).sort((a, b) => b.marketCap - a.marketCap);

export const useStockStore = create<StockStoreState>()(
  persist(
    immer((set, get) => ({
      stocks: initialStocks,
      filteredStocks: initialStocks,
      activeFilters: [],
      sortConfig: { column: 'marketCap', direction: 'desc' },
      selectedSymbol: null,
      watchlist: ['RELIANCE', 'TCS', 'HDFCBANK'],
      pinnedColumns: ['symbol'],
      filterExecutionTimeMs: 0,
      priceFlashes: {},
      isStreaming: true,

      setStocks: (stocks: Stock[]) => {
        set((state) => {
          state.stocks = stocks;
          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            stocks,
            state.activeFilters,
            state.sortConfig,
            watchlistSet
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
          const index = state.watchlist.indexOf(symbol);
          if (index >= 0) {
            state.watchlist.splice(index, 1);
          } else {
            state.watchlist.push(symbol);
          }

          // If filtering by watchlist, update filteredStocks
          const hasWatchlistFilter = state.activeFilters.some(
            (f) => f.id === 'watchlist-only' && f.enabled
          );
          if (hasWatchlistFilter) {
            const watchlistSet = new Set(state.watchlist);
            const result = executeFilterEngine(
              state.stocks,
              state.activeFilters,
              state.sortConfig,
              watchlistSet
            );
            state.filteredStocks = result.filtered;
            state.filterExecutionTimeMs = result.executionTimeMs;
          }
        });
      },

      // Cycles: desc -> asc -> desc
      setSortConfig: (columnOrSort: keyof Stock | SortConfig | null) => {
        set((state) => {
          let nextSort: SortConfig;

          if (!columnOrSort) {
            nextSort = { column: 'marketCap', direction: 'desc' };
          } else if (typeof columnOrSort === 'object') {
            nextSort = columnOrSort;
          } else {
            const column = columnOrSort;
            if (state.sortConfig.column === column) {
              nextSort = {
                column,
                direction: state.sortConfig.direction === 'desc' ? 'asc' : 'desc',
              };
            } else {
              nextSort = { column, direction: 'desc' };
            }
          }

          state.sortConfig = nextSort;
          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            nextSort,
            watchlistSet
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      batchUpdatePrices: (
        updates: Map<string, { lastPrice: number; changePercent?: number; [key: string]: any }> | PriceUpdate[]
      ) => {
        set((state) => {
          const entries: [string, any][] =
            updates instanceof Map
              ? Array.from(updates.entries())
              : updates.map((u) => [u.symbol, u]);

          if (entries.length === 0) return;

          // Map for fast index lookup
          const filteredMap = new Map<string, number>();
          for (let i = 0; i < state.filteredStocks.length; i++) {
            filteredMap.set(state.filteredStocks[i].symbol, i);
          }

          for (const [sym, patch] of entries) {
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

      setFilter: (filter: FilterConfig) => {
        set((state) => {
          const idx = state.activeFilters.findIndex((f) => f.id === filter.id);
          if (idx >= 0) {
            state.activeFilters[idx] = filter;
          } else {
            state.activeFilters.push(filter);
          }

          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            watchlistSet
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      removeFilter: (filterId: string) => {
        set((state) => {
          state.activeFilters = state.activeFilters.filter((f) => f.id !== filterId);
          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            watchlistSet
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      clearFilters: () => {
        set((state) => {
          state.activeFilters = [];
          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            state.stocks,
            [],
            state.sortConfig,
            watchlistSet
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      applyPreset: (preset: FilterPreset) => {
        set((state) => {
          state.activeFilters = [...preset.filters];
          const watchlistSet = new Set(state.watchlist);
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            watchlistSet
          );
          state.filteredStocks = result.filtered;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },
    })),
    {
      name: 'stock_screener_watchlist_storage',
      partialize: (state) => ({ watchlist: state.watchlist }),
    }
  )
);
