import { describe, it, expect } from 'vitest';
import { generateIndianStocks } from '@/lib/mockDataGenerator';
import { executeFilterEngine } from '@/lib/filterEngine';
import { FilterConfig, Stock } from '@/types/stock';

describe('Filter Engine Core & Operator Unit Tests', () => {
  const mockStocks = generateIndianStocks();

  it('correctly filters with "eq" operator', () => {
    const filters: FilterConfig[] = [
      { id: 'f-eq', field: 'sector', operator: 'eq', value: 'Banking', enabled: true },
    ];
    const { filteredStocks } = executeFilterEngine(mockStocks, filters);
    expect(filteredStocks.length).toBeGreaterThan(0);
    expect(filteredStocks.every((s) => s.sector === 'Banking')).toBe(true);
  });

  it('correctly filters with "gte" operator', () => {
    const filters: FilterConfig[] = [
      { id: 'f-gte', field: 'roe', operator: 'gte', value: 20, enabled: true },
    ];
    const { filteredStocks } = executeFilterEngine(mockStocks, filters);
    expect(filteredStocks.length).toBeGreaterThan(0);
    expect(filteredStocks.every((s) => s.roe >= 20)).toBe(true);
  });

  it('correctly filters with "between" operator', () => {
    const filters: FilterConfig[] = [
      { id: 'f-between', field: 'pe', operator: 'between', value: [15, 25], enabled: true },
    ];
    const { filteredStocks } = executeFilterEngine(mockStocks, filters);
    expect(filteredStocks.length).toBeGreaterThan(0);
    expect(filteredStocks.every((s) => s.pe >= 15 && s.pe <= 25)).toBe(true);
  });

  it('correctly filters with "in" operator for multi-select', () => {
    const filters: FilterConfig[] = [
      { id: 'f-in', field: 'sector', operator: 'in', value: ['IT', 'Pharma'], enabled: true },
    ];
    const { filteredStocks } = executeFilterEngine(mockStocks, filters);
    expect(filteredStocks.length).toBeGreaterThan(0);
    expect(filteredStocks.every((s) => s.sector === 'IT' || s.sector === 'Pharma')).toBe(true);
  });

  it('filters by watchlist membership', () => {
    const watchlist = new Set(['RELIANCE', 'TCS', 'HDFCBANK']);
    const filters: FilterConfig[] = [
      { id: 'watchlist-only', field: 'symbol', operator: 'eq', value: true, enabled: true },
    ];
    const { filteredStocks } = executeFilterEngine(mockStocks, filters, null, watchlist);
    expect(filteredStocks.length).toBe(3);
    expect(filteredStocks.map((s) => s.symbol).sort()).toEqual(['HDFCBANK', 'RELIANCE', 'TCS']);
  });
});

describe('Filter Engine Performance Benchmark (5,000 Stocks)', () => {
  it('generates exactly 5,000 mock stocks adhering to SEBI distribution tiers', () => {
    const stocks = generateIndianStocks();
    expect(stocks.length).toBe(5000);

    const largeCaps = stocks.filter((s) => s.marketCapCategory === 'Large Cap');
    const midCaps = stocks.filter((s) => s.marketCapCategory === 'Mid Cap');
    const smallCaps = stocks.filter((s) => s.marketCapCategory === 'Small Cap');
    const microCaps = stocks.filter((s) => s.marketCapCategory === 'Micro Cap');

    expect(largeCaps.length).toBe(100);
    expect(midCaps.length).toBe(400);
    expect(smallCaps.length).toBe(1500);
    expect(microCaps.length).toBe(3000);
  });

  it('executes 4 simultaneous compound filters strictly under 200ms', () => {
    const stocks = generateIndianStocks();

    const compoundFilters: FilterConfig[] = [
      {
        id: 'bench-mcap',
        field: 'marketCap',
        operator: 'gt',
        value: 10000,
        enabled: true,
      },
      {
        id: 'bench-pe',
        field: 'pe',
        operator: 'between',
        value: [10, 35],
        enabled: true,
      },
      {
        id: 'bench-sec',
        field: 'sector',
        operator: 'in',
        value: ['IT', 'Banking'],
        enabled: true,
      },
      {
        id: 'bench-rsi',
        field: 'rsi14',
        operator: 'lt',
        value: 60,
        enabled: true,
      },
    ];

    const result = executeFilterEngine(stocks, compoundFilters, {
      column: 'marketCap',
      direction: 'desc',
    });

    console.log(
      `[Benchmark] 5,000 stocks filtered down to ${result.filteredStocks.length} matches in ${result.executionTimeMs} ms`
    );

    // Validate correctness
    for (const stock of result.filteredStocks) {
      expect(stock.marketCap).toBeGreaterThan(10000);
      expect(stock.pe).toBeGreaterThanOrEqual(10);
      expect(stock.pe).toBeLessThanOrEqual(35);
      expect(['IT', 'Banking']).toContain(stock.sector);
      expect(stock.rsi14).toBeLessThan(60);
    }

    // Benchmark specification: strictly under 200ms
    expect(result.executionTimeMs).toBeLessThan(200);
  });
});
