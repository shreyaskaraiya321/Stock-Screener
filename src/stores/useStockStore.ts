import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Stock, SortConfig, PriceUpdate } from '@/types/stock';
import { getInitialStockDataset } from '@/lib/mockDataGenerator';
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
  connectionStatus: ConnectionStatus;
  isStreamingActive: boolean;
  isStreaming: boolean;
  lastPriceUpdates: Map<string, PriceUpdateRecord>;
  latestTickCount: number;

  setStocks: (stocks: Stock[]) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleWatchlist: (symbol: string) => void;
  setSortConfig: (colOrSort: keyof Stock | SortConfig | null) => void;
  toggleStreaming: () => void;
  setStreaming: (active: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  batchUpdatePrices: (
    updates: Map<string, Partial<Stock>> | PriceUpdate[] | Map<string, any>
  ) => void;
  clearFlash: (symbol: string) => void;
  updateFilter: (field: string, value: any) => void;
  removeFilter: (field: string) => void;
  clearAllFilters: () => void;
  clearFilters: () => void;
  applyPreset: (preset: string | FilterPreset) => void;
  toggleFilterPanel: () => void;
}

// Module-level cached lookup for O(1) ticker updates across 5,000 items
const masterIndex = new Map<string, number>();

function rebuildMasterIndex(stocks: Stock[]) {
  masterIndex.clear();
  for (let i = 0; i < stocks.length; i++) {
    masterIndex.set(stocks[i].symbol, i);
  }
}

const initialStocks = getInitialStockDataset();
rebuildMasterIndex(initialStocks);

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
      connectionStatus: 'Connected',
      isStreamingActive: true,
      isStreaming: true,
      lastPriceUpdates: new Map(),
      latestTickCount: 0,

      setStocks: (stocks) => {
        rebuildMasterIndex(stocks);
        set((state) => {
          state.stocks = stocks;
          const res = executeFilterEngine(
            stocks,
            state.activeFilters,
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = res.filteredStocks;
          state.filterExecutionTimeMs = res.executionTimeMs;
        });
      },

      setSelectedSymbol: (symbol) => {
        set((state) => {
          state.selectedSymbol = symbol;
        });
      },

      toggleWatchlist: (symbol) => {
        set((state) => {
          const idx = state.watchlist.indexOf(symbol);
          if (idx >= 0) state.watchlist.splice(idx, 1);
          else state.watchlist.push(symbol);

          if (state.activeFilters.watchlistOnly) {
            const res = executeFilterEngine(
              state.stocks,
              state.activeFilters,
              state.sortConfig,
              state.watchlist
            );
            state.filteredStocks = res.filteredStocks;
            state.filterExecutionTimeMs = res.executionTimeMs;
          }
        });
      },

      setSortConfig: (colOrSort) => {
        set((state) => {
          let next: SortConfig;
          if (!colOrSort) {
            next = { column: 'marketCap', direction: 'desc' };
          } else if (typeof colOrSort === 'object') {
            next = colOrSort;
          } else {
            const isSame = state.sortConfig.column === colOrSort;
            next = {
              column: colOrSort,
              direction: isSame && state.sortConfig.direction === 'desc' ? 'asc' : 'desc',
            };
          }
          state.sortConfig = next;
          const res = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            next,
            state.watchlist
          );
          state.filteredStocks = res.filteredStocks;
          state.filterExecutionTimeMs = res.executionTimeMs;
        });
      },

      toggleStreaming: () => {
        set((state) => {
          state.isStreamingActive = !state.isStreamingActive;
          state.isStreaming = state.isStreamingActive;
          state.connectionStatus = state.isStreamingActive ? 'Connected' : 'Paused';
        });
      },

      setStreaming: (active) => {
        set((state) => {
          state.isStreamingActive = active;
          state.isStreaming = active;
          state.connectionStatus = active ? 'Connected' : 'Paused';
        });
      },

      setConnectionStatus: (status) => {
        set((state) => {
          state.connectionStatus = status;
        });
      },

      batchUpdatePrices: (updates) => {
        set((state) => {
          const entries: [string, Partial<Stock>][] =
            updates instanceof Map
              ? Array.from(updates.entries())
              : updates.map((u) => [u.symbol, u]);

          if (entries.length === 0) return;
          state.latestTickCount = entries.length;
          const now = Date.now();

          // Ephemeral map for current filtered view to avoid scanning N items per update
          const filteredIndex = new Map<string, number>();
          for (let i = 0; i < state.filteredStocks.length; i++) {
            filteredIndex.set(state.filteredStocks[i].symbol, i);
          }

          for (let i = 0; i < entries.length; i++) {
            const [sym, patch] = entries[i];

            // 1. Update filtered stock row if visible
            const fIdx = filteredIndex.get(sym);
            if (fIdx !== undefined) {
              const row = state.filteredStocks[fIdx];
              const prev = row.lastPrice;
              const next = patch.lastPrice ?? prev;
              const dir = next >= prev ? 'up' : 'down';

              if (next !== prev) {
                state.priceFlashes[sym] = dir;
                state.lastPriceUpdates.set(sym, { direction: dir, timestamp: now });
              }
              Object.assign(row, patch);
            }

            // 2. Synchronize master stock record
            const mIdx = masterIndex.get(sym);
            if (mIdx !== undefined) {
              Object.assign(state.stocks[mIdx], patch);
            }
          }
        });
      },

      clearFlash: (symbol) => {
        set((state) => {
          delete state.priceFlashes[symbol];
          state.lastPriceUpdates.delete(symbol);
        });
      },

      updateFilter: (field, value) => {
        set((state) => {
          const isEmpty =
            value == null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' &&
              !Array.isArray(value) &&
              (value.min == null || isNaN(value.min)) &&
              (value.max == null || isNaN(value.max)));

          if (isEmpty) {
            delete state.activeFilters[field];
          } else {
            state.activeFilters[field] = value;
          }

          const res = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = res.filteredStocks;
          state.filterExecutionTimeMs = res.executionTimeMs;
        });
      },

      removeFilter: (field) => {
        set((state) => {
          delete state.activeFilters[field];
          const res = executeFilterEngine(
            state.stocks,
            state.activeFilters,
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = res.filteredStocks;
          state.filterExecutionTimeMs = res.executionTimeMs;
        });
      },

      clearAllFilters: () => {
        set((state) => {
          state.activeFilters = {};
          const res = executeFilterEngine(
            state.stocks,
            {},
            state.sortConfig,
            state.watchlist
          );
          state.filteredStocks = res.filteredStocks;
          state.filterExecutionTimeMs = res.executionTimeMs;
        });
      },

      clearFilters: () => {
        get().clearAllFilters();
      },

      applyPreset: (presetOrName) => {
        set((state) => {
          const preset =
            typeof presetOrName === 'string' ? PRESET_MAP[presetOrName] : presetOrName;
          if (preset) {
            state.activeFilters = { ...preset.filterMap };
            const res = executeFilterEngine(
              state.stocks,
              state.activeFilters,
              state.sortConfig,
              state.watchlist
            );
            state.filteredStocks = res.filteredStocks;
            state.filterExecutionTimeMs = res.executionTimeMs;
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
