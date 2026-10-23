/**
 * Pure Mathematical Technical Indicator Calculations
 * Designed from scratch without third-party indicator libraries
 */

export interface BollingerBandPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface VolumeProfileBucket {
  priceStart: number;
  priceEnd: number;
  volume: number;
  percentage: number;
}

/**
 * Simple Moving Average (SMA)
 * Returns array of same length as data, with null for indices < period - 1
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = Number((sum / period).toFixed(4));

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = Number((sum / period).toFixed(4));
  }

  return result;
}

/**
 * Helper to get clean array of non-null SMA values (used in Vitest unit tests)
 */
export function getValidSMAValues(data: number[], period: number): number[] {
  const all = calculateSMA(data, period);
  return all.filter((v): v is number => v !== null).map((v) => Number(v.toFixed(1)));
}

/**
 * Exponential Moving Average (EMA)
 * Multiplier k = 2 / (period + 1)
 * Initial seed at index `period - 1` uses SMA of the first `period` items
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period || period <= 0) return result;

  const k = 2 / (period + 1);

  // Initial SMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = Number(prevEMA.toFixed(4));

  // Iterative EMA
  for (let i = period; i < data.length; i++) {
    const currentEMA = data[i] * k + prevEMA * (1 - k);
    result[i] = Number(currentEMA.toFixed(4));
    prevEMA = currentEMA;
  }

  return result;
}

/**
 * Bollinger Bands
 * Middle Band = SMA(period)
 * Upper Band = SMA(period) + multiplier * Population SD
 * Lower Band = SMA(period) - multiplier * Population SD
 */
export function calculateBollingerBands(
  data: number[],
  period = 20,
  multiplier = 2
): BollingerBandPoint[] {
  const result: BollingerBandPoint[] = new Array(data.length).fill(null).map(() => ({
    upper: null,
    middle: null,
    lower: null,
  }));

  if (data.length < period || period <= 0) return result;

  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);

    // Mean
    const mean = window.reduce((acc, val) => acc + val, 0) / period;

    // Population Standard Deviation (divide by N, not N-1)
    const variance =
      window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);

    result[i] = {
      middle: Number(mean.toFixed(2)),
      upper: Number((mean + multiplier * sd).toFixed(2)),
      lower: Number((mean - multiplier * sd).toFixed(2)),
    };
  }

  return result;
}

/**
 * Relative Strength Index (RSI 14)
 * Uses Wilder's Smoothing Technique
 * Bound between 0 and 100
 */
export function calculateRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= period) return result;

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  let gainsSum = 0;
  let lossesSum = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) gainsSum += change;
    else lossesSum += Math.abs(change);
  }

  let avgGain = gainsSum / period;
  let avgLoss = lossesSum / period;

  // First RSI value at index `period` (corresponding to data[period])
  if (avgLoss === 0) {
    result[period] = 100;
  } else if (avgGain === 0) {
    result[period] = 0;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  // Wilder's smoothing for subsequent periods
  for (let i = period + 1; i < data.length; i++) {
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else if (avgGain === 0) {
      result[i] = 0;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return result;
}

/**
 * Volume Profile
 * Aggregates volume into 30 price buckets across the candle series
 */
export function calculateVolumeProfile(
  candles: { high: number; low: number; close: number; volume: number }[],
  bucketCount = 30
): VolumeProfileBucket[] {
  if (candles.length === 0) return [];

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVolume += c.volume;
  }

  if (minPrice >= maxPrice) return [];

  const bucketSize = (maxPrice - minPrice) / bucketCount;
  const buckets: { volume: number }[] = Array.from({ length: bucketCount }, () => ({
    volume: 0,
  }));

  for (const c of candles) {
    const midPrice = (c.high + c.low + c.close) / 3;
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((midPrice - minPrice) / bucketSize))
    );
    buckets[index].volume += c.volume;
  }

  return buckets.map((b, idx) => ({
    priceStart: Number((minPrice + idx * bucketSize).toFixed(2)),
    priceEnd: Number((minPrice + (idx + 1) * bucketSize).toFixed(2)),
    volume: b.volume,
    percentage: totalVolume > 0 ? Number(((b.volume / totalVolume) * 100).toFixed(1)) : 0,
  }));
}
