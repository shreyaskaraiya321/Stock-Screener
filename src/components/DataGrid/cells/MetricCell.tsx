import React from 'react';

interface MetricCellProps {
  value: string | number;
  highlight?: 'positive' | 'negative' | 'warning' | 'neutral';
  align?: 'left' | 'center' | 'right';
  subText?: string;
}

export const MetricCell: React.FC<MetricCellProps> = React.memo(
  ({ value, highlight = 'neutral', align = 'right', subText }) => {
    let colorClass = 'text-slate-200';
    if (highlight === 'positive') colorClass = 'text-emerald-400';
    else if (highlight === 'negative') colorClass = 'text-rose-400';
    else if (highlight === 'warning') colorClass = 'text-amber-400';

    const alignClass =
      align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

    return (
      <div className={`text-xs font-mono tabular-nums ${alignClass} ${colorClass}`}>
        <span>{value}</span>
        {subText && <span className="text-[10px] text-slate-500 block">{subText}</span>}
      </div>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.highlight === next.highlight &&
    prev.align === next.align &&
    prev.subText === next.subText
);

MetricCell.displayName = 'MetricCell';
