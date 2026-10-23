'use client';

import React, { useState } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { ConnectionStatus } from '@/hooks/useRealtimePrices';
import {
  TrendingUp,
  Activity,
  Play,
  Pause,
  Search,
  SlidersHorizontal,
  Bookmark,
  Download,
  Flame,
} from 'lucide-react';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  isStreaming: boolean;
  toggleStreaming: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus,
  isStreaming,
  toggleStreaming,
  isSidebarOpen,
  toggleSidebar,
}) => {
  const stocks = useStockStore((s) => s.stocks);
  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);
  const watchlist = useStockStore((s) => s.watchlist);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Quick search autocomplete matches
  const searchResults = searchQuery.trim()
    ? stocks
        .filter(
          (s) =>
            s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const handleExportCSV = () => {
    if (filteredStocks.length === 0) return;
    const headers = [
      'Symbol',
      'Company Name',
      'Price (INR)',
      'Change %',
      'Market Cap (Cr)',
      'Sector',
      'P/E',
      'P/B',
      'ROE %',
      'D/E',
      'RSI',
    ];
    const rows = filteredStocks.map((s) => [
      s.symbol,
      `"${s.companyName.replace(/"/g, '""')}"`,
      s.lastPrice,
      s.changePercent,
      s.marketCap,
      s.sector,
      s.pe,
      s.pb,
      s.roe,
      s.debtToEquity,
      s.rsi14,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `indian_stocks_screener_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="relative z-30 flex flex-col border-b border-slate-800 bg-[#080d1a] shadow-lg">
      {/* Top Bar: Indices Ticker */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#050811] border-b border-slate-800/80 text-[11px] font-mono overflow-x-auto custom-scrollbar">
        <div className="flex items-center space-x-6 text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">NIFTY 50</span>
            <span className="text-slate-100">24,852.15</span>
            <span className="text-emerald-400">+112.40 (+0.45%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">SENSEX</span>
            <span className="text-slate-100">81,455.40</span>
            <span className="text-emerald-400">+342.10 (+0.42%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">BANK NIFTY</span>
            <span className="text-slate-100">51,210.85</span>
            <span className="text-rose-400">-64.20 (-0.13%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">INDIA VIX</span>
            <span className="text-slate-100">12.84</span>
            <span className="text-rose-400">-0.32 (-2.43%)</span>
          </div>
        </div>

        {/* Live streaming status indicator */}
        <div className="flex items-center space-x-2 shrink-0 ml-4">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
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
            <span
              className={`font-medium ${
                connectionStatus === 'Connected'
                  ? 'text-emerald-400'
                  : connectionStatus === 'Reconnecting'
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {connectionStatus}
            </span>
          </div>

          <button
            onClick={toggleStreaming}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${
              isStreaming
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-2.5 h-2.5" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5" />
                <span>Resume Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg border transition-colors ${
              isSidebarOpen
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-surface-elevated border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle Filter Sidebar"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-md shadow-indigo-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm font-bold tracking-tight text-white font-sans">
                  BHARAT SCREENER
                </h1>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  NSE • BSE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans hidden sm:block">
                Institutional 60 FPS Real-Time Stock Engine
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar with Autocomplete */}
        <div className="relative flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker (e.g., RELIANCE, TCS) or company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            />
          </div>

          {/* Autocomplete Dropdown */}
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
                    <span className="text-xs text-slate-300 truncate max-w-[200px]">
                      {item.companyName}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-right">
                    <span className="text-slate-100">₹{item.lastPrice}</span>
                    <span
                      className={`ml-2 ${
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-slate-800 text-slate-300">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Watchlist:</span>
            <span className="font-mono font-semibold text-amber-300">{watchlist.size}</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Export filtered stocks to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
