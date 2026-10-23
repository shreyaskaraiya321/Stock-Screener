import { describe, it, expect } from 'vitest';
import { generateIndianStocks } from '@/lib/mockDataGenerator';
import { executeFilterEngine } from '@/lib/filterEngine';
import { FilterConfig } from '@/types/stock';

describe('High-Performance Filter Engine Benchmark', () => {
  it('generates 5,000 mock stocks adhering to SEBI distribution', () => {
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

  it('filters 5,000 stocks with 4 simultaneous compound filters in under 200ms', () => {
    const stocks = generateIndianStocks();

    const compoundFilters: FilterConfig[] = [
      {
        id: 'f-mcap',
        field: 'marketCap',
        operator: 'gt',
        value: 10000,
        enabled: true,
      },
      {
        id: 'f-pe',
        field: 'pe',
        operator: 'between',
        value: [10, 35],
        enabled: true,
      },
      {
        id: 'f-sec',
        field: 'sector',
        operator: 'in',
        value: ['IT', 'Banking'],
        enabled: true,
      },
      {
        id: 'f-rsi',
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
      `Filtered 5,000 stocks down to ${result.filtered.length} matches in ${result.executionTimeMs} ms`
    );

    // Validate correctness of filters
    for (const stock of result.filtered) {
      expect(stock.marketCap).toBeGreaterThan(10000);
      expect(stock.pe).toBeGreaterThanOrEqual(10);
      expect(stock.pe).toBeLessThanOrEqual(35);
      expect(['IT', 'Banking']).toContain(stock.sector);
      expect(stock.rsi14).toBeLessThan(60);
    }

    // Benchmark requirement: sub-200ms execution
    expect(result.executionTimeMs).toBeLessThan(200);
  });
});
