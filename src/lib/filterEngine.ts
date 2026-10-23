import { Stock, FilterConfig, SortConfig } from '@/types/stock';

export interface FilterResult {
  filteredStocks: Stock[];
  filtered: Stock[]; // Alias for backwards compatibility
  executionTimeMs: number;
}

export type FilterValue =
  | { min?: number | null; max?: number | null }
  | [number, number]
  | string[]
  | string
  | number
  | boolean
  | null
  | undefined;

export type ActiveFiltersState = Record<string, FilterValue>;

// Numerical fields for selectivity reordering (evaluated first)
const NUMERICAL_FIELDS = new Set([
  'marketCap',
  'pe',
  'pb',
  'dividendYield',
  'roe',
  'roce',
  'debtToEquity',
  'currentRatio',
  'promoterHolding',
  'revenueGrowthYoY',
  'profitGrowthYoY',
  'rsi14',
  'week52High',
  'week52Low',
  'priceVsSma50',
  'priceVsSma200',
]);

const SINGLE_SELECT_FIELDS = new Set(['macdSignal', 'bollingerPosition', 'volumeVsAvg']);
const CATEGORICAL_FIELDS = new Set(['sector', 'marketCapCategory', 'indexMembership']);

interface CompiledPredicate {
  field: string;
  type: 'range' | 'multi' | 'single' | 'boolean' | 'legacy';
  evalFn: (stock: Stock, watchlistSet?: Set<string>) => boolean;
}

/**
 * Compiles and re-orders active filters by selectivity so expensive multi-selects run last
 */
