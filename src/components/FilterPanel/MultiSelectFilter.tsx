'use client';

import React, { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues?: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selectedValues = [],
  onChange,
  searchable = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span className="font-medium">{label}</span>
        {selectedValues.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[10px] text-indigo-400 hover:text-indigo-300"
          >
            Clear ({selectedValues.length})
          </button>
        )}
      </div>

      {searchable && options.length > 6 && (
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-2 py-1 text-[11px] bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {filteredOptions.map((opt) => {
          const isSelected = selectedValues.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] text-left transition-colors ${
                isSelected
                  ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-700/60'
                  : 'bg-surface-elevated/60 text-slate-400 hover:text-slate-200 hover:bg-surface-elevated border border-transparent'
              }`}
            >
              <span className="truncate">{opt}</span>
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
