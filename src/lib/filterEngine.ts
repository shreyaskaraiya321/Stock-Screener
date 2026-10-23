import { Stock, FilterConfig, SortConfig } from '@/types/stock';

// Weighting to order predicates: numeric ranges are cheapest & eliminate most candidates first
const OPERATOR_PRECEDENCE: Record<string, number> = {
  between: 1,
  gte: 2,
  lte: 3,
  gt: 4,
  lt: 5,
  eq: 6,
  neq: 7,
  in: 8,
};

export interface FilterResult {
  filtered: Stock[];
  executionTimeMs: number;
}

/**
 * Evaluates a single stock against a filter config
 */
function evaluatePredicate(stock: Stock, filter: FilterConfig, watchlist?: Set<string>): boolean {
  if (filter.id === 'watchlist-only') {
    return watchlist ? watchlist.has(stock.symbol) : false;
  }

  // Custom calculated field: priceVsSma50 or priceVsSma200
  if (filter.field === ('priceVsSma50' as any)) {
    if (filter.value === 'Above') return stock.lastPrice > stock.sma50;
    if (filter.value === 'Below') return stock.lastPrice <= stock.sma50;
    return true;
  }
  if (filter.field === ('priceVsSma200' as any)) {
    if (filter.value === 'Above') return stock.lastPrice > stock.sma200;
    if (filter.value === 'Below') return stock.lastPrice <= stock.sma200;
    return true;
  }

  const rawVal = stock[filter.field];

  switch (filter.operator) {
    case 'eq':
      return rawVal === filter.value;

    case 'neq':
      return rawVal !== filter.value;

    case 'gte':
      return typeof rawVal === 'number' && rawVal >= filter.value;

    case 'gt':
      return typeof rawVal === 'number' && rawVal > filter.value;

    case 'lte':
      return typeof rawVal === 'number' && rawVal <= filter.value;

    case 'lt':
      return typeof rawVal === 'number' && rawVal < filter.value;

    case 'between': {
      if (typeof rawVal !== 'number') return false;
      const [min, max] = filter.value as [number, number];
      return rawVal >= min && rawVal <= max;
    }

    case 'in': {
      // Support array containment (e.g., indexMembership) or single value in array
      const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
      if (arr.length === 0) return true;
      if (Array.isArray(rawVal)) {
        return rawVal.some((item) => arr.includes(item));
      }
      return arr.includes(rawVal);
    }

    default:
      return true;
  }
}

/**
 * High-Performance Combinatorial Filter Engine
 * Automatically sorts predicates so numeric range filters run before multi-selects.
 * Uses short-circuit evaluation for sub-200ms processing on 5,000+ stocks.
 */
export function executeFilterEngine(
  stocks: Stock[],
  filters: FilterConfig[],
  sortConfig: SortConfig | null = null,
  watchlist?: Set<string>
): FilterResult {
  const start = performance.now();

  const enabledFilters = filters.filter((f) => f.enabled);

  // If no filters enabled and no sort, fast return
  if (enabledFilters.length === 0 && !sortConfig) {
    return {
      filtered: stocks,
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
    };
  }

  // Predicate sorting: sort most restrictive / numeric filters first
  const sortedFilters = [...enabledFilters].sort((a, b) => {
    const precA = OPERATOR_PRECEDENCE[a.operator] ?? 99;
    const precB = OPERATOR_PRECEDENCE[b.operator] ?? 99;
    return precA - precB;
  });

  const filterCount = sortedFilters.length;
  const filtered: Stock[] = [];

  // Single-pass short-circuit evaluation
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    let matches = true;

    for (let f = 0; f < filterCount; f++) {
      if (!evaluatePredicate(stock, sortedFilters[f], watchlist)) {
        matches = false;
        break; // Short-circuit immediately
      }
    }

    if (matches) {
      filtered.push(stock);
    }
  }

  // Sorting
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

  return {
    filtered,
    executionTimeMs: Number((end - start).toFixed(2)),
  };
}
