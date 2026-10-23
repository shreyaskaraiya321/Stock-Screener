import React from 'react';
import { formatINR } from '@/lib/formatters';

interface PriceCellProps {
  price: number;
  flash?: 'up' | 'down' | null;
}

export const PriceCell = React.memo<PriceCellProps>(
  ({ price, flash }) => {
    const flashClass =
      flash === 'up'
        ? 'animate-flash-up bg-emerald-500/20 text-emerald-400 font-semibold'
        : flash === 'down'
        ? 'animate-flash-down bg-rose-500/20 text-rose-400 font-semibold'
        : 'text-slate-100';

    return (
      <div
        className={`px-2 py-0.5 rounded text-right font-mono text-xs tabular-nums transition-colors duration-300 ${flashClass}`}
      >
        {formatINR(price)}
      </div>
    );
  },
  (prev, next) => prev.price === next.price && prev.flash === next.flash
);

PriceCell.displayName = 'PriceCell';
