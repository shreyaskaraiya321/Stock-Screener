import React from 'react';

interface TextCellProps {
  text: string;
  badge?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const TextCell: React.FC<TextCellProps> = React.memo(
  ({ text, badge, align = 'left', className = '' }) => {
    const alignClass =
      align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

    return (
      <div className={`flex items-center space-x-1.5 text-xs truncate ${alignClass} ${className}`}>
        <span className="truncate text-slate-200">{text}</span>
        {badge && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-surface-elevated text-slate-400 font-normal shrink-0">
            {badge}
          </span>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.text === next.text &&
    prev.badge === next.badge &&
    prev.align === next.align &&
    prev.className === next.className
);

TextCell.displayName = 'TextCell';
