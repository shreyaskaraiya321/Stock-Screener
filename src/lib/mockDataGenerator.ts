import {
  Stock,
  Sector,
  MarketCapCategory,
  MACDSignal,
  BollingerPosition,
  VolumeVsAvg,
} from '@/types/stock';

// Deterministic Pseudo-Random Number Generator (Mulberry32) for instant reproducible 5000 stocks
function createPRNG(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECTORS: Sector[] = [
  'IT',
  'Banking',
  'Pharma',
  'Auto',
  'FMCG',
  'Metal',
  'Energy',
  'Realty',
  'Telecom',
  'Infrastructure',
  'Chemicals',
  'Others',
];

const SECTOR_INDUSTRIES: Record<Sector, string[]> = {
  IT: ['Software Services', 'IT Consulting', 'Cloud Platforms', 'Fintech Tech', 'Cybersecurity'],
  Banking: ['Private Sector Bank', 'Public Sector Bank', 'Housing Finance', 'NBFC', 'Small Finance Bank'],
  Pharma: ['Formulations', 'Active Pharmaceutical Ingredients', 'Biotechnology', 'CRAMS', 'Diagnostics'],
  Auto: ['Passenger Vehicles', 'Commercial Vehicles', 'Auto Ancillaries', 'Two Wheelers', 'EV Technology'],
  FMCG: ['Personal Care', 'Food & Beverages', 'Household Products', 'Packaged Foods', 'Edible Oils'],
  Metal: ['Steel', 'Aluminium', 'Mining & Minerals', 'Copper', 'Zinc & Lead'],
  Energy: ['Oil & Gas Refining', 'Renewable Energy', 'Thermal Power', 'Solar & Wind EPC', 'Gas Distribution'],
  Realty: ['Residential Real Estate', 'Commercial REIT', 'Urban Development', 'Industrial Parks'],
  Telecom: ['Telecom Services', 'Towers & Infrastructure', 'Optical Fiber', 'Networking Gear'],
  Infrastructure: ['EPC Contracting', 'Roads & Highways', 'Ports & Logistics', 'Railways Infrastructure', 'Airports'],
  Chemicals: ['Specialty Chemicals', 'Agrochemicals', 'Dyes & Pigments', 'Fluorochemicals', 'Polymers'],
  Others: ['Paper & Packaging', 'Textiles & Apparel', 'Diversified Conglomerate', 'Media & Entertainment', 'Hospitality & Hotels'],
};

// Top 50 Indian Giants
const BLUECHIP_STOCKS: { symbol: string; name: string; sector: Sector; mcap: number }[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', mcap: 1980000 },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', mcap: 1420000 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', mcap: 1250000 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', mcap: 890000 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', mcap: 840000 },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', mcap: 780000 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', mcap: 720000 },
  { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Banking', mcap: 610000 },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', mcap: 580000 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', mcap: 560000 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure', mcap: 490000 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Banking', mcap: 440000 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Auto', mcap: 395000 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharma', mcap: 390000 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', mcap: 360000 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Auto', mcap: 340000 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', mcap: 335000 },
  { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'FMCG', mcap: 300000 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Infrastructure', mcap: 295000 },
  { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy', mcap: 290000 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Energy', mcap: 280000 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India', sector: 'Energy', mcap: 275000 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Chemicals', mcap: 260000 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Others', mcap: 250000 },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Metal', mcap: 245000 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Auto', mcap: 240000 },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', mcap: 235000 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', mcap: 230000 },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metal', mcap: 210000 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'Banking', mcap: 205000 },
  { symbol: 'SIEMENS', name: 'Siemens Ltd', sector: 'Infrastructure', mcap: 195000 },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Energy', mcap: 185000 },
  { symbol: 'DLF', name: 'DLF Ltd', sector: 'Realty', mcap: 180000 },
  { symbol: 'ZOMATO', name: 'Zomato Ltd', sector: 'Others', mcap: 175000 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metal', mcap: 170000 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metal', mcap: 165000 },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Chemicals', mcap: 160000 },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', sector: 'Others', mcap: 155000 },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Others', mcap: 150000 },
  { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Metal', mcap: 145000 },
  { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories Ltd', sector: 'Pharma', mcap: 140000 },
  { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma', mcap: 135000 },
  { symbol: 'TRENT', name: 'Trent Ltd', sector: 'FMCG', mcap: 130000 },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Energy', mcap: 125000 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', sector: 'Auto', mcap: 120000 },
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd', sector: 'Infrastructure', mcap: 110000 },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories Ltd', sector: 'Pharma', mcap: 105000 },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'IT', mcap: 98000 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'FMCG', mcap: 95000 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', sector: 'Banking', mcap: 92000 },
];

const PREFIXES = [
  'BHARAT', 'HIND', 'TATA', 'BIRLA', 'SHREE', 'JSW', 'ADANI', 'INDUS', 'APEX', 'ZENITH',
  'VAIBHAV', 'SURYA', 'PRIME', 'GLOBAL', 'METRO', 'KRISHNA', 'DEEPAK', 'GUJARAT', 'MAHA', 'DELTA',
  'RADIX', 'KALYAN', 'DYNAMIC', 'EMPIRE', 'OMNI', 'STAR', 'VISTA', 'AURA', 'SIGMA', 'MATRIX',
  'ORIENT', 'ANUPAM', 'ALOK', 'JINDAL', 'SOMANY', 'GODREJ', 'SUZLON', 'POLYCAB', 'SUPREME', 'FINOLEX'
];

const SUFFIXES = [
  'CORP', 'IND', 'TECH', 'PHARMA', 'FIN', 'POWER', 'CHEM', 'MOTORS', 'INFRA', 'STEEL',
  'METALS', 'FOODS', 'SOLUTIONS', 'GLOBAL', 'SYSTEMS', 'ENTERPRISES', 'HOLDINGS', 'VENTURES', 'REALTORS', 'CABLES'
];

export function generateIndianStocks(): Stock[] {
  const rng = createPRNG(42);
  const stocks: Stock[] = [];

  // Distribution according to SEBI categorisation specifications:
  // - 100 Large Cap (50,000 - 20,00,000 Cr)
  // - 400 Mid Cap (10,000 - 49,999 Cr)
  // - 1,500 Small Cap (1,000 - 9,999 Cr)
  // - 3,000 Micro Cap (50 - 999 Cr)
  // Total: 5,000 stocks

  const tiers: { category: MarketCapCategory; count: number; minMcap: number; maxMcap: number }[] = [
    { category: 'Large Cap', count: 100, minMcap: 50000, maxMcap: 2000000 },
    { category: 'Mid Cap', count: 400, minMcap: 10000, maxMcap: 49999 },
    { category: 'Small Cap', count: 1500, minMcap: 1000, maxMcap: 9999 },
    { category: 'Micro Cap', count: 3000, minMcap: 50, maxMcap: 999 },
  ];

  const usedSymbols = new Set<string>();

  for (const tier of tiers) {
    for (let i = 0; i < tier.count; i++) {
      let symbol = '';
      let companyName = '';
      let sector: Sector = 'Others';
      let marketCap = 0;

      // For first 50 Large Cap, use real blue chips
      if (tier.category === 'Large Cap' && i < BLUECHIP_STOCKS.length) {
        const bluechip = BLUECHIP_STOCKS[i];
        symbol = bluechip.symbol;
        companyName = bluechip.name;
        sector = bluechip.sector;
        marketCap = bluechip.mcap;
      } else {
        // Generate realistic name & ticker
        sector = SECTORS[Math.floor(rng() * SECTORS.length)];
        const p = PREFIXES[Math.floor(rng() * PREFIXES.length)];
        const s = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
        
        let candidateSymbol = `${p.substring(0, 4)}${s.substring(0, 4)}`;
        let disambiguator = 1;
        while (usedSymbols.has(candidateSymbol)) {
          candidateSymbol = `${p.substring(0, 3)}${s.substring(0, 3)}${disambiguator++}`;
        }
        symbol = candidateSymbol;
        companyName = `${p} ${s} Industries India Ltd`;

        // Calculate Market Cap adhering to tier boundaries
        const range = tier.maxMcap - tier.minMcap;
        // Apply log-distribution for realistic market cap skew
        const skewFactor = Math.pow(rng(), 1.8);
        marketCap = Math.round(tier.minMcap + range * skewFactor);
      }

      usedSymbols.add(symbol);

      const industries = SECTOR_INDUSTRIES[sector];
      const industry = industries[Math.floor(rng() * industries.length)];

      // Index Memberships
      const indexMembership: string[] = [];
      if (tier.category === 'Large Cap') {
        if (i < 50) indexMembership.push('NIFTY 50');
        else indexMembership.push('NIFTY NEXT 50');
        indexMembership.push('NIFTY 100', 'NIFTY 500');
      } else if (tier.category === 'Mid Cap') {
        if (i < 150) indexMembership.push('NIFTY MIDCAP 150');
        indexMembership.push('NIFTY 500');
      } else if (tier.category === 'Small Cap') {
        if (i < 250) indexMembership.push('NIFTY SMALLCAP 250');
        indexMembership.push('NIFTY 500');
      } else {
        if (i < 250) indexMembership.push('NIFTY MICROCAP 250');
      }

      // Financial Correlations based on SEBI & Sector Realities:
      // High growth (>25%) maps to higher P/E (40 - 90)
      // Banking/NBFCs have high Debt-to-Equity (5 - 15x)
      // IT & FMCG have low D/E (0 - 0.5x)
      const revenueGrowthYoY = Number(((rng() * 45) - 5).toFixed(2)); // -5% to +40%
      const profitGrowthYoY = Number((revenueGrowthYoY * (0.8 + rng() * 0.6) + (rng() * 10 - 5)).toFixed(2));

      let pe: number;
      if (profitGrowthYoY > 25) {
        pe = Number((38 + rng() * 48).toFixed(1)); // 38 to 86
      } else if (profitGrowthYoY > 12) {
        pe = Number((22 + rng() * 25).toFixed(1)); // 22 to 47
      } else if (profitGrowthYoY > 0) {
        pe = Number((12 + rng() * 18).toFixed(1)); // 12 to 30
      } else {
        pe = Number((6 + rng() * 12).toFixed(1)); // 6 to 18
      }

      let debtToEquity: number;
      if (sector === 'Banking') {
        debtToEquity = Number((5.5 + rng() * 8.5).toFixed(2)); // 5.5 to 14.0x
      } else if (sector === 'IT' || sector === 'FMCG') {
        debtToEquity = Number((rng() * 0.35).toFixed(2)); // 0.0 to 0.35x
      } else if (sector === 'Infrastructure' || sector === 'Metal' || sector === 'Realty') {
        debtToEquity = Number((0.8 + rng() * 2.2).toFixed(2)); // 0.8 to 3.0x
      } else {
        debtToEquity = Number((0.1 + rng() * 1.2).toFixed(2));
      }

      // Promoter holding (Large Cap 40-75%, others 25-75%)
      let promoterHolding: number;
      if (tier.category === 'Large Cap') {
        promoterHolding = Number((42 + rng() * 32).toFixed(1)); // 42% to 74%
      } else {
        promoterHolding = Number((28 + rng() * 46).toFixed(1)); // 28% to 74%
      }

      // Beta variance: Large Cap 0.5 - 1.2, Micro Cap 0.3 - 2.5
      let beta: number;
      if (tier.category === 'Large Cap') {
        beta = Number((0.55 + rng() * 0.62).toFixed(2));
      } else if (tier.category === 'Mid Cap') {
        beta = Number((0.7 + rng() * 0.75).toFixed(2));
      } else {
        beta = Number((0.35 + rng() * 2.1).toFixed(2));
      }

      // Quality metrics
      const roe = Number((sector === 'IT' || sector === 'FMCG' ? 16 + rng() * 22 : 6 + rng() * 20).toFixed(1));
      const roce = Number((roe * (0.9 + rng() * 0.35)).toFixed(1));
      const pb = Number((Math.max(0.8, (roe / 8) * (0.8 + rng() * 0.6))).toFixed(2));
      const currentRatio = sector === 'Banking' ? 1.05 : Number((0.9 + rng() * 2.2).toFixed(2));
      const dividendYield = Number((Math.max(0, (rng() * 4.2) - (pe > 50 ? 1.5 : 0))).toFixed(2));

      // Realistic stock price based on EPS & PE
      const basePrice = tier.category === 'Large Cap'
        ? 350 + Math.floor(rng() * 4500)
        : tier.category === 'Mid Cap'
        ? 150 + Math.floor(rng() * 2500)
        : 25 + Math.floor(rng() * 1200);

      const eps = Number((basePrice / pe).toFixed(2));

      // Intraday price movement
      const intradayVolatility = 0.015 + (beta * 0.012);
      const dayDelta = (rng() - 0.48) * intradayVolatility; // slight positive market drift
      const lastPrice = Number((basePrice * (1 + dayDelta)).toFixed(2));
      const previousClose = basePrice;
      const changeAbsolute = Number((lastPrice - previousClose).toFixed(2));
      const changePercent = Number(((changeAbsolute / previousClose) * 100).toFixed(2));

      const dayOpen = Number((previousClose * (1 + (rng() - 0.5) * 0.008)).toFixed(2));
      const dayHigh = Number((Math.max(lastPrice, dayOpen) * (1 + rng() * 0.015)).toFixed(2));
      const dayLow = Number((Math.min(lastPrice, dayOpen) * (1 - rng() * 0.015)).toFixed(2));

      // 52-Week Range
      const high52Ratio = 1.05 + rng() * 0.45;
      const low52Ratio = 0.6 + rng() * 0.35;
      const week52High = Number((Math.max(lastPrice * high52Ratio, dayHigh)).toFixed(2));
      const week52Low = Number((Math.min(lastPrice * low52Ratio, dayLow)).toFixed(2));

      // Volume & 20D Avg
      const baseVol = tier.category === 'Large Cap'
        ? 500000 + Math.floor(rng() * 8000000)
        : tier.category === 'Mid Cap'
        ? 150000 + Math.floor(rng() * 3000000)
        : 20000 + Math.floor(rng() * 800000);

      const avgVolume20D = baseVol;
      const volumeMultiplier = 0.4 + rng() * 2.8;
      const volume = Math.floor(baseVol * volumeMultiplier);

      let volumeVsAvg: VolumeVsAvg;
      if (volumeMultiplier >= 3.0) volumeVsAvg = '3x';
      else if (volumeMultiplier >= 2.0) volumeVsAvg = '2x';
      else if (volumeMultiplier >= 1.0) volumeVsAvg = 'Above';
      else volumeVsAvg = 'Below';

      // Technical Indicators
      const rsi14 = Number((28 + rng() * 52).toFixed(1)); // 28 - 80
      const atr = Number((lastPrice * (0.012 + rng() * 0.02)).toFixed(2));
      const sma50 = Number((lastPrice * (0.92 + rng() * 0.16)).toFixed(2));
      const sma200 = Number((lastPrice * (0.85 + rng() * 0.28)).toFixed(2));

      const macdRand = rng();
      const macdSignal: MACDSignal = macdRand > 0.6 ? 'Bullish' : macdRand < 0.35 ? 'Bearish' : 'Neutral';

      const bollingerRand = rng();
      const bollingerPosition: BollingerPosition =
        bollingerRand > 0.85 ? 'Above' : bollingerRand < 0.15 ? 'Below' : 'Within';

      stocks.push({
        symbol,
        companyName,
        sector,
        industry,
        marketCapCategory: tier.category,
        indexMembership,
        lastPrice,
        previousClose,
        dayOpen,
        dayHigh,
        dayLow,
        changePercent,
        changeAbsolute,
        volume,
        avgVolume20D,
        week52High,
        week52Low,
        marketCap,
        pe,
        pb,
        dividendYield,
        eps,
        roe,
        roce,
        debtToEquity,
        currentRatio,
        promoterHolding,
        revenueGrowthYoY,
        profitGrowthYoY,
        rsi14,
        sma50,
        sma200,
        beta,
        atr,
        macdSignal,
        bollingerPosition,
        volumeVsAvg,
      });
    }
  }

  return stocks;
}
