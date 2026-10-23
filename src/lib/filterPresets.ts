import { FilterConfig } from '@/types/stock';

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  filters: FilterConfig[];
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'value-stocks',
    name: 'Value Stocks',
    description: 'P/E < 15, ROE > 15%, Debt/Equity < 0.5, Div Yield > 2%',
    badge: 'Fundamental',
    filters: [
      { id: 'val-pe', field: 'pe', operator: 'lt', value: 15, enabled: true },
      { id: 'val-roe', field: 'roe', operator: 'gt', value: 15, enabled: true },
      { id: 'val-de', field: 'debtToEquity', operator: 'lt', value: 0.5, enabled: true },
      { id: 'val-div', field: 'dividendYield', operator: 'gt', value: 2.0, enabled: true },
    ],
  },
  {
    id: 'growth-momentum',
    name: 'Growth Momentum',
    description: 'Rev & Profit Growth > 20%, RSI 40-70, Price > SMA 50',
    badge: 'Momentum',
    filters: [
      { id: 'gm-rev', field: 'revenueGrowthYoY', operator: 'gt', value: 20, enabled: true },
      { id: 'gm-prof', field: 'profitGrowthYoY', operator: 'gt', value: 20, enabled: true },
      { id: 'gm-rsi', field: 'rsi14', operator: 'between', value: [40, 70], enabled: true },
      { id: 'gm-sma50', field: 'priceVsSma50' as any, operator: 'eq', value: 'Above', enabled: true },
    ],
  },
  {
    id: 'large-cap-quality',
    name: 'Large Cap Quality',
    description: 'Market Cap > 50k Cr, ROCE > 15%, Promoter > 50%',
    badge: 'Bluechip',
    filters: [
      { id: 'lcq-mcap', field: 'marketCap', operator: 'gte', value: 50000, enabled: true },
      { id: 'lcq-roce', field: 'roce', operator: 'gt', value: 15, enabled: true },
      { id: 'lcq-promoter', field: 'promoterHolding', operator: 'gt', value: 50, enabled: true },
    ],
  },
  {
    id: 'technical-breakout',
    name: 'Technical Breakout',
    description: 'Price > SMA 200, RSI 50-70, Volume >= 2x 20D Avg',
    badge: 'Technical',
    filters: [
      { id: 'tb-sma200', field: 'priceVsSma200' as any, operator: 'eq', value: 'Above', enabled: true },
      { id: 'tb-rsi', field: 'rsi14', operator: 'between', value: [50, 70], enabled: true },
      { id: 'tb-vol', field: 'volumeVsAvg', operator: 'in', value: ['2x', '3x'], enabled: true },
    ],
  },
];
