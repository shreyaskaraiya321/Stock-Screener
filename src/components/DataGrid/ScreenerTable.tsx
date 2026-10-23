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

interface TableMeta {
  watchlist: string[];
  toggleWatchlist: (sym: string) => void;
  priceFlashes: Record<string, 'up' | 'down'>;
}

export const ScreenerTable: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredStocks = useStockStore((s) => s.filteredStocks);
  const sortConfig = useStockStore((s) => s.sortConfig);
  const setSortConfig = useStockStore((s) => s.setSortConfig);
  const selectedSymbol = useStockStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useStockStore((s) => s.setSelectedSymbol);
  const watchlist = useStockStore((s) => s.watchlist);
  const toggleWatchlist = useStockStore((s) => s.toggleWatchlist);
  const priceFlashes = useStockStore((s) => s.priceFlashes);

  const columns = useMemo<ColumnDef<Stock>[]>(
    () => [
      {
        id: 'watchlist',
        header: '',
        size: 36,
        cell: ({ row, table }) => {
          const meta = table.options.meta as TableMeta | undefined;
          const isStarred = meta?.watchlist?.includes(row.original.symbol) ?? false;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                meta?.toggleWatchlist(row.original.symbol);
              }}
              className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
              title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={`Watchlist ${row.original.symbol}`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
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
          <div className="flex items-center space-x-1.5 font-mono font-bold text-xs text-indigo-300">
            <span>{row.original.symbol}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
              NSE
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        size: 200,
        cell: ({ row }) => <TextCell text={row.original.companyName} />,
      },
      {
        accessorKey: 'sector',
        header: 'Sector',
        size: 120,
        cell: ({ row }) => (
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50 inline-block truncate max-w-[110px]">
            {row.original.sector}
          </span>
        ),
      },
      {
        accessorKey: 'lastPrice',
        header: 'Price (₹)',
        size: 105,
        cell: ({ row, table }) => {
          const meta = table.options.meta as TableMeta | undefined;
          const flash = meta?.priceFlashes?.[row.original.symbol] ?? null;
          return <PriceCell price={row.original.lastPrice} flash={flash} />;
        },
      },
      {
        accessorKey: 'changePercent',
        header: 'Change %',
        size: 105,
        cell: ({ row, table }) => {
          const meta = table.options.meta as TableMeta | undefined;
          const flash = meta?.priceFlashes?.[row.original.symbol] ?? null;
          return (
            <ChangeCell
              percent={row.original.changePercent}
              absolute={row.original.changeAbsolute}
              flash={flash}
            />
          );
        },
      },
      {
        accessorKey: 'marketCap',
        header: 'Market Cap',
        size: 120,
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
        header: 'Debt/Eq',
        size: 85,
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
        size: 95,
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
        size: 95,
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
    []
  );

  const tableMeta = useMemo<TableMeta>(
    () => ({ watchlist, toggleWatchlist, priceFlashes }),
    [watchlist, toggleWatchlist, priceFlashes]
  );

  const table = useReactTable({
    data: filteredStocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: tableMeta,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  return (
    <div
      ref={scrollContainerRef}
      className="relative flex-1 w-full h-full overflow-auto bg-slate-950 select-none focus:outline-none custom-scrollbar"
      role="grid"
      aria-label="Stock Screener Data Grid"
      aria-rowcount={rows.length}
      aria-colcount={columns.length}
      tabIndex={0}
    >
      <div style={{ width: 'max-content', minWidth: '100%' }}>
        {/* Sticky Header */}
        <div
          role="rowgroup"
          className="sticky top-0 z-20 flex bg-slate-900 border-b border-slate-800 shadow-sm"
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex" role="row">
              {headerGroup.headers.map((header, idx) => {
                const columnId = header.id as keyof Stock;
                const isSorted = sortConfig.column === columnId ? sortConfig.direction : false;
                const isPinned0 = idx === 0;
                const isPinned1 = idx === 1;

                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-label={`Sort by ${header.id}`}
                    aria-sort={isSorted ? (isSorted === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      ...(isPinned0 ? { position: 'sticky', left: 0, zIndex: 30 } : {}),
                      ...(isPinned1 ? { position: 'sticky', left: 36, zIndex: 30 } : {}),
                    }}
                    onClick={() => {
                      if (header.id !== 'watchlist') setSortConfig(columnId);
                    }}
                    className={`flex items-center justify-between px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none cursor-pointer border-r border-slate-800/80 hover:bg-slate-800/70 transition-colors ${
                      isPinned0 || isPinned1 ? 'bg-slate-900' : ''
                    }`}
                  >
                    <span className="truncate">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.id !== 'watchlist' && (
                      <span className="ml-1 text-slate-500 shrink-0">
                        {isSorted === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : isSorted === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Virtualized Body */}
        <div
          role="rowgroup"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = rows[vRow.index];
            const isSelected = selectedSymbol === row.original.symbol;
            const isEven = vRow.index % 2 === 0;
            const bgClass = isSelected
              ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/50'
              : isEven
              ? 'bg-slate-950 hover:bg-slate-800/50'
              : 'bg-slate-900/60 hover:bg-slate-800/50';

            const pinnedBg = isSelected
              ? 'bg-indigo-950/60'
              : isEven
              ? 'bg-slate-950'
              : 'bg-slate-900';

            return (
              <div
                key={row.original.symbol}
                role="row"
                aria-selected={isSelected}
                aria-rowindex={vRow.index + 1}
                tabIndex={0}
                onClick={() => setSelectedSymbol(row.original.symbol)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedSymbol(row.original.symbol);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${vRow.start}px)`,
                  height: '36px',
                }}
                className={`flex items-center border-b border-slate-800/40 cursor-pointer transition-colors duration-150 ${bgClass}`}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const isPinned0 = idx === 0;
                  const isPinned1 = idx === 1;

                  return (
                    <div
                      key={cell.id}
                      role="gridcell"
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        height: '36px',
                        ...(isPinned0 ? { position: 'sticky', left: 0, zIndex: 10 } : {}),
                        ...(isPinned1 ? { position: 'sticky', left: 36, zIndex: 10 } : {}),
                      }}
                      className={`flex items-center px-2 border-r border-slate-800/30 text-xs ${
                        isPinned0 || isPinned1 ? `${pinnedBg} shadow-sm` : ''
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
