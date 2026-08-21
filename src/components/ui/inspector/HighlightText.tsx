import React from 'react';

interface HighlightTextProps {
  text: string;
  query?: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query = '', className = '' }) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return <span className={className}>{text}</span>;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === trimmed.toLowerCase()) {
          return (
            <mark
              key={index}
              className="bg-amber-500/25 text-amber-500 dark:text-amber-300 rounded-xs px-0.5 font-semibold underline decoration-amber-500"
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
