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
import { Stock } from '@/types/stock';

describe('Technical Indicator Formula Validations', () => {
  it('correctly calculates SMA(5) matching [102.8, 104.2, 105.0, 105.8, 107.2, 108.0]', () => {
    const prices = [100, 102, 104, 103, 105, 107, 106, 108, 110, 109];
    const expected = [102.8, 104.2, 105.0, 105.8, 107.2, 108.0];

    const actual = getValidSMAValues(prices, 5);
    expect(actual).toEqual(expected);

    // Also verify array indices matching prices length with initial nulls
    const rawSMA = calculateSMA(prices, 5);
    expect(rawSMA.length).toBe(prices.length);
    expect(rawSMA[0]).toBeNull();
    expect(rawSMA[3]).toBeNull();
    expect(rawSMA[4]).toBe(102.8);
  });

  it('correctly calculates EMA(5) starting from the initial SMA seed and subsequent smoothing', () => {
    const prices = [100, 102, 104, 103, 105, 107];
    const period = 5;
    const emaResults = calculateEMA(prices, period);

    // Initial seed at index 4 (5th observation) should match SMA(5) = 102.8
    expect(emaResults[4]).toBeCloseTo(102.8, 2);

    // Multiplier k = 2 / (5 + 1) = 1/3
    // EMA[5] = 107 * (1/3) + 102.8 * (2/3) = 35.6667 + 68.5333 = 104.2
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

    // 20 points: 10 at 90, 10 at 110. Mean = 100
    // Population Variance = (10 * (-10)^2 + 10 * (10)^2) / 20 = (1000 + 1000) / 20 = 100
    // Population SD = sqrt(100) = 10
    // Upper = 100 + 2 * 10 = 120
    // Lower = 100 - 2 * 10 = 80
    const testSeries = [...new Array(10).fill(90), ...new Array(10).fill(110)];
    const bb = calculateBollingerBands(testSeries, 20, 2);

    expect(bb[19].middle).toBe(100);
    expect(bb[19].upper).toBe(120);
    expect(bb[19].lower).toBe(80);
  });

  it('handles RSI(14) boundary conditions (14 straight gains = 100, 14 straight drops = 0)', () => {
    // 14 consecutive daily gains
    const gainsSeries = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const rsiGains = calculateRSI(gainsSeries, 14);
    expect(rsiGains[14]).toBe(100);
    expect(rsiGains[15]).toBe(100);

    // 14 consecutive daily drops
    const dropsSeries = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9];
    const rsiDrops = calculateRSI(dropsSeries, 14);
    expect(rsiDrops[14]).toBe(0);
    expect(rsiDrops[15]).toBe(0);
  });

  it('correctly calculates Volume Profile across 30 price tiers', () => {
    const mockCandles = [
      { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: '2024-01-01' },
      { open: 105, high: 115, low: 95, close: 110, volume: 2000, time: '2024-01-02' },
      { open: 110, high: 120, low: 100, close: 115, volume: 3000, time: '2024-01-03' },
    ];
    const profile = VolumeProfile(mockCandles, 30);
    expect(profile.length).toBe(30);
    const totalAggregatedVolume = profile.reduce((sum, b) => sum + b.volume, 0);
    expect(totalAggregatedVolume).toBe(6000);
  });

  it('generates 252 trading days of synthetic OHLCV without weekends', () => {
    const mockStock: Stock = {
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services Ltd',
      sector: 'IT',
      industry: 'Software Services',
      marketCapCategory: 'Large Cap',
      indexMembership: ['NIFTY 50'],
      lastPrice: 3500,
      previousClose: 3480,
      dayOpen: 3490,
      dayHigh: 3520,
      dayLow: 3470,
      changePercent: 0.57,
      changeAbsolute: 20,
      volume: 1500000,
      avgVolume20D: 1500000,
      week52High: 4000,
      week52Low: 3100,
      marketCap: 1250000,
      pe: 28,
      pb: 12,
      dividendYield: 1.5,
      eps: 125,
      roe: 42,
      roce: 55,
      debtToEquity: 0.05,
      currentRatio: 2.2,
      promoterHolding: 72,
      revenueGrowthYoY: 14,
      profitGrowthYoY: 16,
      rsi14: 52,
      sma50: 3420,
      sma200: 3300,
      beta: 0.8,
      atr: 45,
      macdSignal: 'Bullish',
      bollingerPosition: 'Within',
      volumeVsAvg: 'Above',
    };

    const candles = generateOHLCV(mockStock, 252);
    expect(candles.length).toBe(252);

    for (const c of candles) {
      const day = new Date(c.time).getDay();
      expect(day).not.toBe(0); // No Sunday
      expect(day).not.toBe(6); // No Saturday
      expect(c.high).toBeGreaterThanOrEqual(c.low);
    }
  });
});
