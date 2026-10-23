'use client';

import React from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { X, Filter } from 'lucide-react';

export const ActiveFiltersBar: React.FC = () => {
  const activeFilters = useStockStore((s) => s.activeFilters);
  const removeFilter = useStockStore((s) => s.removeFilter);
  const clearFilters = useStockStore((s) => s.clearFilters);

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs overflow-x-auto custom-scrollbar">
      <div className="flex items-center space-x-1 text-slate-400 font-medium shrink-0">
        <Filter className="w-3.5 h-3.5 text-indigo-400" />
        <span>Active Filters ({activeFilters.length}):</span>
      </div>

      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
        {activeFilters.map((f) => {
          let label = `${String(f.field)} ${f.operator} ${
            Array.isArray(f.value) ? f.value.join(', ') : f.value
          }`;
          if (f.id === 'watchlist-only') label = 'Watchlist Only';

          return (
            <span
              key={f.id}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-950/70 border border-indigo-700/60 text-indigo-200"
            >
              <span>{label}</span>
              <button
                onClick={() => removeFilter(f.id)}
                className="hover:text-rose-400 transition-colors p-0.5"
                title={`Remove ${label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <button
          onClick={clearFilters}
          className="text-[11px] text-slate-400 hover:text-rose-400 underline ml-2 transition-colors shrink-0"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};
