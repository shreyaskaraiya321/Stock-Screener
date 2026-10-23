'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { FILTER_PRESETS, FilterPreset } from '@/lib/filterPresets';
import { Sector, MarketCapCategory, MACDSignal, BollingerPosition, VolumeVsAvg } from '@/types/stock';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Search,
  Bookmark,
  Check,
  X,
} from 'lucide-react';

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

const MCAP_CATEGORIES: MarketCapCategory[] = ['Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap'];
const INDICES = ['NIFTY 50', 'NIFTY NEXT 50', 'NIFTY MIDCAP 150', 'NIFTY SMALLCAP 250', 'NIFTY 500'];

export const FilterSidebar: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({
  isOpen,
  onToggle,
}) => {
  const stocks = useStockStore((s) => s.stocks);
  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const activeFilters = useStockStore((s) => s.activeFilters);
  const setFilter = useStockStore((s) => s.setFilter);
  const removeFilter = useStockStore((s) => s.removeFilter);
  const clearFilters = useStockStore((s) => s.clearFilters);
  const applyPreset = useStockStore((s) => s.applyPreset);
  const filterExecutionTimeMs = useStockStore((s) => s.filterExecutionTimeMs);

  // Accordion state
  const [sections, setSections] = useState({
    presets: true,
    marketData: true,
    valuation: true,
    fundamentals: true,
    technicals: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Debounced filter dispatch helper
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const dispatchDebounced = useCallback(
    (fn: () => void) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(fn, 250);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // Helper to check filter active value
  const getFilter = (id: string) => activeFilters.find((f) => f.id === id);

  // Sector Multi-Select handler
  const activeSectorsFilter = getFilter('sector-in');
  const activeSectors: Sector[] = activeSectorsFilter?.value || [];

  const handleToggleSector = (sec: Sector) => {
    let next: Sector[];
    if (activeSectors.includes(sec)) {
      next = activeSectors.filter((s) => s !== sec);
    } else {
      next = [...activeSectors, sec];
    }
    if (next.length === 0) {
      removeFilter('sector-in');
    } else {
      setFilter({
        id: 'sector-in',
        field: 'sector',
        operator: 'in',
        value: next,
        enabled: true,
      });
    }
  };

  // Market Cap Category Multi-Select
  const activeMcapCatFilter = getFilter('mcap-cat-in');
  const activeMcapCats: MarketCapCategory[] = activeMcapCatFilter?.value || [];

  const handleToggleMcapCat = (cat: MarketCapCategory) => {
    let next: MarketCapCategory[];
    if (activeMcapCats.includes(cat)) {
      next = activeMcapCats.filter((c) => c !== cat);
    } else {
      next = [...activeMcapCats, cat];
    }
    if (next.length === 0) {
      removeFilter('mcap-cat-in');
    } else {
      setFilter({
        id: 'mcap-cat-in',
        field: 'marketCapCategory',
        operator: 'in',
        value: next,
        enabled: true,
      });
    }
  };

  // Index Membership
  const activeIndexFilter = getFilter('index-in');
  const activeIndices: string[] = activeIndexFilter?.value || [];

  const handleToggleIndex = (idxName: string) => {
    let next: string[];
    if (activeIndices.includes(idxName)) {
      next = activeIndices.filter((x) => x !== idxName);
    } else {
      next = [...activeIndices, idxName];
    }
    if (next.length === 0) {
      removeFilter('index-in');
    } else {
      setFilter({
        id: 'index-in',
        field: 'indexMembership',
        operator: 'in',
        value: next,
        enabled: true,
      });
    }
  };

  // Watchlist only
  const isWatchlistOnly = getFilter('watchlist-only')?.enabled || false;

  return (
    <aside
      className={`relative z-20 flex flex-col h-full bg-[#0a0f1d] border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 ${
        isOpen ? 'w-[320px]' : 'w-0 overflow-hidden'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-[#0f172a]">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Filters & Screener</h2>
        </div>
        <div className="flex items-center space-x-1">
          {activeFilters.length > 0 && (
            <button
              onClick={clearFilters}
              title="Reset all filters"
              className="flex items-center space-x-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700/60 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Benchmark Counter Banner */}
      <div className="px-3.5 py-2 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">
          Showing <strong className="text-indigo-300">{filteredStocks.length.toLocaleString('en-IN')}</strong> of {stocks.length.toLocaleString('en-IN')}
        </span>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
          ⚡ {filterExecutionTimeMs} ms
        </span>
      </div>

      {/* Scrollable Filter List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 custom-scrollbar text-xs">
        {/* Watchlist Toggle */}
        <div className="p-2.5 rounded-lg bg-surface-elevated/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200 font-medium">My Watchlist Only</span>
          </div>
          <input
            type="checkbox"
            checked={isWatchlistOnly}
            onChange={(e) => {
              if (e.target.checked) {
                setFilter({
                  id: 'watchlist-only',
                  field: 'symbol',
                  operator: 'eq',
                  value: true,
                  enabled: true,
                });
              } else {
                removeFilter('watchlist-only');
              }
            }}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Section: Presets */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('presets')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Presets</span>
            </div>
            {sections.presets ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {sections.presets && (
            <div className="p-2.5 space-y-1.5">
              {FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left p-2 rounded bg-surface-elevated/50 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-200 group-hover:text-indigo-300">
                      {preset.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{preset.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section: Market Data & Indices */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('marketData')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Market Data & Indices</span>
            {sections.marketData ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {sections.marketData && (
            <div className="p-2.5 space-y-3">
              {/* Market Cap Category */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Market Cap Tier</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MCAP_CATEGORIES.map((cat) => {
                    const isSelected = activeMcapCats.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleToggleMcapCat(cat)}
                        className={`px-2 py-1 rounded text-[11px] text-center font-medium border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Indices */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Key Indices</label>
                <div className="flex flex-wrap gap-1">
                  {INDICES.map((idxName) => {
                    const isSelected = activeIndices.includes(idxName);
                    return (
                      <button
                        key={idxName}
                        onClick={() => handleToggleIndex(idxName)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {idxName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sectors */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Sectors</label>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                  {SECTORS.map((sec) => {
                    const isSelected = activeSectors.includes(sec);
                    return (
                      <button
                        key={sec}
                        onClick={() => handleToggleSector(sec)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Valuation */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('valuation')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Valuation</span>
            {sections.valuation ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {sections.valuation && (
            <div className="p-2.5 space-y-3">
              {/* P/E Ratio Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>P/E Ratio Max</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('val-pe-max')?.value ?? 'Any'}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  defaultValue="100"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val >= 100) {
                        removeFilter('val-pe-max');
                      } else {
                        setFilter({
                          id: 'val-pe-max',
                          field: 'pe',
                          operator: 'lte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* P/B Ratio Max */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>P/B Ratio Max</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('val-pb-max')?.value ?? 'Any'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  defaultValue="20"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val >= 20) {
                        removeFilter('val-pb-max');
                      } else {
                        setFilter({
                          id: 'val-pb-max',
                          field: 'pb',
                          operator: 'lte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Dividend Yield Min */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Dividend Yield Min %</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('val-div-min')?.value ? `${getFilter('val-div-min')?.value}%` : '0%'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  defaultValue="0"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val <= 0) {
                        removeFilter('val-div-min');
                      } else {
                        setFilter({
                          id: 'val-div-min',
                          field: 'dividendYield',
                          operator: 'gte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section: Fundamentals */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('fundamentals')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Fundamentals</span>
            {sections.fundamentals ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {sections.fundamentals && (
            <div className="p-2.5 space-y-3">
              {/* ROE Min */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>ROE Min %</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('fund-roe-min')?.value ? `${getFilter('fund-roe-min')?.value}%` : '0%'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="2"
                  defaultValue="0"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val <= 0) {
                        removeFilter('fund-roe-min');
                      } else {
                        setFilter({
                          id: 'fund-roe-min',
                          field: 'roe',
                          operator: 'gte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* ROCE Min */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>ROCE Min %</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('fund-roce-min')?.value ? `${getFilter('fund-roce-min')?.value}%` : '0%'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="2"
                  defaultValue="0"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val <= 0) {
                        removeFilter('fund-roce-min');
                      } else {
                        setFilter({
                          id: 'fund-roce-min',
                          field: 'roce',
                          operator: 'gte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Debt to Equity Max */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Debt/Equity Max</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('fund-de-max')?.value ?? 'Any'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.25"
                  defaultValue="5"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val >= 5) {
                        removeFilter('fund-de-max');
                      } else {
                        setFilter({
                          id: 'fund-de-max',
                          field: 'debtToEquity',
                          operator: 'lte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Promoter Holding Min */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Promoter Holding Min %</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('fund-prom-min')?.value ? `${getFilter('fund-prom-min')?.value}%` : '0%'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="75"
                  step="5"
                  defaultValue="0"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    dispatchDebounced(() => {
                      if (val <= 0) {
                        removeFilter('fund-prom-min');
                      } else {
                        setFilter({
                          id: 'fund-prom-min',
                          field: 'promoterHolding',
                          operator: 'gte',
                          value: val,
                          enabled: true,
                        });
                      }
                    });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section: Technical Indicators */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('technicals')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Technical Indicators</span>
            {sections.technicals ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {sections.technicals && (
            <div className="p-2.5 space-y-3">
              {/* RSI(14) Range */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>RSI(14) Filter</span>
                  <span className="text-slate-200 font-mono">
                    {getFilter('tech-rsi-ovb')?.value
                      ? 'Overbought (>70)'
                      : getFilter('tech-rsi-ovs')?.value
                      ? 'Oversold (<30)'
                      : 'All'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      removeFilter('tech-rsi-ovb');
                      removeFilter('tech-rsi-ovs');
                    }}
                    className="px-2 py-1 rounded text-[10px] bg-surface-elevated text-slate-400 hover:text-white border border-slate-800"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      removeFilter('tech-rsi-ovb');
                      setFilter({
                        id: 'tech-rsi-ovs',
                        field: 'rsi14',
                        operator: 'lte',
                        value: 30,
                        enabled: true,
                      });
                    }}
                    className="px-2 py-1 rounded text-[10px] bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-800/60"
                  >
                    &lt; 30
                  </button>
                  <button
                    onClick={() => {
                      removeFilter('tech-rsi-ovs');
                      setFilter({
                        id: 'tech-rsi-ovb',
                        field: 'rsi14',
                        operator: 'gte',
                        value: 70,
                        enabled: true,
                      });
                    }}
                    className="px-2 py-1 rounded text-[10px] bg-rose-950/60 text-rose-400 hover:bg-rose-900/80 border border-rose-800/60"
                  >
                    &gt; 70
                  </button>
                </div>
              </div>

              {/* MACD Signal */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">MACD Signal</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Bullish', 'Bearish', 'Neutral'] as MACDSignal[]).map((sig) => {
                    const active = getFilter('tech-macd')?.value === sig;
                    return (
                      <button
                        key={sig}
                        onClick={() => {
                          if (active) {
                            removeFilter('tech-macd');
                          } else {
                            setFilter({
                              id: 'tech-macd',
                              field: 'macdSignal',
                              operator: 'eq',
                              value: sig,
                              enabled: true,
                            });
                          }
                        }}
                        className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-colors ${
                          active
                            ? sig === 'Bullish'
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : sig === 'Bearish'
                              ? 'bg-rose-600 border-rose-400 text-white'
                              : 'bg-slate-600 border-slate-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sig}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price vs SMA 50 & SMA 200 */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Moving Averages</label>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      const cur = getFilter('tech-sma50')?.value;
                      if (cur === 'Above') {
                        removeFilter('tech-sma50');
                      } else {
                        setFilter({
                          id: 'tech-sma50',
                          field: 'priceVsSma50' as any,
                          operator: 'eq',
                          value: 'Above',
                          enabled: true,
                        });
                      }
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] border transition-colors flex justify-between items-center ${
                      getFilter('tech-sma50')?.value === 'Above'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                        : 'bg-surface-elevated border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Price &gt; 50 SMA</span>
                    {getFilter('tech-sma50')?.value === 'Above' && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>

                  <button
                    onClick={() => {
                      const cur = getFilter('tech-sma200')?.value;
                      if (cur === 'Above') {
                        removeFilter('tech-sma200');
                      } else {
                        setFilter({
                          id: 'tech-sma200',
                          field: 'priceVsSma200' as any,
                          operator: 'eq',
                          value: 'Above',
                          enabled: true,
                        });
                      }
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] border transition-colors flex justify-between items-center ${
                      getFilter('tech-sma200')?.value === 'Above'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                        : 'bg-surface-elevated border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Price &gt; 200 SMA (Golden)</span>
                    {getFilter('tech-sma200')?.value === 'Above' && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>
                </div>
              </div>

              {/* Volume Spike vs 20D Avg */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Volume Spike (vs 20D Avg)</label>
                <div className="grid grid-cols-2 gap-1">
                  {['Above', '2x', '3x'].map((volTier) => {
                    const active = getFilter('tech-vol-spike')?.value === volTier;
                    return (
                      <button
                        key={volTier}
                        onClick={() => {
                          if (active) {
                            removeFilter('tech-vol-spike');
                          } else {
                            setFilter({
                              id: 'tech-vol-spike',
                              field: 'volumeVsAvg',
                              operator: 'eq',
                              value: volTier,
                              enabled: true,
                            });
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors ${
                          active
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {volTier === 'Above' ? 'Above Avg' : `${volTier} Volume`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
