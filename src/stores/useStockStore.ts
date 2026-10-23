import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Stock, SortConfig, PriceUpdate } from '@/types/stock';
import { generateMockStocks } from '@/lib/mockDataGenerator';
import { executeFilterEngine, ActiveFiltersState } from '@/lib/filterEngine';
import { FilterPreset, PRESET_MAP } from '@/lib/filterPresets';

enableMapSet();

export type ConnectionStatus = 'Connected' | 'Reconnecting' | 'Paused';

export interface PriceUpdateRecord {
  direction: 'up' | 'down';
  timestamp: number;
}

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
  
  // Real-time streaming state (Step 5)
  connectionStatus: ConnectionStatus;
  isStreamingActive: boolean;
  isStreaming: boolean; // Alias
  lastPriceUpdates: Map<string, PriceUpdateRecord>;
  latestTickCount: number;

  // Actions
  setStocks: (stocks: Stock[]) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleWatchlist: (symbol: string) => void;
  setSortConfig: (columnOrSort: keyof Stock | SortConfig | null) => void;
  
  // Step 5 Streaming Actions
  toggleStreaming: () => void;
  setStreaming: (isStreaming: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  batchUpdatePrices: (
    updates: Map<string, Partial<Stock>> | PriceUpdate[] | Map<string, any>
  ) => void;
  clearFlash: (symbol: string) => void;

  // Filter Actions
  updateFilter: (field: string, value: any) => void;
  removeFilter: (field: string) => void;
  clearAllFilters: () => void;
  clearFilters: () => void;
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

      // Real-time streaming initial state
      connectionStatus: 'Connected',
      isStreamingActive: true,
      isStreaming: true,
      lastPriceUpdates: new Map<string, PriceUpdateRecord>(),
      latestTickCount: 0,

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

      // Streaming Actions
      toggleStreaming: () => {
        set((state) => {
          state.isStreamingActive = !state.isStreamingActive;
          state.isStreaming = state.isStreamingActive;
          state.connectionStatus = state.isStreamingActive ? 'Connected' : 'Paused';
        });
      },

      setStreaming: (active: boolean) => {
        set((state) => {
          state.isStreamingActive = active;
          state.isStreaming = active;
          state.connectionStatus = active ? 'Connected' : 'Paused';
        });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set((state) => {
          state.connectionStatus = status;
        });
      },

      batchUpdatePrices: (
        updates: Map<string, Partial<Stock>> | PriceUpdate[] | Map<string, any>
      ) => {
        set((state) => {
          const entries: [string, Partial<Stock>][] =
            updates instanceof Map
              ? Array.from(updates.entries())
              : updates.map((u) => [u.symbol, u]);

          if (entries.length === 0) return;

          const now = Date.now();
          state.latestTickCount = entries.length;

          // Index maps for constant-time mutations
          const filteredMap = new Map<string, number>();
          for (let i = 0; i < state.filteredStocks.length; i++) {
            filteredMap.set(state.filteredStocks[i].symbol, i);
          }

          const masterMap = new Map<string, number>();
          for (let i = 0; i < state.stocks.length; i++) {
            masterMap.set(state.stocks[i].symbol, i);
          }

          for (const [sym, patch] of entries) {
            const filteredIdx = filteredMap.get(sym);
            if (filteredIdx !== undefined) {
              const stock = state.filteredStocks[filteredIdx];
              const oldPrice = stock.lastPrice;
              const newPrice = patch.lastPrice ?? oldPrice;
              const direction: 'up' | 'down' = newPrice >= oldPrice ? 'up' : 'down';

              if (newPrice !== oldPrice) {
                state.priceFlashes[sym] = direction;
                state.lastPriceUpdates.set(sym, { direction, timestamp: now });
              }

              Object.assign(stock, patch);
            }

            // Also synchronize in master stocks list
            const masterIdx = masterMap.get(sym);
            if (masterIdx !== undefined) {
              Object.assign(state.stocks[masterIdx], patch);
            }
          }
        });
      },

      clearFlash: (symbol: string) => {
        set((state) => {
          delete state.priceFlashes[symbol];
          state.lastPriceUpdates.delete(symbol);
        });
      },

      // Filter Actions
      updateFilter: (field: string, value: any) => {
        set((state) => {
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
