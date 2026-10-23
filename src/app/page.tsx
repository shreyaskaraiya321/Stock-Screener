'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { ScreenerTable } from '@/components/DataGrid/ScreenerTable';
import { FilterSidebar } from '@/components/FilterPanel/FilterSidebar';
import { ActiveFilterChips } from '@/components/FilterPanel/ActiveFilterChips';
import { StockChartModal } from '@/components/StockChart/StockChartModal';
import {
  TrendingUp,
  SlidersHorizontal,
  Bookmark,
  Download,
  Search,
  Pause,
  Play,
  Activity,
} from 'lucide-react';

export default function StockScreenerPage() {
  const stocks = useStockStore((s) => s.stocks);
  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const watchlist = useStockStore((s) => s.watchlist);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);
  const isFilterOpen = useStockStore((s) => s.isFilterOpen);
  const toggleFilterPanel = useStockStore((s) => s.toggleFilterPanel);

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { connectionStatus, isStreaming, toggleStreaming } = useRealtimePrices();

  // Power-user shortcuts: '/' focuses search, 'Escape' clears/blurs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (isSearchOpen || searchQuery) {
          setIsSearchOpen(false);
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, searchQuery]);

  const searchResults = searchQuery.trim()
    ? stocks
        .filter(
          (s) =>
            s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleExportCSV = () => {
    if (filteredStocks.length === 0) return;
    const headers = [
      'Symbol',
      'Company Name',
      'Sector',
      'Price (INR)',
      'Change %',
      'Market Cap (Cr)',
      'P/E',
      'P/B',
      'ROE %',
      'Debt/Equity',
      '52W High',
      '52W Low',
      'RSI (14)',
    ];
    const rows = filteredStocks.map((s) => [
      s.symbol,
      `"${s.companyName.replace(/"/g, '""')}"`,
      s.sector,
      s.lastPrice,
      s.changePercent,
      s.marketCap,
      s.pe,
      s.pb,
      s.roe,
      s.debtToEquity,
      s.week52High,
      s.week52Low,
      s.rsi14,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `bharat_screener_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* 60px Terminal Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-3.5 bg-slate-900 border-b border-slate-800 shadow-md z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleFilterPanel}
            className={`p-1.5 rounded border transition-colors ${
              isFilterOpen
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="Toggle Filter Sidebar"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-xs font-bold text-slate-100 tracking-tight font-sans">
                  BHARAT SCREENER
                </h1>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  NSE • BSE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                <span>
                  <strong className="text-indigo-400 font-medium">{filteredStocks.length.toLocaleString('en-IN')}</strong> / {stocks.length.toLocaleString('en-IN')} Equities
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar with '/' Shortcut */}
        <div className="relative flex-1 max-w-sm mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search ticker (e.g., RELIANCE) [Press / to focus]..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-8 pr-8 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            />
            <kbd className="absolute right-2 top-1.5 px-1.5 py-0.2 text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded pointer-events-none">
              /
            </kbd>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded shadow-xl overflow-hidden z-50">
              {searchResults.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSelectedSymbol(item.symbol);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-indigo-300">
                      {item.symbol}
                    </span>
                    <span className="text-xs text-slate-300 truncate max-w-[170px]">
                      {item.companyName}
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-200">
                    ₹{item.lastPrice}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Indicator, Controls & CSV Export */}
        <div className="flex items-center space-x-2">
          {/* Live Status Pill */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] transition-colors ${
              connectionStatus === 'Connected'
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                : connectionStatus === 'Reconnecting'
                ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {connectionStatus === 'Connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionStatus === 'Connected'
                    ? 'bg-emerald-500'
                    : connectionStatus === 'Reconnecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              ></span>
            </span>
            <span className="font-medium whitespace-nowrap">
              {connectionStatus === 'Connected' ? 'Live Ticker' : connectionStatus}
            </span>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={toggleStreaming}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border transition-colors ${
              isStreaming
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
            title={isStreaming ? 'Pause Price Stream' : 'Resume Price Stream'}
          >
            {isStreaming ? (
              <>
                <Pause className="w-2.5 h-2.5" />
                <span className="text-[10px] hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5" />
                <span className="text-[10px] hidden sm:inline">Resume</span>
              </>
            )}
          </button>

          {/* Watchlist Counter */}
          <div className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs">
            <Bookmark className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">Watch:</span>
            <span className="font-mono font-semibold text-amber-300 text-xs">
              {mounted ? watchlist.length : 0}
            </span>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors text-xs"
            title="Export filtered dataset to CSV"
          >
            <Download className="w-3 h-3" />
            <span className="text-[11px] hidden sm:inline">CSV</span>
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="h-[calc(100vh-56px)] w-full flex overflow-hidden relative">
        <FilterSidebar />

        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
          <ActiveFilterChips />
          <div className="flex-1 overflow-hidden">
            <ScreenerTable />
          </div>
        </div>
      </main>

      <StockChartModal />
    </div>
  );
}
