import { Stock, PriceUpdate, Sector } from '@/types/stock';

/**
 * Standard Normal Box-Muller Transform
 * Generates N(0, 1) standard normal variate
 */
export function boxMullerRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Geometric Brownian Motion with Market & Sector Correlation
 * dS = S * (drift * dt + volatility * sqrt(dt) * Z)
 * Z = sqrt(rho) * Z_sector + sqrt(1 - rho) * Z_idiosyncratic
 */
export function simulateBatchPriceTicks(
  stocks: Stock[],
  count = 20
): PriceUpdate[] {
  if (stocks.length === 0) return [];

  // 1. Generate sector-wide systemic shocks
  const sectorShocks: Partial<Record<Sector, number>> = {};
  const rho = 0.45; // 45% correlation to sector macro move
  const dt = 1 / (252 * 6.5 * 60); // Intraday minute-fraction time increment
  const marketDrift = 0.0001; // slight positive market bias

  // 2. Select `count` unique random stocks
  const updates: PriceUpdate[] = [];
  const selectedIndices = new Set<number>();
  const totalStocks = stocks.length;
  const targetCount = Math.min(count, totalStocks);

  while (selectedIndices.size < targetCount) {
    const idx = Math.floor(Math.random() * totalStocks);
    selectedIndices.add(idx);
  }

  for (const idx of Array.from(selectedIndices)) {
    const stock = stocks[idx];

    // Lazy instantiate sector shock
    if (sectorShocks[stock.sector] === undefined) {
      sectorShocks[stock.sector] = boxMullerRandom();
    }
    const zSector = sectorShocks[stock.sector]!;
    const zIdio = boxMullerRandom();

    // Combined correlated normal shock
    const z = Math.sqrt(rho) * zSector + Math.sqrt(1 - rho) * zIdio;

    // Annualized volatility adjusted by stock Beta
    const annualVol = 0.22 * stock.beta;
    const returnShock = marketDrift * dt + annualVol * Math.sqrt(dt) * z;

    // Apply Geometric Brownian Motion step
    const currentPrice = stock.lastPrice;
    let nextPrice = Number((currentPrice * (1 + returnShock)).toFixed(2));

    // Floor to minimum 1.00 INR
    if (nextPrice < 1) nextPrice = 1.0;

    const changeAbsolute = Number((nextPrice - stock.previousClose).toFixed(2));
    const changePercent = Number(
      ((changeAbsolute / stock.previousClose) * 100).toFixed(2)
    );

    const dayHigh = Math.max(stock.dayHigh, nextPrice);
    const dayLow = Math.min(stock.dayLow, nextPrice);
    const additionalVolume = Math.floor(100 + Math.random() * 2500);

    updates.push({
      symbol: stock.symbol,
      lastPrice: nextPrice,
      changeAbsolute,
      changePercent,
      dayHigh,
      dayLow,
      volume: stock.volume + additionalVolume,
      flash: nextPrice > currentPrice ? 'up' : nextPrice < currentPrice ? 'down' : null,
    });
  }

  return updates;
}
