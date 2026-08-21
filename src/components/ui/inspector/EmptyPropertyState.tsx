import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyPropertyStateProps {
  searchQuery: string;
  onClearSearch: () => void;
}

export const EmptyPropertyState: React.FC<EmptyPropertyStateProps> = ({
  searchQuery,
  onClearSearch,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30 text-accent shadow-2xs mb-3">
        <SearchX className="h-5.5 w-5.5" />
      </div>
      <h4 className="text-xs font-semibold text-text-primary tracking-tight">
        No properties found
      </h4>
      <p className="mt-1 text-[11px] text-text-muted max-w-50 leading-relaxed">
        No shape property matches <span className="font-semibold text-text-primary">"{searchQuery}"</span>
      </p>
      <button
        onClick={onClearSearch}
        className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-active border border-border transition-all active:scale-95 cursor-pointer shadow-2xs"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Clear Search</span>
      </button>
    </div>
  );
};
