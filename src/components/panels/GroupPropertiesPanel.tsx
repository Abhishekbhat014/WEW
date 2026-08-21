import React from 'react';
import { Layers, Copy, Ungroup, Trash2, EyeOff, Lock, BringToFront, SendToBack, ArrowUp, ArrowDown } from 'lucide-react';
import { useCanvasContext } from '../../store/CanvasContext';

export interface GroupPropertiesPanelProps {
  onUngroupSelected: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export const GroupPropertiesPanel: React.FC<GroupPropertiesPanelProps> = ({
  onUngroupSelected,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleHide,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  const { selectedCount, selectedObject, activeTool, isRightClickErasing } = useCanvasContext();

  const isGroupSelected = selectedCount === 1 && selectedObject?.type === 'group';

  if (isRightClickErasing || activeTool === 'laser' || !isGroupSelected) {
    return null;
  }

  const groupChildrenCount = (selectedObject as any)?._objects?.length || 0;
  const isLocked = !!(selectedObject as any)?.locked;
  const isHidden = !!(selectedObject as any)?.isHiddenGhost;

  return (
    <aside
      data-canvas-ui="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed right-4 top-16 z-30 pointer-events-auto flex w-72 flex-col rounded-xl bg-surface/97 px-3.5 pt-3.5 pb-3 shadow-2xl backdrop-blur-md border border-border text-xs text-text-primary select-none animate-in fade-in slide-in-from-right-3 duration-200"
    >
      <div className="flex items-center justify-between pb-2 mb-3">
        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-accent" />
          <span>Group Properties</span>
        </span>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)] hide-scrollbar">
        {/* Info Section */}
        <div className="flex flex-col gap-2 bg-surface-elevated border border-border rounded-lg p-2.5">
          <div className="flex justify-between items-center">
            <span className="font-medium text-text-primary">Objects in Group</span>
            <span className="px-2 py-0.5 bg-surface-active text-foreground rounded-full font-bold">{groupChildrenCount}</span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
             <button
                onClick={onToggleLock}
                className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded-md transition-colors ${
                  isLocked ? 'bg-accent/10 text-accent' : 'bg-surface hover:bg-surface-hover text-foreground'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {isLocked ? 'Unlock' : 'Lock'}
              </button>
              <div className="w-2" />
              <button
                onClick={onToggleHide}
                className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded-md transition-colors ${
                  isHidden ? 'bg-accent/10 text-accent' : 'bg-surface hover:bg-surface-hover text-foreground'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                {isHidden ? 'Show' : 'Hide'}
              </button>
          </div>
        </div>

        {/* Transform - Read Only for now to show context, but could be inputs later */}
        <div className="flex flex-col gap-2 border border-border rounded-lg p-2.5">
           <span className="font-medium text-foreground mb-1">Transform</span>
           <div className="grid grid-cols-2 gap-2 text-text-muted">
             <div className="flex items-center gap-1.5 bg-surface-active px-2 py-1 rounded">
               <span className="font-medium w-3 text-icon-muted">X</span>
               <span>{Math.round(selectedObject?.left || 0)}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-surface-active px-2 py-1 rounded">
               <span className="font-medium w-3 text-icon-muted">Y</span>
               <span>{Math.round(selectedObject?.top || 0)}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-surface-active px-2 py-1 rounded">
               <span className="font-medium w-3 text-icon-muted">W</span>
               <span>{Math.round((selectedObject?.width || 0) * (selectedObject?.scaleX || 1))}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-surface-active px-2 py-1 rounded">
               <span className="font-medium w-3 text-icon-muted">H</span>
               <span>{Math.round((selectedObject?.height || 0) * (selectedObject?.scaleY || 1))}</span>
             </div>
           </div>
        </div>

        {/* Arrange */}
        <div className="flex flex-col gap-2 border border-border rounded-lg p-2.5">
          <span className="font-medium text-foreground mb-1">Arrange</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onBringForward} className="flex items-center justify-center gap-1.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors" title="Bring Forward">
               <ArrowUp className="w-3.5 h-3.5 text-icon-muted" />
               <Layers className="w-3.5 h-3.5 text-icon-muted" />
            </button>
            <button onClick={onSendBackward} className="flex items-center justify-center gap-1.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors" title="Send Backward">
               <ArrowDown className="w-3.5 h-3.5 text-icon-muted" />
               <Layers className="w-3.5 h-3.5 text-icon-muted" />
            </button>
            <button onClick={onBringToFront} className="flex items-center justify-center gap-1.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors" title="Bring to Front">
               <BringToFront className="w-3.5 h-3.5 text-icon-muted" />
            </button>
            <button onClick={onSendToBack} className="flex items-center justify-center gap-1.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors" title="Send to Back">
               <SendToBack className="w-3.5 h-3.5 text-icon-muted" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border border-border rounded-lg p-2.5 bg-accent/5">
          <span className="font-medium text-foreground mb-1">Actions</span>
          <button
            onClick={onUngroupSelected}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-accent/10 border border-accent/30 text-accent rounded-md font-medium transition-colors w-full justify-center shadow-sm"
          >
            <Ungroup className="w-3.5 h-3.5" />
            <span>Ungroup</span>
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-md font-medium transition-colors w-full justify-center shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Group</span>
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-danger/10 border border-danger/30 text-danger rounded-md font-medium transition-colors w-full justify-center shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Group</span>
          </button>
        </div>

      </div>
    </aside>
  );
};