function compileFilters(
  filters: ActiveFiltersState | FilterConfig[],
  watchlistSet?: Set<string>
): CompiledPredicate[] {
  const predicates: CompiledPredicate[] = [];

  // Handle Array of FilterConfig (legacy / benchmark test)
  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (!f.enabled) continue;
      predicates.push({
        field: String(f.field),
        type: NUMERICAL_FIELDS.has(String(f.field)) ? 'range' : 'legacy',
        evalFn: (stock) => {
          if (f.id === 'watchlist-only' || f.field === ('watchlistOnly' as any)) {
            return watchlistSet ? watchlistSet.has(stock.symbol) : false;
          }
          if (f.field === ('priceVsSma50' as any)) {
            if (f.value === 'Above') return stock.lastPrice > stock.sma50;
            if (f.value === 'Below') return stock.lastPrice <= stock.sma50;
            return true;
          }
          if (f.field === ('priceVsSma200' as any)) {
            if (f.value === 'Above') return stock.lastPrice > stock.sma200;
            if (f.value === 'Below') return stock.lastPrice <= stock.sma200;
            return true;
          }

          const rawVal = stock[f.field];
          switch (f.operator) {
            case 'eq':
              return rawVal === f.value;
            case 'neq':
              return rawVal !== f.value;
            case 'gte':
              return typeof rawVal === 'number' && rawVal >= f.value;
            case 'gt':
              return typeof rawVal === 'number' && rawVal > f.value;
            case 'lte':
              return typeof rawVal === 'number' && rawVal <= f.value;
            case 'lt':
              return typeof rawVal === 'number' && rawVal < f.value;
            case 'between': {
              if (typeof rawVal !== 'number') return false;
              const [min, max] = f.value as [number, number];
              return rawVal >= min && rawVal <= max;
            }
            case 'in': {
              const arr = Array.isArray(f.value) ? f.value : [f.value];
              if (arr.length === 0) return true;
              if (Array.isArray(rawVal)) {
                return rawVal.some((item) => arr.includes(item));
              }
              return arr.includes(rawVal);
            }
            default:
              return true;
          }
        },
      });
    }
  } else {
    // Handle Record<string, FilterValue>
    for (const [field, val] of Object.entries(filters)) {
      if (val === null || val === undefined || val === '') continue;

      // 1. Boolean Watchlist
      if (field === 'watchlistOnly') {
        if (val === true) {
          predicates.push({
            field,
            type: 'boolean',
            evalFn: (stock) => (watchlistSet ? watchlistSet.has(stock.symbol) : false),
          });
        }
        continue;
      }

      // 2. Numerical Range
      if (NUMERICAL_FIELDS.has(field)) {
        if (field === 'priceVsSma50') {
          if (val === 'Above') {
            predicates.push({
              field,
              type: 'range',
              evalFn: (stock) => stock.lastPrice > stock.sma50,
            });
          } else if (val === 'Below') {
            predicates.push({
              field,
              type: 'range',
              evalFn: (stock) => stock.lastPrice <= stock.sma50,
            });
          }
          continue;
        }

        if (field === 'priceVsSma200') {
          if (val === 'Above') {
            predicates.push({
              field,
              type: 'range',
              evalFn: (stock) => stock.lastPrice > stock.sma200,
            });
          } else if (val === 'Below') {
            predicates.push({
              field,
              type: 'range',
              evalFn: (stock) => stock.lastPrice <= stock.sma200,
            });
          }
          continue;
        }

        // Standard numerical bounds
        let minVal: number | null = null;
        let maxVal: number | null = null;

        if (Array.isArray(val) && val.length === 2) {
          minVal = typeof val[0] === 'number' ? val[0] : null;
          maxVal = typeof val[1] === 'number' ? val[1] : null;
        } else if (typeof val === 'object' && !Array.isArray(val)) {
          const obj = val as { min?: number | null; max?: number | null };
          minVal = typeof obj.min === 'number' && !isNaN(obj.min) ? obj.min : null;
          maxVal = typeof obj.max === 'number' && !isNaN(obj.max) ? obj.max : null;
        } else if (typeof val === 'number') {
          minVal = val;
        }

        if (minVal !== null || maxVal !== null) {
          predicates.push({
            field,
            type: 'range',
            evalFn: (stock) => {
              const num = stock[field as keyof Stock];
              if (typeof num !== 'number') return false;
              if (minVal !== null && num < minVal) return false;
              if (maxVal !== null && num > maxVal) return false;
              return true;
            },
          });
        }
        continue;
      }

      // 3. Single-Select
      if (SINGLE_SELECT_FIELDS.has(field)) {
        if (typeof val === 'string') {
          predicates.push({
            field,
            type: 'single',
            evalFn: (stock) => stock[field as keyof Stock] === val,
          });
        }
        continue;
      }

      // 4. Multi-Select Categorical
      if (CATEGORICAL_FIELDS.has(field)) {
        const arr = Array.isArray(val) ? val : [val];
        if (arr.length > 0) {
          predicates.push({
            field,
            type: 'multi',
            evalFn: (stock) => {
              const raw = stock[field as keyof Stock];
              if (Array.isArray(raw)) {
                return raw.some((item) => arr.includes(item));
              }
              return arr.includes(raw);
            },
          });
        }
        continue;
      }
    }
  }

  // Re-order predicates by selectivity:
  // 1. Numerical range filters first (fastest & eliminates most records)
  // 2. Single-select (fast equality)
  // 3. Boolean watchlist
  // 4. Multi-select (array lookups) last
  return predicates.sort((a, b) => {
    const priority = { range: 1, single: 2, boolean: 3, legacy: 4, multi: 5 };
    return priority[a.type] - priority[b.type];
  });
}

/**
 * High-Performance Combinatorial Filter Engine (<200ms for 5,000+ items)
 */
export function executeFilterEngine(
  stocks: Stock[],
  filters: ActiveFiltersState | FilterConfig[],
  sortConfig: SortConfig | null = null,
  watchlist?: Set<string> | string[]
): FilterResult {
  const start = performance.now();

  const watchlistSet =
    watchlist instanceof Set ? watchlist : watchlist ? new Set(watchlist) : undefined;

  const predicates = compileFilters(filters, watchlistSet);

  let filtered: Stock[];

  if (predicates.length === 0) {
    filtered = [...stocks];
  } else {
    filtered = [];
    const predCount = predicates.length;

    // Single pass with short-circuit evaluation
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      let match = true;

      for (let p = 0; p < predCount; p++) {
        if (!predicates[p].evalFn(stock, watchlistSet)) {
          match = false;
          break; // Short-circuit
        }
      }

      if (match) {
        filtered.push(stock);
      }
    }
  }

  // Apply sorting
  if (sortConfig) {
    const { column, direction } = sortConfig;
    const modifier = direction === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * modifier;
      }
      return String(valA).localeCompare(String(valB)) * modifier;
    });
  }

  const end = performance.now();
  const executionTimeMs = Number((end - start).toFixed(2));

  return {
    filteredStocks: filtered,
    filtered, // Alias
    executionTimeMs,
  };
}

// Export default alias
export const filterStocks = executeFilterEngine;
