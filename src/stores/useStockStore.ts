import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Stock, SortConfig, PriceUpdate } from '@/types/stock';
import { generateMockStocks } from '@/lib/mockDataGenerator';
import { executeFilterEngine, ActiveFiltersState } from '@/lib/filterEngine';
import { FilterPreset, PRESET_MAP } from '@/lib/filterPresets';

enableMapSet();

export interface StockStoreState {
  stocks: Stock[];
  filteredStocks: Stock[];
  activeFilters: ActiveFiltersState;
  filterExecutionTimeMs: number;
  isFilterOpen: boolean;
  sortConfig: SortConfig;
  selectedSymbol: string | null;
  watchlist: string[];
  pinnedColumns: string[];
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

  // Filter Actions
  updateFilter: (field: string, value: any) => void;
  removeFilter: (field: string) => void;
  clearAllFilters: () => void;
  clearFilters: () => void; // Alias
  applyPreset: (presetNameOrPreset: string | FilterPreset) => void;
  toggleFilterPanel: () => void;
}

// Initial 5,000 stocks sorted by marketCap desc
const initialStocks = generateMockStocks(5000).sort((a, b) => b.marketCap - a.marketCap);

export const useStockStore = create<StockStoreState>()(
  persist(
    immer((set, get) => ({
      stocks: initialStocks,
      filteredStocks: initialStocks,
      activeFilters: {},
      filterExecutionTimeMs: 0,
      isFilterOpen: true,
      sortConfig: { column: 'marketCap', direction: 'desc' },
      selectedSymbol: null,
      watchlist: ['RELIANCE', 'TCS', 'HDFCBANK'],
      pinnedColumns: ['symbol'],
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
          state.filteredStocks = result.filteredStocks;
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

          if (state.activeFilters.watchlistOnly) {
            const result = executeFilterEngine(
              state.stocks,
              state.activeFilters,
              state.sortConfig,
              state.watchlist
            );
            state.filteredStocks = result.filteredStocks;
            state.filterExecutionTimeMs = result.executionTimeMs;
          }
        });
      },

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
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            nextSort,
            state.watchlist
          );
          state.filteredStocks = result.filteredStocks;
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

      // Filter Actions
      updateFilter: (field: string, value: any) => {
        set((state) => {
          // If value is null, undefined, or empty array, remove filter
          if (
            value === null ||
            value === undefined ||
            value === '' ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' &&
              !Array.isArray(value) &&
              (value.min === null || value.min === undefined || isNaN(value.min)) &&
              (value.max === null || value.max === undefined || isNaN(value.max)))
          ) {
            delete state.activeFilters[field];
          } else {
            state.activeFilters[field] = value;
          }

          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = result.filteredStocks;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      removeFilter: (field: string) => {
        set((state) => {
          delete state.activeFilters[field];
          const result = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = result.filteredStocks;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      clearAllFilters: () => {
        set((state) => {
          state.activeFilters = {};
          const result = executeFilterEngine(
            state.stocks,
            {},
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = result.filteredStocks;
          state.filterExecutionTimeMs = result.executionTimeMs;
        });
      },

      clearFilters: () => {
        get().clearAllFilters();
      },

      applyPreset: (presetNameOrPreset: string | FilterPreset) => {
        set((state) => {
          let preset: FilterPreset | undefined;
          if (typeof presetNameOrPreset === 'string') {
            preset = PRESET_MAP[presetNameOrPreset];
          } else {
            preset = presetNameOrPreset;
          }

          if (preset) {
            state.activeFilters = { ...preset.filterMap };
            const result = executeFilterEngine(
              state.stocks,
              state.activeFilters,
              state.sortConfig,
              state.watchlist
            );
            state.filteredStocks = result.filteredStocks;
            state.filterExecutionTimeMs = result.executionTimeMs;
          }
        });
      },

      toggleFilterPanel: () => {
        set((state) => {
          state.isFilterOpen = !state.isFilterOpen;
        });
      },
    })),
    {
      name: 'stock_screener_watchlist_storage',
      partialize: (state) => ({ watchlist: state.watchlist }),
    }
  )
);
