import React from 'react';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
} from 'lucide-react';
import type { ObjectProperties } from '../../../types/canvas';
import { HighlightText } from '../../ui/inspector/HighlightText';
import { Tooltip } from '../../ui/Tooltip';

interface QuickActionsSectionProps {
  selectedObject: ObjectProperties | null;
  selectedCount: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onResetRotation?: () => void;
  onToggleLock?: () => void;
  onToggleHide?: () => void;
  searchQuery?: string;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  selectedObject,
  selectedCount,
  onDuplicate,
  onDelete,
  onFlipHorizontal,
  onFlipVertical,
  onResetRotation,
  onToggleLock,
  onToggleHide,
  searchQuery = '',
}) => {
  if (selectedCount === 0 && !selectedObject) return null;

  const isLocked = selectedObject?.locked || false;

  return (
    <div className="flex flex-col gap-1.5 pb-3 mb-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-icon-muted uppercase tracking-widest">
          Object Actions
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <Tooltip label="Duplicate" shortcut="Ctrl+D" side="top">
          <button
            onClick={onDuplicate}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-1.5 hover:bg-surface-hover hover:border-border-strong hover:text-text-primary transition-all text-text-primary shadow-2xs cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[10px] font-normal">
              <HighlightText text="Duplicate" query={searchQuery} />
            </span>
          </button>
        </Tooltip>

        {onFlipHorizontal && (
          <Tooltip label="Flip Horizontal" side="top">
            <button
              onClick={onFlipHorizontal}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-1.5 hover:bg-surface-hover hover:border-border-strong hover:text-text-primary transition-all text-text-primary shadow-2xs cursor-pointer"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-normal">
                <HighlightText text="Flip H" query={searchQuery} />
              </span>
            </button>
          </Tooltip>
        )}

        {onFlipVertical && (
          <Tooltip label="Flip Vertical" side="top">
            <button
              onClick={onFlipVertical}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-1.5 hover:bg-surface-hover hover:border-border-strong hover:text-text-primary transition-all text-text-primary shadow-2xs cursor-pointer"
            >
              <FlipVertical className="w-3.5 h-3.5" />
              <span className="text-[10px] font-normal">
                <HighlightText text="Flip V" query={searchQuery} />
              </span>
            </button>
          </Tooltip>
        )}

        {onResetRotation && (
          <Tooltip label="Reset Rotation (0°)" side="top">
            <button
              onClick={onResetRotation}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-1.5 hover:bg-surface-hover hover:border-border-strong hover:text-text-primary transition-all text-text-primary shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-normal">
                <HighlightText text="Reset 0°" query={searchQuery} />
              </span>
            </button>
          </Tooltip>
        )}

        {onToggleLock && (
          <Tooltip label={isLocked ? 'Unlock Object' : 'Lock Object'} side="top">
            <button
              onClick={onToggleLock}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-1.5 transition-all shadow-2xs cursor-pointer ${
                isLocked
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 font-medium'
                  : 'border-border bg-surface text-text-primary hover:border-border-strong hover:bg-surface-hover'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-normal">
                <HighlightText text={isLocked ? 'Unlock' : 'Lock'} query={searchQuery} />
              </span>
            </button>
          </Tooltip>
        )}

        {onToggleHide && (
          <Tooltip label="Hide Object" side="top">
            <button
              onClick={onToggleHide}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface py-1.5 hover:border-border-strong hover:bg-surface-hover transition-all text-text-primary shadow-2xs cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="text-[10px] font-normal">
                <HighlightText text="Hide" query={searchQuery} />
              </span>
            </button>
          </Tooltip>
        )}

        <Tooltip label="Delete" shortcut="Delete" side="top">
          <button
            onClick={onDelete}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 py-1.5 hover:bg-danger/20 transition-all text-danger font-medium shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-xs">
              <HighlightText text="Delete" query={searchQuery} />
            </span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
