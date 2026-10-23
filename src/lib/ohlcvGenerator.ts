import { OHLCVData, Stock, OHLCV } from '@/types/stock';

export type { OHLCV };
export const generateOHLCV = generateOHLCVData;


/**
 * Generate 252 trading days (1 trading year) of realistic synthetic daily OHLCV candlestick data
 * Excludes weekends (Saturday & Sunday).
 */
export function generateOHLCVData(stock: Stock, days = 252): OHLCVData[] {
  const result: OHLCVData[] = [];

  // Work backwards from today to get 252 trading days
  const tradingDates: string[] = [];
  const currentDate = new Date();

  while (tradingDates.length < days) {
    // Day of week: 0 is Sunday, 6 is Saturday
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      tradingDates.push(`${yyyy}-${mm}-${dd}`);
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Reverse so dates are ascending chronologically
  tradingDates.reverse();

  // Seeded simulation ending at the stock's lastPrice
  const targetEndPrice = stock.lastPrice;
  const dailyVolatility = 0.015 * stock.beta;

  // Simulate price backwards from targetEndPrice, then invert
  const closes: number[] = [targetEndPrice];
  for (let i = 1; i < days; i++) {
    // Random walk with mean-reversion drift
    const prev = closes[closes.length - 1];
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(Math.max(1e-9, u1))) * Math.cos(2.0 * Math.PI * u2);
    const returnPct = -0.0003 + dailyVolatility * z;
    const nextPrice = Math.max(5, prev / (1 + returnPct));
    closes.push(nextPrice);
  }

  // Re-orient forward
  closes.reverse();

  for (let i = 0; i < days; i++) {
    const dateStr = tradingDates[i];
    const close = Number(closes[i].toFixed(2));
    const prevClose = i > 0 ? closes[i - 1] : close * 0.99;

    // Open has small overnight gap
    const gap = (Math.random() - 0.5) * 0.008;
    const open = Number((prevClose * (1 + gap)).toFixed(2));

    // High and low wicks
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const highWick = Math.random() * 0.012 * close;
    const lowWick = Math.random() * 0.012 * close;

    const high = Number((maxOC + highWick).toFixed(2));
    const low = Number((Math.max(1, minOC - lowWick)).toFixed(2));

    // Volume with occasional spikes
    const isSpike = Math.random() > 0.92;
    const volBase = stock.avgVolume20D;
    const volMult = isSpike ? 2.5 + Math.random() * 2 : 0.6 + Math.random() * 0.8;
    const volume = Math.floor(volBase * volMult);

    result.push({
      time: dateStr,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return result;
}
