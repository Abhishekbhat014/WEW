import React, { useEffect, useState } from 'react';
import { useCanvasContext } from '../../store/CanvasContext';
import { Crosshair, Hand } from 'lucide-react';

export const StatusBar: React.FC = React.memo(() => {
  const { cursorPos: initialCursorPos, panX: initialPanX, panY: initialPanY } = useCanvasContext();
  const [cursorPos, setCursorPos] = useState(initialCursorPos);
  const [panPos, setPanPos] = useState({ x: initialPanX, y: initialPanY });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const handleCursorPos = (e: CustomEvent<{ x: number; y: number }>) => {
      if (e.detail) {
        setCursorPos(e.detail);
      }
    };

    const handlePanPos = (e: CustomEvent<{ x: number; y: number }>) => {
      if (e.detail) {
        setPanPos(e.detail);
      }
    };

    const handlePanningState = (e: CustomEvent<{ isPanning: boolean }>) => {
      if (e.detail) {
        setIsPanning(e.detail.isPanning);
      }
    };

    window.addEventListener('app:cursor-pos', handleCursorPos as EventListener);
    window.addEventListener('app:pan-changed', handlePanPos as EventListener);
    window.addEventListener('app:panning-state', handlePanningState as EventListener);

    return () => {
      window.removeEventListener('app:cursor-pos', handleCursorPos as EventListener);
      window.removeEventListener('app:pan-changed', handlePanPos as EventListener);
      window.removeEventListener('app:panning-state', handlePanningState as EventListener);
    };
  }, []);

  const hasPanOffset = Math.abs(panPos.x) > 0 || Math.abs(panPos.y) > 0;

  return (
    <div className="absolute bottom-4 right-4 z-30 pointer-events-none select-none hidden sm:flex items-center gap-2">
      {/* Active Panning / Offset Glance Pill */}
      {(isPanning || hasPanOffset) && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-lg backdrop-blur-md transition-all duration-200 ${
            isPanning
              ? 'bg-surface-active text-foreground border-border-strong ring-1 ring-border-strong animate-pulse'
              : 'bg-surface/95 text-text-primary border-border'
          }`}
        >
          <Hand className={`w-3.5 h-3.5 ${isPanning ? 'text-accent' : 'text-icon'}`} />
          <span className="text-[10px] uppercase font-bold text-text-muted">Pan</span>
          <span className="tabular-nums text-foreground">
            {Math.round(panPos.x)}px, {Math.round(panPos.y)}px
          </span>
        </div>
      )}

      {/* Cursor Coordinates Pill */}
      <div className="flex items-center gap-3 px-3.5 py-2 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-lg text-xs font-mono font-medium text-text-primary transition-all duration-200">
        <Crosshair className="w-3.5 h-3.5 text-icon" />
        <div className="flex items-center gap-1.5 min-w-12.5 justify-start">
          <span className="text-text-muted uppercase text-[10px] font-bold">X</span>
          <span className="tabular-nums text-foreground">{Math.round(cursorPos.x)}</span>
        </div>
        <div className="w-px h-3.5 bg-border"></div>
        <div className="flex items-center gap-1.5 min-w-12.5 justify-start">
          <span className="text-text-muted uppercase text-[10px] font-bold">Y</span>
          <span className="tabular-nums text-foreground">{Math.round(cursorPos.y)}</span>
        </div>
      </div>
    </div>
  );
});
