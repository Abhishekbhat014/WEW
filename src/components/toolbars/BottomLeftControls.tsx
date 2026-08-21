import React from 'react';
import { useCanvasContext } from '../../store/CanvasContext';
import { Undo2, Redo2, Minus, Plus } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface BottomLeftControlsProps {
  onUndo: () => void;
  onRedo: () => void;
}

export const BottomLeftControls: React.FC<BottomLeftControlsProps> = React.memo(({ onUndo, onRedo }) => {
  const {
    zoom,
    setZoom,
    canUndo,
    canRedo,
  } = useCanvasContext();

  return (
    <div
      data-canvas-ui="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute bottom-4 left-4 z-30 pointer-events-auto flex items-center gap-2 select-none"
    >
      {/* Zoom Controls Pill */}
      <div className="hidden sm:flex items-center gap-1 rounded-xl bg-surface/95 p-1 px-2 shadow-lg backdrop-blur-md border border-border text-xs font-semibold text-text-primary">
        <Tooltip label="Zoom Out" shortcut="Ctrl+-" side="top">
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-icon hover:bg-surface-hover transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <button
          onClick={() => setZoom(1)}
          className="px-2 text-xs font-bold text-text-primary hover:text-accent transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>

        <Tooltip label="Zoom In" shortcut="Ctrl++" side="top">
          <button
            onClick={() => setZoom((z) => Math.min(10, z + 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-icon hover:bg-surface-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Undo / Redo Pill */}
      <div className="flex items-center gap-1 rounded-xl bg-surface/95 p-1 px-1.5 shadow-lg backdrop-blur-md border border-border">
        <Tooltip label="Undo" shortcut="Ctrl+Z" side="top">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              canUndo ? 'text-text-primary hover:bg-surface-hover active:scale-95' : 'text-text-disabled cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <Tooltip label="Redo" shortcut="Ctrl+Y" side="top">
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              canRedo ? 'text-text-primary hover:bg-surface-hover active:scale-95' : 'text-text-disabled cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
});
