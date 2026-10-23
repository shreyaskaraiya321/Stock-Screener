import React from 'react';
import { formatPercent, formatINR } from '@/lib/formatters';

interface ChangeCellProps {
  changePercent: number;
  changeAbsolute: number;
}

export const ChangeCell: React.FC<ChangeCellProps> = React.memo(
  ({ changePercent, changeAbsolute }) => {
    const isPositive = changePercent > 0;
    const isZero = changePercent === 0;

    const textColor = isZero
      ? 'text-slate-400'
      : isPositive
      ? 'text-emerald-400'
      : 'text-rose-400';

    const arrow = isZero ? '' : isPositive ? '▲ ' : '▼ ';

    return (
      <div className={`flex flex-col items-end text-xs font-mono tabular-nums leading-tight ${textColor}`}>
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
    prev.changeAbsolute === next.changeAbsolute
);

ChangeCell.displayName = 'ChangeCell';
