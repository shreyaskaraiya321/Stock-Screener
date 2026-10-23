import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  getValidSMAValues,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  VolumeProfile,
} from '@/lib/indicators';
import { generateOHLCV } from '@/lib/ohlcvGenerator';


describe('Technical Indicator Formula Validations', () => {
  it('correctly calculates SMA(5) against official benchmark series', () => {
    const series = [100, 102, 104, 103, 105, 107, 106, 108, 110, 109];
    const expected = [102.8, 104.2, 105.0, 105.8, 107.2, 108.0];

    const actual = getValidSMAValues(series, 5);
    expect(actual).toEqual(expected);
  });

  it('correctly calculates EMA(5) starting from the SMA initial seed', () => {
    const series = [100, 102, 104, 103, 105, 107];
    const period = 5;
    const emaResults = calculateEMA(series, period);

    // Initial seed at index 4 (5th element) should match SMA(5) of first 5 items = 102.8
    expect(emaResults[4]).toBeCloseTo(102.8, 2);

    // Next EMA at index 5: k = 2 / (5 + 1) = 1/3
    // EMA = (107 * 1/3) + (102.8 * 2/3) = 35.6667 + 68.5333 = 104.20
    expect(emaResults[5]).toBeCloseTo(104.2, 1);
  });

  it('correctly calculates Bollinger Bands with population standard deviation', () => {
    // 20 identical points to test zero variance
    const constantSeries = new Array(20).fill(100);
    const bbConstant = calculateBollingerBands(constantSeries, 20, 2);
    expect(bbConstant[19]).toEqual({
      middle: 100,
      upper: 100,
      lower: 100,
    });

    // Known series with manual population variance
    // 20 items: 10 of 90 and 10 of 110.
    // Mean = 100
    // Variance = (10 * (90-100)^2 + 10 * (110-100)^2) / 20 = (10 * 100 + 10 * 100) / 20 = 100
    // Population SD = sqrt(100) = 10
    // Upper = 100 + 2 * 10 = 120
    // Lower = 100 - 2 * 10 = 80
    const testSeries = [...new Array(10).fill(90), ...new Array(10).fill(110)];
    const bb = calculateBollingerBands(testSeries, 20, 2);

    expect(bb[19].middle).toBe(100);
    expect(bb[19].upper).toBe(120);
    expect(bb[19].lower).toBe(80);
  });

  it('handles RSI(14) edge cases (consecutive gains = 100, consecutive losses = 0)', () => {
    // Case 1: Consecutive gains (strictly increasing prices)
    const gainsSeries = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const rsiGains = calculateRSI(gainsSeries, 14);
    expect(rsiGains[14]).toBe(100);
    expect(rsiGains[15]).toBe(100);

    // Case 2: Consecutive losses (strictly decreasing prices)
    const lossSeries = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9];
    const rsiLoss = calculateRSI(lossSeries, 14);
    expect(rsiLoss[14]).toBe(0);
    expect(rsiLoss[15]).toBe(0);
  });

  it('correctly aggregates Volume Profile across price buckets', () => {
    const mockCandles = [
      { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: '2024-01-01' },
      { open: 105, high: 115, low: 95, close: 110, volume: 2000, time: '2024-01-02' },
      { open: 110, high: 120, low: 100, close: 115, volume: 3000, time: '2024-01-03' },
    ];
    const profile = VolumeProfile(mockCandles, 10);
    expect(profile.length).toBe(10);
    const totalAggregatedVolume = profile.reduce((sum, b) => sum + b.volume, 0);
    expect(totalAggregatedVolume).toBe(6000);
  });

  it('generates 252 trading days of synthetic OHLCV data without weekends', () => {
    const mockStock = {
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      sector: 'Energy' as const,
      industry: 'Oil & Gas',
      marketCapCategory: 'Large Cap' as const,
      indexMembership: ['NIFTY 50'],
      lastPrice: 2500,
      previousClose: 2480,
      dayOpen: 2490,
      dayHigh: 2520,
      dayLow: 2470,
      changePercent: 0.8,
      changeAbsolute: 20,
      volume: 1000000,
      avgVolume20D: 1000000,
      week52High: 2800,
      week52Low: 2100,
      marketCap: 1700000,
      pe: 25,
      pb: 2.5,
      dividendYield: 0.5,
      eps: 100,
      roe: 12,
      roce: 14,
      debtToEquity: 0.4,
      currentRatio: 1.2,
      promoterHolding: 50,
      revenueGrowthYoY: 15,
      profitGrowthYoY: 18,
      rsi14: 55,
      sma50: 2450,
      sma200: 2350,
      beta: 1.0,
      atr: 35,
      macdSignal: 'Bullish' as const,
      bollingerPosition: 'Within' as const,
      volumeVsAvg: 'Above' as const,
    };

    const candles = generateOHLCV(mockStock, 252);
    expect(candles.length).toBe(252);

    // Verify all dates are weekdays
    for (const c of candles) {
      const date = new Date(c.time);
      const day = date.getDay();
      expect(day).not.toBe(0); // Sunday
      expect(day).not.toBe(6); // Saturday
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.open).toBeGreaterThan(0);
      expect(c.close).toBeGreaterThan(0);
    }
  });
});

