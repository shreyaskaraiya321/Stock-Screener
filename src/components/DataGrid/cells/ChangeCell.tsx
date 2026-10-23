import React from 'react';
import { formatPercent, formatINR } from '@/lib/formatters';

interface ChangeCellProps {
  changePercent: number;
  changeAbsolute: number;
  flash?: 'up' | 'down' | null;
}

export const ChangeCell: React.FC<ChangeCellProps> = React.memo(
  ({ changePercent, changeAbsolute, flash }) => {
    const isPositive = changePercent > 0;
    const isZero = changePercent === 0;

    const textColor = isZero
      ? 'text-slate-400'
      : isPositive
      ? 'text-emerald-400'
      : 'text-rose-400';

    const flashClass =
      flash === 'up'
        ? 'animate-flash-up bg-emerald-500/10'
        : flash === 'down'
        ? 'animate-flash-down bg-rose-500/10'
        : '';

    const arrow = isZero ? '' : isPositive ? '▲ ' : '▼ ';

    return (
      <div
        className={`flex flex-col items-end px-1.5 py-0.5 rounded text-xs font-mono tabular-nums leading-tight transition-colors duration-300 ${textColor} ${flashClass}`}
      >
        <span className="font-medium">
          {arrow}
          {formatPercent(changePercent)}
        </span>
        <span className="text-[10px] opacity-75">
          ({formatINR(changeAbsolute)})
        </span>
      </div>
    );
  },
  (prev, next) =>
    prev.changePercent === next.changePercent &&
    prev.changeAbsolute === next.changeAbsolute &&
    prev.flash === next.flash
);

ChangeCell.displayName = 'ChangeCell';
