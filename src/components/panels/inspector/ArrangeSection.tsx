import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import { HighlightText } from '../../ui/inspector/HighlightText';
import { Tooltip } from '../../ui/Tooltip';

interface ArrangeSectionProps {
  selectedCount: number;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (direction: 'horizontal' | 'vertical') => void;
  searchQuery?: string;
}

export const ArrangeSection: React.FC<ArrangeSectionProps> = ({
  selectedCount,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onAlign,
  onDistribute,
  searchQuery = '',
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Alignment Tools (Multi-selection only) */}
      {selectedCount > 1 && onAlign && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-primary">
            <HighlightText text="Align Objects" query={searchQuery} />
          </span>
          <div className="grid grid-cols-6 gap-1 rounded-lg bg-surface-hover p-1 border border-border/40">
            <Tooltip label="Align Left" side="top">
              <button
                onClick={() => onAlign('left')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="2" y="2" width="2" height="12" rx="0.5" />
                  <rect x="6" y="3" width="8" height="3" rx="0.5" />
                  <rect x="6" y="10" width="5" height="3" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Align Center Horizontal" side="top">
              <button
                onClick={() => onAlign('center')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="7" y="1" width="2" height="14" rx="0.5" />
                  <rect x="3" y="3" width="10" height="3" rx="0.5" />
                  <rect x="4.5" y="10" width="7" height="3" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Align Right" side="top">
              <button
                onClick={() => onAlign('right')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="12" y="2" width="2" height="12" rx="0.5" />
                  <rect x="2" y="3" width="8" height="3" rx="0.5" />
                  <rect x="5" y="10" width="5" height="3" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Align Top" side="top">
              <button
                onClick={() => onAlign('top')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="2" y="2" width="12" height="2" rx="0.5" />
                  <rect x="3" y="6" width="3" height="8" rx="0.5" />
                  <rect x="10" y="6" width="3" height="5" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Align Middle Vertical" side="top">
              <button
                onClick={() => onAlign('middle')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="1" y="7" width="14" height="2" rx="0.5" />
                  <rect x="3" y="3" width="3" height="10" rx="0.5" />
                  <rect x="10" y="4.5" width="3" height="7" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Align Bottom" side="top">
              <button
                onClick={() => onAlign('bottom')}
                className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <rect x="2" y="12" width="12" height="2" rx="0.5" />
                  <rect x="3" y="2" width="3" height="8" rx="0.5" />
                  <rect x="10" y="5" width="3" height="5" rx="0.5" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Distribution Tools (3+ objects selected) */}
      {selectedCount > 2 && onDistribute && (
        <div className="flex flex-col gap-1.5 pt-2.5">
          <span className="text-xs font-medium text-text-primary">
            <HighlightText text="Distribute" query={searchQuery} />
          </span>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-surface-hover p-1 border border-border/40">
            <button
              onClick={() => onDistribute('horizontal')}
              className="py-1.5 text-xs font-medium text-text-primary rounded-lg hover:bg-surface transition-colors text-center cursor-pointer"
            >
              Horizontal
            </button>
            <button
              onClick={() => onDistribute('vertical')}
              className="py-1.5 text-xs font-medium text-text-primary rounded-lg hover:bg-surface transition-colors text-center cursor-pointer"
            >
              Vertical
            </button>
          </div>
        </div>
      )}

      {/* Layer Order Controls */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-primary">
          <HighlightText text="Layer Order" query={searchQuery} />
        </span>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-surface-hover p-1 border border-border/40">
          <Tooltip label="Bring to Front" side="top">
            <button
              onClick={onBringToFront}
              className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
            >
              <ChevronsUp className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Bring Forward" side="top">
            <button
              onClick={onBringForward}
              className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Send Backward" side="top">
            <button
              onClick={onSendBackward}
              className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Send to Back" side="top">
            <button
              onClick={onSendToBack}
              className="flex h-8 items-center justify-center rounded-lg hover:bg-surface hover:text-text-primary transition-colors text-icon cursor-pointer"
            >
              <ChevronsDown className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
