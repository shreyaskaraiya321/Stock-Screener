'use client';

import React, { useState, useEffect } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { ScreenerTable } from '@/components/DataGrid/ScreenerTable';
import { FilterSidebar } from '@/components/FilterPanel/FilterSidebar';
import { ActiveFiltersBar } from '@/components/FilterPanel/ActiveFiltersBar';
import { StockChartModal } from '@/components/StockChart/StockChartModal';
import {
  TrendingUp,
  Activity,
  SlidersHorizontal,
  Bookmark,
  Download,
  Search,
  Pause,
  Play,
} from 'lucide-react';

export default function StockScreenerPage() {
  const stocks = useStockStore((s) => s.stocks);
  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const watchlist = useStockStore((s) => s.watchlist);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time market streaming hook
  const { connectionStatus, isStreaming, toggleStreaming } = useRealtimePrices();

  // Search autocomplete
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
      'Price (₹)',
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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_screener_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* 64px Header */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 bg-[#080d1a] border-b border-slate-800 shadow-lg z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-lg border transition-colors ${
              isSidebarOpen
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-surface-elevated border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle Filter Sidebar"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-white tracking-tight font-sans">
                  Real-Time Stock Screener
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  NSE • BSE
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <span>
                  Showing <strong className="text-indigo-300">{filteredStocks.length.toLocaleString('en-IN')}</strong> of {stocks.length.toLocaleString('en-IN')} Equities
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar with Autocomplete */}
        <div className="relative flex-1 max-w-sm mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker (e.g., RELIANCE, TCS)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
              {searchResults.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSelectedSymbol(item.symbol);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-indigo-300">
                      {item.symbol}
                    </span>
                    <span className="text-xs text-slate-300 truncate max-w-[180px]">
                      {item.companyName}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-200">
                    ₹{item.lastPrice}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Market Status Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-emerald-400 text-[11px] whitespace-nowrap">
              Simulated Market Active
            </span>
          </div>

          {/* Pause / Resume Stream */}
          <button
            onClick={toggleStreaming}
            className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded text-xs border transition-colors ${
              isStreaming
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3 h-3" />
                <span className="text-[11px]">Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span className="text-[11px]">Resume Stream</span>
              </>
            )}
          </button>

          {/* Watchlist Counter */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-slate-800 text-slate-300 text-xs">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Watchlist:</span>
            <span className="font-mono font-semibold text-amber-300">
              {mounted ? watchlist.length : 0}
            </span>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors text-xs"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Export</span>
          </button>
        </div>
      </header>

      {/* Main Viewport: h-[calc(100vh-64px)] overflow-hidden */}
      <main className="h-[calc(100vh-64px)] w-full flex overflow-hidden relative">
        {/* Collapsible Filter Sidebar */}
        <FilterSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Data Grid Section */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090d16]">
          {/* Active Filter Chips */}
          <ActiveFiltersBar />

          {/* Virtual Table */}
          <div className="flex-1 overflow-hidden">
            <ScreenerTable />
          </div>
        </div>
      </main>

      {/* TradingView Chart Modal on Selected Symbol */}
      <StockChartModal />
    </div>
  );
}
