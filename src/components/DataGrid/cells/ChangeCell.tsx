import React from 'react';
import { formatPercent, formatINR } from '@/lib/formatters';

interface ChangeCellProps {
  changePercent?: number;
  changeAbsolute?: number;
  percent?: number;
  absolute?: number;
  flash?: 'up' | 'down' | null;
}

export const ChangeCell = React.memo<ChangeCellProps>(
  ({ changePercent, changeAbsolute, percent, absolute, flash }) => {
    const p = percent ?? changePercent ?? 0;
    const a = absolute ?? changeAbsolute ?? 0;
    const isPos = p > 0;
    const isZero = p === 0;

    const textColor = isZero ? 'text-slate-400' : isPos ? 'text-emerald-400' : 'text-rose-400';
    const flashClass =
      flash === 'up'
        ? 'animate-flash-up bg-emerald-500/10'
        : flash === 'down'
        ? 'animate-flash-down bg-rose-500/10'
        : '';

    return (
      <div
        className={`flex flex-col items-end px-1.5 py-0.5 rounded text-xs font-mono tabular-nums leading-tight transition-colors duration-300 ${textColor} ${flashClass}`}
      >
        <span className="font-medium">
          {isZero ? '' : isPos ? '▲ ' : '▼ '}
          {formatPercent(p)}
        </span>
        <span className="text-[10px] opacity-75">({formatINR(a)})</span>
      </div>
    );
  },
  (prev, next) => {
    const pPrev = prev.percent ?? prev.changePercent ?? 0;
    const pNext = next.percent ?? next.changePercent ?? 0;
    const aPrev = prev.absolute ?? prev.changeAbsolute ?? 0;
    const aNext = next.absolute ?? next.changeAbsolute ?? 0;
    return pPrev === pNext && aPrev === aNext && prev.flash === next.flash;
  }
);

ChangeCell.displayName = 'ChangeCell';
