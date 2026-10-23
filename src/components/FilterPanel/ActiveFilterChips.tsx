'use client';

import React from 'react';
import { useStockStore } from '@/stores/useStockStore';
import { X, Filter } from 'lucide-react';

export const ActiveFilterChips: React.FC = () => {
  const activeFilters = useStockStore((s) => s.activeFilters);
  const removeFilter = useStockStore((s) => s.removeFilter);
  const clearAllFilters = useStockStore((s) => s.clearAllFilters);

  const entries = Object.entries(activeFilters);
  if (entries.length === 0) return null;

  const formatFilterChip = (field: string, val: any): string => {
    if (field === 'watchlistOnly') return 'Watchlist Only';
    if (field === 'priceVsSma50') return `Price > SMA 50 (${val})`;
    if (field === 'priceVsSma200') return `Price > SMA 200 (${val})`;

    if (Array.isArray(val)) {
      return `${field}: [${val.join(', ')}]`;
    }

    if (typeof val === 'object' && val !== null) {
      const parts: string[] = [];
      if (val.min !== null && val.min !== undefined) parts.push(`≥ ${val.min}`);
      if (val.max !== null && val.max !== undefined) parts.push(`≤ ${val.max}`);
      return `${field}: ${parts.join(' & ')}`;
    }

    return `${field}: ${val}`;
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-slate-900/95 border-b border-slate-800 text-xs overflow-x-auto custom-scrollbar shrink-0">
      <div className="flex items-center space-x-1.5 text-slate-400 font-medium shrink-0">
        <Filter className="w-3.5 h-3.5 text-indigo-400" />
        <span>Active Filters ({entries.length}):</span>
      </div>

      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
        {entries.map(([field, val]) => (
          <span
            key={field}
            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] bg-indigo-950/70 border border-indigo-700/60 text-indigo-200"
          >
            <span>{formatFilterChip(field, val)}</span>
            <button
              onClick={() => removeFilter(field)}
              className="hover:text-rose-400 transition-colors p-0.5 ml-0.5"
              title={`Remove ${field} filter`}
              aria-label={`Remove ${field} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <button
          onClick={clearAllFilters}
          className="text-[11px] text-slate-400 hover:text-rose-400 underline ml-2 transition-colors shrink-0"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};
