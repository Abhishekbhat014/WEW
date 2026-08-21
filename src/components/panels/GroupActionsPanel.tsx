import React, { useState, useRef, useCallback } from 'react';
import { Layers, GripVertical, Group } from 'lucide-react';
import { useCanvasContext } from '../../store/CanvasContext';

export interface GroupActionsPanelProps {
  onGroupSelected: () => void;
}

export const GroupActionsPanel: React.FC<GroupActionsPanelProps> = React.memo(({
  onGroupSelected,
}) => {
  const { selectedCount, selectedObject, activeTool, isRightClickErasing } = useCanvasContext();
  const [pos, setPos] = useState({ x: window.innerWidth - 310, y: 80 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: window.innerWidth - 310,
    initialY: 80,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 220, dragStartRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.initialY + dy));
      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [pos.x, pos.y]);

  const isGroupSelected = selectedCount === 1 && selectedObject?.type === 'group';
  
  if (isRightClickErasing || activeTool === 'laser' || selectedCount <= 1 || isGroupSelected) {
    return null;
  }

  return (
    <aside
      data-canvas-ui="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-30 pointer-events-auto flex w-72 flex-col rounded-xl bg-surface/97 px-3.5 pt-3.5 pb-3 shadow-xl backdrop-blur-md border border-border text-xs text-text-primary select-none animate-in fade-in slide-in-from-right-3 duration-200"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between pb-2 mb-3 cursor-grab group"
      >
        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-icon-muted group-hover:text-accent transition-colors" />
          <Layers className="w-4 h-4 text-accent" />
          <span>Group Actions</span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between bg-surface-hover border border-border rounded-lg p-2.5">
          <span className="font-medium text-text-primary">
            {`${selectedCount} Objects Selected`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onGroupSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md font-medium transition-colors shadow-sm"
              title="Group (Ctrl+G)"
            >
              <Group className="w-3.5 h-3.5" />
              <span>Group</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});
