export type Sector =
  | 'IT'
  | 'Banking'
  | 'Pharma'
  | 'Auto'
  | 'FMCG'
  | 'Metal'
  | 'Energy'
  | 'Realty'
  | 'Telecom'
  | 'Infrastructure'
  | 'Chemicals'
  | 'Others';

export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Micro Cap';

export type MACDSignal = 'Bullish' | 'Bearish' | 'Neutral';
export type BollingerPosition = 'Above' | 'Within' | 'Below';
export type VolumeVsAvg = 'Below' | 'Above' | '2x' | '3x';

export interface Stock {
  symbol: string;
  companyName: string;
  sector: Sector;
  industry: string;
  marketCapCategory: MarketCapCategory;
  indexMembership: string[];
  lastPrice: number;
  previousClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  changePercent: number;
  changeAbsolute: number;
  volume: number;
  avgVolume20D: number;
  week52High: number;
  week52Low: number;
  marketCap: number; // in Crores
  pe: number;
  pb: number;
  dividendYield: number; // percentage
  eps: number;
  roe: number; // percentage
  roce: number; // percentage
  debtToEquity: number;
  currentRatio: number;
  promoterHolding: number; // percentage
  revenueGrowthYoY: number; // percentage
  profitGrowthYoY: number; // percentage
  rsi14: number;
  sma50: number;
  sma200: number;
  beta: number;
  atr: number;
  macdSignal: MACDSignal;
  bollingerPosition: BollingerPosition;
  volumeVsAvg: VolumeVsAvg;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';

export interface FilterConfig {
  id: string;
  field: keyof Stock;
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

export interface SortConfig {
  column: keyof Stock;
  direction: 'asc' | 'desc';
}

export interface PriceUpdate {
  symbol: string;
  lastPrice: number;
  changeAbsolute: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  flash?: 'up' | 'down' | null;
}

export interface OHLCVData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
