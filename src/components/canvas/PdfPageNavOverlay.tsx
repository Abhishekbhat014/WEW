import React from 'react';
import { ChevronLeft, ChevronRight, FileText, Lock, Unlock } from 'lucide-react';

interface PdfPageNavOverlayProps {
  currentPage: number;
  numPages: number;
  isLocked: boolean;
  onPageChange: (newPage: number) => void;
  onToggleLock: () => void;
}

export const PdfPageNavOverlay: React.FC<PdfPageNavOverlayProps> = ({
  currentPage,
  numPages,
  isLocked,
  onPageChange,
  onToggleLock,
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-3 rounded-2xl bg-surface/95 p-2 px-4 shadow-2xl backdrop-blur-md border border-border text-xs font-semibold text-text-primary select-none animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center gap-1.5 text-accent font-bold border-r border-border pr-3">
        <FileText className="w-4 h-4" />
        <span>PDF Document</span>
      </div>

      {/* Lock Position & Size Toggle Button */}
      <button
        onClick={onToggleLock}
        title={isLocked ? "Unlock PDF Position & Size" : "Lock PDF Position & Size"}
        className={`flex h-7 items-center gap-1.5 px-2.5 rounded-lg border transition-all ${
          isLocked
            ? 'bg-warning/10 border-warning/30 text-warning font-bold shadow-sm'
            : 'border-border text-text-primary hover:bg-surface-hover'
        }`}
      >
        {isLocked ? <Lock className="w-3.5 h-3.5 text-warning" /> : <Unlock className="w-3.5 h-3.5" />}
        <span>{isLocked ? 'Locked' : 'Lock'}</span>
      </button>

      <div className="h-4 w-px bg-border" />

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
            currentPage > 1
              ? 'border-border text-foreground hover:bg-surface-hover hover:border-border-strong'
              : 'border-border text-icon-muted cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs font-bold text-foreground px-1">
          Page {currentPage} of {numPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
            currentPage < numPages
              ? 'border-border text-foreground hover:bg-surface-hover hover:border-border-strong'
              : 'border-border text-icon-muted cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <span className="text-[10px] font-mono font-bold text-text-muted border-l border-border pl-3">
        Use ← / → keys
      </span>
    </div>
  );
};
