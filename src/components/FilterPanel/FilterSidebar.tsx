'use client';

import React, { useState } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { FILTER_PRESETS } from '@/lib/filterPresets';
import { RangeFilter } from './RangeFilter';
import { MultiSelectFilter } from './MultiSelectFilter';
import { Sector, MarketCapCategory, MACDSignal, BollingerPosition, VolumeVsAvg } from '@/types/stock';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Bookmark,
  Check,
  Zap,
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

export const FilterSidebar: React.FC = () => {
  const stocks = useStockStore((s) => s.stocks);
  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const activeFilters = useStockStore((s) => s.activeFilters);
  const updateFilter = useStockStore((s) => s.updateFilter);
  const removeFilter = useStockStore((s) => s.removeFilter);
  const clearAllFilters = useStockStore((s) => s.clearAllFilters);
  const applyPreset = useStockStore((s) => s.applyPreset);
  const filterExecutionTimeMs = useStockStore((s) => s.filterExecutionTimeMs);
  const isFilterOpen = useStockStore((s) => s.isFilterOpen);
  const toggleFilterPanel = useStockStore((s) => s.toggleFilterPanel);

  // Accordion state
  const [sections, setSections] = useState({
    presets: true,
    valuation: true,
    technicals: true,
    classification: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <aside
      className={`relative z-20 flex flex-col h-full bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 select-none ${
        isFilterOpen ? 'w-[320px]' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide font-sans">
            Filters & Screener
          </h2>
        </div>
        <div className="flex items-center space-x-1">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              title="Reset all filters"
              className="flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700/60 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Counter with Performance Instrumentation */}
      <div className="px-3.5 py-2 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium text-[11px]">
          Showing <strong className="text-indigo-300">{filteredStocks.length.toLocaleString('en-IN')}</strong> of {stocks.length.toLocaleString('en-IN')} stocks
        </span>
        <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
          <Zap className="w-2.5 h-2.5" />
          <span>{filterExecutionTimeMs}ms</span>
        </span>
      </div>

      {/* Scrollable Filter List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 custom-scrollbar text-xs">
        {/* Watchlist Toggle */}
        <div className="p-2.5 rounded-lg bg-surface-elevated/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200 font-medium text-xs">My Watchlist Only</span>
          </div>
          <input
            type="checkbox"
            checked={!!activeFilters.watchlistOnly}
            onChange={(e) => {
              if (e.target.checked) {
                updateFilter('watchlistOnly', true);
              } else {
                removeFilter('watchlistOnly');
              }
            }}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Section 1: Quick Presets */}
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
                  className="w-full text-left p-2 rounded bg-surface-elevated/50 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 transition-all group"
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

        {/* Section 2: Valuation & Fundamentals */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('valuation')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Valuation & Fundamentals</span>
            {sections.valuation ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {sections.valuation && (
            <div className="p-2.5 space-y-3">
              <RangeFilter
                label="Market Cap (Cr)"
                field="marketCap"
                unit="₹ Cr"
                value={activeFilters.marketCap as any}
                onChange={(v) => updateFilter('marketCap', v)}
                minPlaceholder="50"
                maxPlaceholder="2000000"
              />

              <RangeFilter
                label="P/E Ratio"
                field="pe"
                value={activeFilters.pe as any}
                onChange={(v) => updateFilter('pe', v)}
                minPlaceholder="0"
                maxPlaceholder="100"
                step={0.5}
              />

              <RangeFilter
                label="P/B Ratio"
                field="pb"
                value={activeFilters.pb as any}
                onChange={(v) => updateFilter('pb', v)}
                minPlaceholder="0"
                maxPlaceholder="25"
                step={0.1}
              />

              <RangeFilter
                label="ROE (%)"
                field="roe"
                unit="%"
                value={activeFilters.roe as any}
                onChange={(v) => updateFilter('roe', v)}
                minPlaceholder="0"
                maxPlaceholder="60"
              />

              <RangeFilter
                label="ROCE (%)"
                field="roce"
                unit="%"
                value={activeFilters.roce as any}
                onChange={(v) => updateFilter('roce', v)}
                minPlaceholder="0"
                maxPlaceholder="60"
              />

              <RangeFilter
                label="Debt to Equity"
                field="debtToEquity"
                unit="x"
                value={activeFilters.debtToEquity as any}
                onChange={(v) => updateFilter('debtToEquity', v)}
                minPlaceholder="0"
                maxPlaceholder="15"
                step={0.1}
              />

              <RangeFilter
                label="Dividend Yield"
                field="dividendYield"
                unit="%"
                value={activeFilters.dividendYield as any}
                onChange={(v) => updateFilter('dividendYield', v)}
                minPlaceholder="0"
                maxPlaceholder="8"
                step={0.2}
              />

              <RangeFilter
                label="Promoter Holding"
                field="promoterHolding"
                unit="%"
                value={activeFilters.promoterHolding as any}
                onChange={(v) => updateFilter('promoterHolding', v)}
                minPlaceholder="0"
                maxPlaceholder="75"
              />

              <RangeFilter
                label="Revenue Growth YoY"
                field="revenueGrowthYoY"
                unit="%"
                value={activeFilters.revenueGrowthYoY as any}
                onChange={(v) => updateFilter('revenueGrowthYoY', v)}
                minPlaceholder="-10"
                maxPlaceholder="60"
              />

              <RangeFilter
                label="Profit Growth YoY"
                field="profitGrowthYoY"
                unit="%"
                value={activeFilters.profitGrowthYoY as any}
                onChange={(v) => updateFilter('profitGrowthYoY', v)}
                minPlaceholder="-10"
                maxPlaceholder="80"
              />
            </div>
          )}
        </div>

        {/* Section 3: Technicals & Momentum */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('technicals')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Technicals & Momentum</span>
            {sections.technicals ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {sections.technicals && (
            <div className="p-2.5 space-y-3">
              <RangeFilter
                label="RSI (14)"
                field="rsi14"
                value={activeFilters.rsi14 as any}
                onChange={(v) => updateFilter('rsi14', v)}
                minPlaceholder="0"
                maxPlaceholder="100"
              />

              {/* MACD Signal */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">MACD Signal</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Bullish', 'Bearish', 'Neutral'] as MACDSignal[]).map((sig) => {
                    const active = activeFilters.macdSignal === sig;
                    return (
                      <button
                        key={sig}
                        type="button"
                        onClick={() => {
                          if (active) removeFilter('macdSignal');
                          else updateFilter('macdSignal', sig);
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

              {/* Price vs SMA 50 */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Price vs SMA 50</label>
                <div className="grid grid-cols-2 gap-1">
                  {['Above', 'Below'].map((pos) => {
                    const active = activeFilters.priceVsSma50 === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          if (active) removeFilter('priceVsSma50');
                          else updateFilter('priceVsSma50', pos);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors ${
                          active
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume vs 20D Avg */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Volume Spike (vs 20D Avg)</label>
                <div className="grid grid-cols-2 gap-1">
                  {['Above', '2x', '3x'].map((tier) => {
                    const active = activeFilters.volumeVsAvg === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => {
                          if (active) removeFilter('volumeVsAvg');
                          else updateFilter('volumeVsAvg', tier);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors ${
                          active
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-surface-elevated border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tier === 'Above' ? 'Above Avg' : `${tier} Vol`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Classification */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40">
          <button
            onClick={() => toggleSection('classification')}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 text-slate-200 font-medium transition-colors"
          >
            <span>Classification</span>
            {sections.classification ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {sections.classification && (
            <div className="p-2.5 space-y-3">
              <MultiSelectFilter
                label="Sectors"
                options={SECTORS}
                selectedValues={(activeFilters.sector as string[]) || []}
                onChange={(selected) => updateFilter('sector', selected)}
              />

              <MultiSelectFilter
                label="Market Cap Category"
                options={MCAP_CATEGORIES}
                selectedValues={(activeFilters.marketCapCategory as string[]) || []}
                onChange={(selected) => updateFilter('marketCapCategory', selected)}
                searchable={false}
              />

              <MultiSelectFilter
                label="Index Membership"
                options={INDICES}
                selectedValues={(activeFilters.indexMembership as string[]) || []}
                onChange={(selected) => updateFilter('indexMembership', selected)}
                searchable={false}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
