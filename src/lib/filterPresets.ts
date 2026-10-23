import { FilterConfig } from '@/types/stock';
import { ActiveFiltersState } from './filterEngine';

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  filters: FilterConfig[]; // Array format
  filterMap: ActiveFiltersState; // Record format
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'value-stocks',
    name: 'Value Stocks',
    description: 'P/E < 15, ROE > 15%, Debt/Equity < 0.5, Div Yield > 2%',
    badge: 'Fundamental',
    filterMap: {
      pe: { min: null, max: 15 },
      roe: { min: 15, max: null },
      debtToEquity: { min: null, max: 0.5 },
      dividendYield: { min: 2.0, max: null },
    },
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
    filterMap: {
      revenueGrowthYoY: { min: 20, max: null },
      profitGrowthYoY: { min: 20, max: null },
      rsi14: { min: 40, max: 70 },
      priceVsSma50: 'Above',
    },
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
    description: 'Market Cap = Large Cap, ROCE > 15%, Promoter > 50%',
    badge: 'Bluechip',
    filterMap: {
      marketCapCategory: ['Large Cap'],
      roce: { min: 15, max: null },
      promoterHolding: { min: 50, max: null },
    },
    filters: [
      { id: 'lcq-mcap-cat', field: 'marketCapCategory', operator: 'in', value: ['Large Cap'], enabled: true },
      { id: 'lcq-roce', field: 'roce', operator: 'gt', value: 15, enabled: true },
      { id: 'lcq-promoter', field: 'promoterHolding', operator: 'gt', value: 50, enabled: true },
    ],
  },
  {
    id: 'technical-breakout',
    name: 'Technical Breakout',
    description: 'RSI 50-70, MACD Bullish, Volume vs 20D Avg >= 2x',
    badge: 'Technical',
    filterMap: {
      rsi14: { min: 50, max: 70 },
      macdSignal: 'Bullish',
      volumeVsAvg: '2x',
    },
    filters: [
      { id: 'tb-rsi', field: 'rsi14', operator: 'between', value: [50, 70], enabled: true },
      { id: 'tb-macd', field: 'macdSignal', operator: 'eq', value: 'Bullish', enabled: true },
      { id: 'tb-vol', field: 'volumeVsAvg', operator: 'in', value: ['2x', '3x'], enabled: true },
    ],
  },
];

export const PRESET_MAP: Record<string, FilterPreset> = {
  'Value Stocks': FILTER_PRESETS[0],
  'Growth Momentum': FILTER_PRESETS[1],
  'Large Cap Quality': FILTER_PRESETS[2],
  'Technical Breakout': FILTER_PRESETS[3],
  'value-stocks': FILTER_PRESETS[0],
  'growth-momentum': FILTER_PRESETS[1],
  'large-cap-quality': FILTER_PRESETS[2],
  'technical-breakout': FILTER_PRESETS[3],
};
