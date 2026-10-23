import React from 'react';
import { formatINR } from '@/lib/formatters';

interface PriceCellProps {
  price: number;
  flash?: 'up' | 'down' | null;
}

export const PriceCell: React.FC<PriceCellProps> = React.memo(
  ({ price, flash }) => {
    const flashClass =
      flash === 'up'
        ? 'animate-flash-up bg-emerald-500/20 text-emerald-400 font-semibold'
        : flash === 'down'
        ? 'animate-flash-down bg-rose-500/20 text-rose-400 font-semibold'
        : 'text-slate-100';

    return (
      <div
        className={`px-2 py-1 rounded text-right font-mono text-xs tabular-nums transition-colors duration-300 ${flashClass}`}
      >
        {formatINR(price)}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.price === nextProps.price && prevProps.flash === nextProps.flash
);

PriceCell.displayName = 'PriceCell';
