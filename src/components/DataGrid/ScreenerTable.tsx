'use client';

import React, { useRef, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Stock } from '@/types/stock';
import { useStockStore } from '@/stores/useStockStore';
import { PriceCell } from './cells/PriceCell';
import { ChangeCell } from './cells/ChangeCell';
import { MetricCell } from './cells/MetricCell';
import { TextCell } from './cells/TextCell';
import { formatMarketCap, formatPercent, formatINR } from '@/lib/formatters';
import { Star, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const ScreenerTable: React.FC = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const sortConfig = useStockStore((s) => s.sortConfig);
  const setSortConfig = useStockStore((s) => s.setSortConfig);
  const selectedSymbol = useStockStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);
  const watchlist = useStockStore((s) => s.watchlist);
  const toggleWatchlist = useStockStore((s) => s.toggleWatchlist);
  const priceFlashes = useStockStore((s) => s.priceFlashes);

  // Define columns matching Step 2 specification
  const columns = useMemo<ColumnDef<Stock>[]>(
    () => [
      {
        id: 'watchlist',
        header: '',
        size: 38,
        cell: ({ row }) => {
          const isStarred = watchlist.includes(row.original.symbol);
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(row.original.symbol);
              }}
              className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
              title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={`Toggle watchlist for ${row.original.symbol}`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                }`}
              />
            </button>
          );
        },
      },
      {
        accessorKey: 'symbol',
        header: 'Symbol',
        size: 110,
        cell: ({ row }) => (
          <div className="flex items-center space-x-1.5 font-bold font-mono text-xs text-indigo-300">
            <span>{row.original.symbol}</span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-surface-elevated text-slate-400 font-normal">
              NSE
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        size: 190,
        cell: ({ row }) => (
          <TextCell text={row.original.companyName} className="font-sans" />
        ),
      },
      {
        accessorKey: 'sector',
        header: 'Sector',
        size: 120,
        cell: ({ row }) => (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 inline-block truncate max-w-[110px]">
            {row.original.sector}
          </span>
        ),
      },
      {
        accessorKey: 'lastPrice',
        header: 'Price (₹)',
        size: 105,
        cell: ({ row }) => (
          <PriceCell
            price={row.original.lastPrice}
            flash={priceFlashes[row.original.symbol] ?? null}
          />
        ),
      },
      {
        accessorKey: 'changePercent',
        header: 'Change %',
        size: 105,
        cell: ({ row }) => (
          <ChangeCell
            changePercent={row.original.changePercent}
            changeAbsolute={row.original.changeAbsolute}
            flash={priceFlashes[row.original.symbol] ?? null}
          />
        ),
      },
      {
        accessorKey: 'marketCap',
        header: 'Market Cap',
        size: 125,
        cell: ({ row }) => (
          <MetricCell value={formatMarketCap(row.original.marketCap)} />
        ),
      },
      {
        accessorKey: 'pe',
        header: 'P/E',
        size: 75,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.pe.toFixed(1)}
            highlight={row.original.pe < 15 ? 'positive' : row.original.pe > 60 ? 'warning' : 'neutral'}
          />
        ),
      },
      {
        accessorKey: 'pb',
        header: 'P/B',
        size: 70,
        cell: ({ row }) => <MetricCell value={row.original.pb.toFixed(2)} />,
      },
      {
        accessorKey: 'roe',
        header: 'ROE (%)',
        size: 80,
        cell: ({ row }) => (
          <MetricCell
            value={formatPercent(row.original.roe, 1)}
            highlight={row.original.roe >= 18 ? 'positive' : 'neutral'}
          />
        ),
      },
      {
        accessorKey: 'debtToEquity',
        header: 'Debt/Equity',
        size: 90,
        cell: ({ row }) => (
          <MetricCell
            value={`${row.original.debtToEquity.toFixed(2)}x`}
            highlight={row.original.debtToEquity < 0.5 ? 'positive' : row.original.debtToEquity > 3 ? 'warning' : 'neutral'}
          />
        ),
      },
      {
        accessorKey: 'week52High',
        header: '52W High',
        size: 100,
        cell: ({ row }) => (
          <MetricCell
            value={formatINR(row.original.week52High, 0)}
            highlight="positive"
          />
        ),
      },
      {
        accessorKey: 'week52Low',
        header: '52W Low',
        size: 100,
        cell: ({ row }) => (
          <MetricCell
            value={formatINR(row.original.week52Low, 0)}
            highlight="negative"
          />
        ),
      },
      {
        accessorKey: 'rsi14',
        header: 'RSI (14)',
        size: 80,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.rsi14.toFixed(1)}
            highlight={
              row.original.rsi14 >= 70
                ? 'negative'
                : row.original.rsi14 <= 30
                ? 'positive'
                : 'neutral'
            }
          />
        ),
      },
    ],
    [watchlist, toggleWatchlist, priceFlashes]
  );

  const table = useReactTable({
    data: filteredStocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  // TanStack Virtualizer v3: strictly fixed row height 36px, overscan 12 rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  // Calculate sticky pinned column offsets
  const getPinnedStyle = (colIndex: number): React.CSSProperties => {
    if (colIndex === 0) {
      return { position: 'sticky', left: 0, zIndex: 10 };
    }
    if (colIndex === 1) {
      return { position: 'sticky', left: 38, zIndex: 10 };
    }
    return {};
  };

  const getHeaderPinnedStyle = (colIndex: number): React.CSSProperties => {
    if (colIndex === 0) {
      return { position: 'sticky', left: 0, zIndex: 30 };
    }
    if (colIndex === 1) {
      return { position: 'sticky', left: 38, zIndex: 30 };
    }
    return { zIndex: 20 };
  };

  return (
    <div
      ref={parentRef}
      className="relative flex-1 w-full h-full overflow-auto bg-[#090d16] select-none focus:outline-none custom-scrollbar"
      role="grid"
      aria-label="Indian Equities Screener Grid"
      aria-rowcount={rows.length}
      aria-colcount={columns.length}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && selectedSymbol) {
          // Enter key selects active symbol
        }
      }}
    >
      <div
        style={{
          width: 'max-content',
          minWidth: '100%',
        }}
      >
        {/* Sticky Table Header */}
        <div
          role="rowgroup"
          className="sticky top-0 z-20 flex bg-[#0f172a] border-b border-slate-800 shadow-md backdrop-blur-md"
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex" role="row">
              {headerGroup.headers.map((header, idx) => {
                const columnId = header.id as keyof Stock;
                const isSorted = sortConfig.column === columnId ? sortConfig.direction : false;
                const pinnedStyle = getHeaderPinnedStyle(idx);
                const isPinned = idx <= 1;

                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-label={`Sort by ${header.id}`}
                    aria-sort={isSorted ? (isSorted === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      ...pinnedStyle,
                    }}
                    onClick={() => {
                      if (header.id !== 'watchlist') {
                        setSortConfig(columnId); // Cycles: desc -> asc -> desc
                      }
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none cursor-pointer border-r border-slate-800/80 hover:bg-slate-800/60 transition-colors ${
                      isPinned ? 'bg-[#0f172a]' : ''
                    }`}
                  >
                    <span className="truncate">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.id !== 'watchlist' && (
                      <span className="ml-1 text-slate-500">
                        {isSorted === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : isSorted === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Virtualized Table Body */}
        <div
          role="rowgroup"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isSelected = selectedSymbol === row.original.symbol;

            return (
              <div
                key={row.original.symbol}
                role="row"
                aria-selected={isSelected}
                aria-rowindex={virtualRow.index + 1}
                tabIndex={0}
                onClick={() => setSelectedSymbol(row.original.symbol)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedSymbol(row.original.symbol);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: '36px',
                }}
                className={`flex items-center border-b border-slate-800/50 cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/50'
                    : virtualRow.index % 2 === 0
                    ? 'bg-[#0a0f1d] hover:bg-slate-800/50'
                    : 'bg-[#080c18] hover:bg-slate-800/50'
                }`}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const pinnedStyle = getPinnedStyle(idx);
                  const isPinned = idx <= 1;
                  const cellBg = isSelected
                    ? 'bg-[#141b34]'
                    : virtualRow.index % 2 === 0
                    ? 'bg-[#0a0f1d]'
                    : 'bg-[#080c18]';

                  return (
                    <div
                      key={cell.id}
                      role="gridcell"
                      aria-label={`${cell.column.id}: ${cell.getValue()}`}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        height: '36px',
                        ...pinnedStyle,
                      }}
                      className={`flex items-center px-2.5 border-r border-slate-800/40 text-xs ${
                        isPinned ? `${cellBg} shadow-sm` : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
