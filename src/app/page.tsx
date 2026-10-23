'use client';

import React, { useEffect, useState } from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { generateIndianStocks } from '@/lib/mockDataGenerator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { Navbar } from '@/components/Navbar';
import { FilterSidebar } from '@/components/FilterPanel/FilterSidebar';
import { ActiveFiltersBar } from '@/components/FilterPanel/ActiveFiltersBar';
import { ScreenerTable } from '@/components/DataGrid/ScreenerTable';
import { StockChartModal } from '@/components/StockChart/StockChartModal';

export default function StockScreenerPage() {
  const stocks = useStockStore((s) => s.stocks);
  const setStocks = useStockStore((s) => s.setStocks);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize 5,000 stocks on mount
  useEffect(() => {
    if (stocks.length === 0) {
      console.log('Generating 5,000 realistic Indian stocks...');
      const start = performance.now();
      const generated = generateIndianStocks();
      setStocks(generated);
      console.log(
        `Generated ${generated.length} stocks adhering to SEBI distribution in ${(
          performance.now() - start
        ).toFixed(2)}ms`
      );
    }
  }, [stocks.length, setStocks]);

  // Real-time market streaming hook
  const { connectionStatus, isStreaming, toggleStreaming } = useRealtimePrices();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* Navigation & Header */}
      <Navbar
        connectionStatus={connectionStatus}
        isStreaming={isStreaming}
        toggleStreaming={toggleStreaming}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Collapsible Filter Sidebar */}
        <FilterSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Data Grid Section */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090d16]">
          {/* Active Filter Chips */}
          <ActiveFiltersBar />

          {/* Virtualized TanStack Table */}
          <div className="flex-1 overflow-hidden">
            <ScreenerTable />
          </div>
        </div>
      </div>

      {/* TradingView Chart Modal */}
      <StockChartModal />
    </div>
  );
}
