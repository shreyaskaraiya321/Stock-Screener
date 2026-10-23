import { Stock, FilterConfig, SortConfig } from '@/types/stock';

export interface FilterResult {
  filteredStocks: Stock[];
  filtered: Stock[];
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

type PredicateFn = (stock: Stock) => boolean;

interface RankedPredicate {
  priority: number;
  test: PredicateFn;
}

const OPERATOR_MAP: Record<string, (a: any, b: any) => boolean> = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gte: (a, b) => typeof a === 'number' && a >= b,
  gt: (a, b) => typeof a === 'number' && a > b,
  lte: (a, b) => typeof a === 'number' && a <= b,
  lt: (a, b) => typeof a === 'number' && a < b,
  between: (a, b) => typeof a === 'number' && Array.isArray(b) && a >= b[0] && a <= b[1],
  in: (a, b) => {
    const arr = Array.isArray(b) ? b : [b];
    if (arr.length === 0) return true;
    return Array.isArray(a) ? a.some((item) => arr.includes(item)) : arr.includes(a);
  },
};

const NUMERIC_FIELDS = new Set([
  'marketCap', 'pe', 'pb', 'dividendYield', 'roe', 'roce', 'debtToEquity',
  'currentRatio', 'promoterHolding', 'revenueGrowthYoY', 'profitGrowthYoY',
  'rsi14', 'week52High', 'week52Low', 'priceVsSma50', 'priceVsSma200',
]);

const SINGLE_SELECT_FIELDS = new Set(['macdSignal', 'bollingerPosition', 'volumeVsAvg']);
const CATEGORICAL_FIELDS = new Set(['sector', 'marketCapCategory', 'indexMembership']);

function compilePredicates(
  filters: ActiveFiltersState | FilterConfig[],
  watchlistSet?: Set<string>
): PredicateFn[] {
  const ranked: RankedPredicate[] = [];

  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (!f.enabled) continue;

      if (f.id === 'watchlist-only' || (f.field as string) === 'watchlistOnly') {
        ranked.push({
          priority: 3,
          test: (s) => (watchlistSet ? watchlistSet.has(s.symbol) : false),
        });
        continue;
      }

      if ((f.field as string) === 'priceVsSma50') {
        ranked.push({
          priority: 1,
          test: (s) => (f.value === 'Above' ? s.lastPrice > s.sma50 : f.value === 'Below' ? s.lastPrice <= s.sma50 : true),
        });
        continue;
      }

      if ((f.field as string) === 'priceVsSma200') {
        ranked.push({
          priority: 1,
          test: (s) => (f.value === 'Above' ? s.lastPrice > s.sma200 : f.value === 'Below' ? s.lastPrice <= s.sma200 : true),
        });
        continue;
      }

      const op = OPERATOR_MAP[f.operator] || (() => true);
      const isNum = NUMERIC_FIELDS.has(String(f.field));
      ranked.push({
        priority: isNum ? 1 : 4,
        test: (s) => op(s[f.field], f.value),
      });
    }
  } else {
    for (const [key, val] of Object.entries(filters)) {
      if (val === null || val === undefined || val === '') continue;

      if (key === 'watchlistOnly') {
        if (val === true) {
          ranked.push({
            priority: 3,
            test: (s) => (watchlistSet ? watchlistSet.has(s.symbol) : false),
          });
        }
        continue;
      }

      if (key === 'priceVsSma50') {
        if (val === 'Above') ranked.push({ priority: 1, test: (s) => s.lastPrice > s.sma50 });
        else if (val === 'Below') ranked.push({ priority: 1, test: (s) => s.lastPrice <= s.sma50 });
        continue;
      }

      if (key === 'priceVsSma200') {
        if (val === 'Above') ranked.push({ priority: 1, test: (s) => s.lastPrice > s.sma200 });
        else if (val === 'Below') ranked.push({ priority: 1, test: (s) => s.lastPrice <= s.sma200 });
        continue;
      }

      if (NUMERIC_FIELDS.has(key)) {
        let min: number | null = null;
        let max: number | null = null;

        if (Array.isArray(val) && val.length === 2) {
          min = typeof val[0] === 'number' ? val[0] : null;
          max = typeof val[1] === 'number' ? val[1] : null;
        } else if (typeof val === 'object' && !Array.isArray(val)) {
          const obj = val as { min?: number | null; max?: number | null };
          min = typeof obj.min === 'number' && !isNaN(obj.min) ? obj.min : null;
          max = typeof obj.max === 'number' && !isNaN(obj.max) ? obj.max : null;
        } else if (typeof val === 'number') {
          min = val;
        }

        if (min !== null || max !== null) {
          ranked.push({
            priority: 1,
            test: (s) => {
              const num = s[key as keyof Stock];
              if (typeof num !== 'number') return false;
              if (min !== null && num < min) return false;
              if (max !== null && num > max) return false;
              return true;
            },
          });
        }
        continue;
      }

      if (SINGLE_SELECT_FIELDS.has(key) && typeof val === 'string') {
        ranked.push({
          priority: 2,
          test: (s) => s[key as keyof Stock] === val,
        });
        continue;
      }

      if (CATEGORICAL_FIELDS.has(key)) {
        const arr = Array.isArray(val) ? val : [val];
        if (arr.length > 0) {
          const set = new Set(arr);
          ranked.push({
            priority: 5,
            test: (s) => {
              const prop = s[key as keyof Stock];
              if (Array.isArray(prop)) return prop.some((item) => set.has(item));
              return set.has(prop as string);
            },
          });
        }
      }
    }
  }

  // Selectivity reordering: numerical range (1) -> single enum (2) -> watchlist (3) -> legacy (4) -> categorical set (5)
  ranked.sort((a, b) => a.priority - b.priority);
  return ranked.map((r) => r.test);
}

export function executeFilterEngine(
  stocks: Stock[],
  filters: ActiveFiltersState | FilterConfig[],
  sortConfig: SortConfig | null = null,
  watchlist?: Set<string> | string[]
): FilterResult {
  const t0 = performance.now();

  const watchlistSet =
    watchlist instanceof Set ? watchlist : watchlist ? new Set(watchlist) : undefined;
  const tests = compilePredicates(filters, watchlistSet);
  const testCount = tests.length;
  const len = stocks.length;

  let out: Stock[];

  if (testCount === 0) {
    out = [...stocks];
  } else {
    out = [];
    for (let i = 0; i < len; i++) {
      const stock = stocks[i];
      let ok = true;
      for (let p = 0; p < testCount; p++) {
        if (!tests[p](stock)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(stock);
    }
  }

  if (sortConfig) {
    const { column, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;

    out.sort((a, b) => {
      const va = a[column];
      const vb = b[column];
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  const executionTimeMs = Number((performance.now() - t0).toFixed(2));

  return {
    filteredStocks: out,
    filtered: out,
    executionTimeMs,
  };
}

export const filterStocks = executeFilterEngine;
