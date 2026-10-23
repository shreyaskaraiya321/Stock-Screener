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

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const len = data.length;
  const out: (number | null)[] = new Array(len).fill(null);
  if (len < period || period <= 0) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  out[period - 1] = Number((sum / period).toFixed(4));

  for (let i = period; i < len; i++) {
    sum += data[i] - data[i - period];
    out[i] = Number((sum / period).toFixed(4));
  }
  return out;
}

export function getValidSMAValues(data: number[], period: number): number[] {
  const sma = calculateSMA(data, period);
  const out: number[] = [];
  for (let i = period - 1; i < sma.length; i++) {
    const val = sma[i];
    if (val !== null) out.push(Number(val.toFixed(1)));
  }
  return out;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const len = data.length;
  const out: (number | null)[] = new Array(len).fill(null);
  if (len < period || period <= 0) return out;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];

  let prev = sum / period;
  out[period - 1] = Number(prev.toFixed(4));

  for (let i = period; i < len; i++) {
    prev = data[i] * k + prev * (1 - k);
    out[i] = Number(prev.toFixed(4));
  }
  return out;
}

export function calculateBollingerBands(
  data: number[],
  period = 20,
  multiplier = 2
): BollingerBandPoint[] {
  const len = data.length;
  const out: BollingerBandPoint[] = new Array(len);

  for (let i = 0; i < len; i++) {
    out[i] = { upper: null, middle: null, lower: null };
  }
  if (len < period || period <= 0) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];

  for (let i = period - 1; i < len; i++) {
    if (i >= period) {
      sum += data[i] - data[i - period];
    }
    const mean = sum / period;

    // Population variance over rolling window without array allocation
    let varianceSum = 0;
    const start = i - period + 1;
    for (let j = start; j <= i; j++) {
      const diff = data[j] - mean;
      varianceSum += diff * diff;
    }
    const sd = Math.sqrt(varianceSum / period);

    out[i] = {
      middle: Number(mean.toFixed(2)),
      upper: Number((mean + multiplier * sd).toFixed(2)),
      lower: Number((mean - multiplier * sd).toFixed(2)),
    };
  }
  return out;
}

export function calculateRSI(data: number[], period = 14): (number | null)[] {
  const len = data.length;
  const out: (number | null)[] = new Array(len).fill(null);
  if (len <= period) return out;

  let gainsSum = 0;
  let lossesSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gainsSum += diff;
    else lossesSum += -diff;
  }

  let avgGain = gainsSum / period;
  let avgLoss = lossesSum / period;

  const toRSI = (g: number, l: number): number => {
    if (l === 0) return 100;
    if (g === 0) return 0;
    return Number((100 - 100 / (1 + g / l)).toFixed(2));
  };

  out[period] = toRSI(avgGain, avgLoss);

  // Wilder's recursive smoothing
  for (let i = period + 1; i < len; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = toRSI(avgGain, avgLoss);
  }
  return out;
}

export function calculateVolumeProfile(
  candles: { high: number; low: number; close: number; volume: number }[],
  bucketCount = 30
): VolumeProfileBucket[] {
  const len = candles.length;
  if (len === 0) return [];

  let min = Infinity;
  let max = -Infinity;
  let totalVol = 0;

  for (let i = 0; i < len; i++) {
    const c = candles[i];
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
    totalVol += c.volume;
  }
  if (min >= max) return [];

  const span = max - min;
  const step = span / bucketCount;
  const volumes = new Float64Array(bucketCount);

  for (let i = 0; i < len; i++) {
    const c = candles[i];
    const mid = (c.high + c.low + c.close) / 3;
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((mid - min) / step)));
    volumes[idx] += c.volume;
  }

  const out: VolumeProfileBucket[] = new Array(bucketCount);
  for (let i = 0; i < bucketCount; i++) {
    const v = volumes[i];
    out[i] = {
      priceStart: Number((min + i * step).toFixed(2)),
      priceEnd: Number((min + (i + 1) * step).toFixed(2)),
      volume: v,
      percentage: totalVol > 0 ? Number(((v / totalVol) * 100).toFixed(1)) : 0,
    };
  }
  return out;
}

export const SMA = calculateSMA;
export const EMA = calculateEMA;
export const BollingerBands = calculateBollingerBands;
export const RSI = calculateRSI;
export const VolumeProfile = calculateVolumeProfile;
