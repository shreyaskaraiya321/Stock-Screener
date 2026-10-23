import { Stock, PriceUpdate, Sector, MarketCapCategory } from '@/types/stock';

/**
 * Standard Normal Box-Muller Transform
 * Generates Z ~ N(0, 1) standard normal variate
 * Z = sqrt(-2 * ln(u1)) * cos(2 * PI * u2)
 */
export function boxMullerRandom(): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random(); // Converting [0,1) to (0,1)
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Tailored volatility by SEBI Market Cap Category
 */
export function getCategoryVolatility(category: MarketCapCategory): number {
  switch (category) {
    case 'Large Cap':
      return 0.015;
    case 'Mid Cap':
      return 0.025;
    case 'Small Cap':
    case 'Micro Cap':
    default:
      return 0.04;
  }
}

export interface MarketTickData {
  lastPrice: number;
  changePercent: number;
  changeAbsolute: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  flash?: 'up' | 'down' | null;
}

/**
 * Geometric Brownian Motion with Sector Correlation
 * dS = S * (drift * dt + volatility * sqrt(dt) * combinedShock)
 * combinedShock = sectorCorrelation * Z_sector + sqrt(1 - sectorCorrelation^2) * Z_individual
 */
export function simulateMarketTick(
  stocks: Stock[],
  tickCount = 15
): Map<string, MarketTickData> {
  const result = new Map<string, MarketTickData>();
  if (stocks.length === 0) return result;

  const drift = 0.0001;
  const dt = 1 / 252; // 1 trading day time increment
  const sqrtDt = Math.sqrt(dt);
  const sectorCorrelation = 0.6; // 60% sector macro trend
  const sqrtUncorrelated = Math.sqrt(1 - sectorCorrelation * sectorCorrelation);

  // Sector shocks cache for correlated sector trends
  const sectorShocks: Partial<Record<Sector, number>> = {};

  // Choose 10 to 25 random stocks
  const totalStocks = stocks.length;
  const count = Math.min(Math.max(10, tickCount), totalStocks);
  const selectedIndices = new Set<number>();

  while (selectedIndices.size < count) {
    const idx = Math.floor(Math.random() * totalStocks);
    selectedIndices.add(idx);
  }

  for (const idx of Array.from(selectedIndices)) {
    const stock = stocks[idx];

    // Lazy instantiate shared sector shock
    if (sectorShocks[stock.sector] === undefined) {
      sectorShocks[stock.sector] = boxMullerRandom();
    }
    const zSector = sectorShocks[stock.sector]!;
    const zIndividual = boxMullerRandom();

    // Blended correlated shock
    const combinedShock = sectorCorrelation * zSector + sqrtUncorrelated * zIndividual;

    // Volatility by market cap tier adjusted with Beta
    const baseVol = getCategoryVolatility(stock.marketCapCategory);
    const volatility = baseVol * Math.max(0.5, stock.beta);

    // Geometric Brownian Motion step
    const dS = stock.lastPrice * (drift * dt + volatility * sqrtDt * combinedShock);
    let nextPrice = Number((stock.lastPrice + dS).toFixed(2));

    // Floor at 1.00 INR
    if (nextPrice < 1.0) nextPrice = 1.0;

    const previousClose = stock.previousClose;
    const changeAbsolute = Number((nextPrice - previousClose).toFixed(2));
    const changePercent = Number(((changeAbsolute / previousClose) * 100).toFixed(2));

    const dayHigh = Math.max(stock.dayHigh, nextPrice);
    const dayLow = Math.min(stock.dayLow, nextPrice);
    const volumeDelta = Math.floor(50 + Math.random() * 2000);

    const flash: 'up' | 'down' | null =
      nextPrice > stock.lastPrice ? 'up' : nextPrice < stock.lastPrice ? 'down' : null;

    result.set(stock.symbol, {
      lastPrice: nextPrice,
      changePercent,
      changeAbsolute,
      dayHigh,
      dayLow,
      volume: stock.volume + volumeDelta,
      flash,
    });
  }

  return result;
}

/**
 * Array format wrapper for backwards compatibility
 */
export function simulateBatchPriceTicks(stocks: Stock[], count = 20): PriceUpdate[] {
  const tickMap = simulateMarketTick(stocks, count);
  const updates: PriceUpdate[] = [];

  for (const [symbol, data] of tickMap.entries()) {
    updates.push({
      symbol,
      ...data,
    });
  }

  return updates;
}
