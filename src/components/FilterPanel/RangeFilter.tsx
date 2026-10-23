'use client';

import React, { useState, useEffect, useRef } from 'react';

interface RangeFilterProps {
  label: string;
  field: string;
  value?: { min?: number | null; max?: number | null } | null;
  onChange: (value: { min?: number | null; max?: number | null } | null) => void;
  unit?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  step?: number;
}

export const RangeFilter: React.FC<RangeFilterProps> = ({
  label,
  value,
  onChange,
  unit,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  step = 1,
}) => {
  const [minInput, setMinInput] = useState<string>(
    value?.min !== undefined && value?.min !== null ? String(value.min) : ''
  );
  const [maxInput, setMaxInput] = useState<string>(
    value?.max !== undefined && value?.max !== null ? String(value.max) : ''
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external state changes (e.g., presets or clear all)
  useEffect(() => {
    setMinInput(value?.min !== undefined && value?.min !== null ? String(value.min) : '');
    setMaxInput(value?.max !== undefined && value?.max !== null ? String(value.max) : '');
  }, [value?.min, value?.max]);

  const triggerChange = (nextMin: string, nextMax: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const minNum = nextMin.trim() !== '' ? Number(nextMin) : null;
      const maxNum = nextMax.trim() !== '' ? Number(nextMax) : null;

      if ((minNum === null || isNaN(minNum)) && (maxNum === null || isNaN(maxNum))) {
        onChange(null);
      } else {
        onChange({ min: minNum, max: maxNum });
      }
    }, 250); // 250ms debounce
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span className="font-medium">{label}</span>
        {unit && <span className="text-[10px] text-slate-500 font-mono">{unit}</span>}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="relative">
          <input
            type="number"
            step={step}
            placeholder={minPlaceholder}
            value={minInput}
            onChange={(e) => {
              const val = e.target.value;
              setMinInput(val);
              triggerChange(val, maxInput);
            }}
            className="w-full px-2 py-1 bg-surface-elevated border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
          />
        </div>

        <div className="relative">
          <input
            type="number"
            step={step}
            placeholder={maxPlaceholder}
            value={maxInput}
            onChange={(e) => {
              const val = e.target.value;
              setMaxInput(val);
              triggerChange(minInput, val);
            }}
            className="w-full px-2 py-1 bg-surface-elevated border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
