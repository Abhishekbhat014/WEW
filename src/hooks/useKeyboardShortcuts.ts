import { useEffect } from 'react';
import { useCanvasContext } from '../store/CanvasContext';
import type { ToolType } from '../types/canvas';

interface UseKeyboardShortcutsProps {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCloneShapeWithArrow?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onNudgeSelection?: (dx: number, dy: number) => void;
  onClearSelection?: () => void;
  onSelectAll: () => void;
  onSaveJson: () => void;
  onExport: () => void;
  onCloseAllMenus?: () => void;
  onImageImport?: () => void;
  onUpdateProperties?: (props: Record<string, any>) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onToggleFullscreen?: () => void;
  onRefreshPage?: () => void;
}

export const useKeyboardShortcuts = ({
  onCopy,
  onCut,
  onPaste,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onCloneShapeWithArrow,
  onNudgeSelection,
  onClearSelection,
  onSelectAll,
  onSaveJson,
  onExport,
  onCloseAllMenus,
  onImageImport,
  onUpdateProperties,
  onGroupSelected,
  onUngroupSelected,
  onToggleFullscreen,
  onRefreshPage,
}: UseKeyboardShortcutsProps) => {
  const {
    setActiveTool,
    isDrawToShapeMode,
    setIsDrawToShapeMode,
    toggleToolLock,
    grid,
    setGridConfig,
    setZoom,
    activeTool,
    selectedObject,
    fontWeight,
    setFontWeight,
    fontStyle,
    setFontStyle,
    underline,
    setUnderline,
    linethrough,
    setLinethrough,
    isZenMode,
    setIsZenMode,
  } = useCanvasContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Intercept Refresh (F5, Ctrl+R, Cmd+R)
      if (
        onRefreshPage &&
        (e.key === 'F5' || (ctrlOrMeta && e.key.toLowerCase() === 'r'))
      ) {
        e.preventDefault();
        onRefreshPage();
        return;
      }

      // Handle Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+S for text formatting even when focused in Fabric hidden textarea
      if (ctrlOrMeta) {
        const keyLower = e.key.toLowerCase();
        const isTextContext =
          activeTool === 'text' ||
          (selectedObject !== null &&
            (selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox')) ||
          targetTag === 'TEXTAREA';

        if (keyLower === 'b' && isTextContext) {
          e.preventDefault();
          const isBold = fontWeight === '700' || fontWeight === '800' || fontWeight === 'bold';
          const newWeight = isBold ? 'normal' : '700';
          if (onUpdateProperties) onUpdateProperties({ fontWeight: newWeight });
          setFontWeight(newWeight);
          return;
        }
        if (keyLower === 'i' && isTextContext) {
          e.preventDefault();
          const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
          if (onUpdateProperties) onUpdateProperties({ fontStyle: newStyle });
          setFontStyle(newStyle);
          return;
        }
        if (keyLower === 'u' && isTextContext) {
          e.preventDefault();
          const newUnderline = !underline;
          if (onUpdateProperties) onUpdateProperties({ underline: newUnderline });
          setUnderline(newUnderline);
          return;
        }
        if (keyLower === 's' && isTextContext) {
          e.preventDefault();
          const newLinethrough = !linethrough;
          if (onUpdateProperties) onUpdateProperties({ linethrough: newLinethrough });
          setLinethrough(newLinethrough);
          return;
        }
      }

      const targetEl = e.target as HTMLElement;
      const isFabricCanvasChild = Boolean(targetEl?.closest?.('.canvas-container') || targetEl?.classList?.contains('fabric-canvas-textarea'));
      const isEditingText = Boolean(selectedObject && (selectedObject as any).isEditing);
      const isUserFormInput =
        (targetTag === 'INPUT' || (targetTag === 'TEXTAREA' && !isFabricCanvasChild) || (targetEl?.isContentEditable && !isFabricCanvasChild));

      if (isUserFormInput || isEditingText) {
        if (e.key === 'Escape') {
          targetEl?.blur();
          if (onCloseAllMenus) onCloseAllMenus();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isZenMode) {
          setIsZenMode(false);
          return; // Allow other escape behaviors next time
        }

        if (onCloseAllMenus) {
          onCloseAllMenus();
        }
        if (onClearSelection) {
          onClearSelection();
        }
        setActiveTool('select');
        return;
      }

      // Alt + Arrow: Clone shape in direction
      if (e.altKey && !ctrlOrMeta && onCloneShapeWithArrow) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onCloneShapeWithArrow('right');
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onCloneShapeWithArrow('left');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onCloneShapeWithArrow('down');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onCloneShapeWithArrow('up');
          return;
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          setIsZenMode(!isZenMode);
          return;
        }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          if (onToggleFullscreen) onToggleFullscreen();
          return;
        }
      }

      // Plain Arrow or Shift + Arrow: Nudge selection (1px or 10px)
      if (!ctrlOrMeta && !e.altKey && onNudgeSelection && e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onNudgeSelection(0, -step);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onNudgeSelection(0, step);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onNudgeSelection(-step, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNudgeSelection(step, 0);
          return;
        }
      }

      if (ctrlOrMeta) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            onRedo();
          } else {
            onUndo();
          }
          return;
        }

        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          onRedo();
          return;
        }

        if (e.key.toLowerCase() === 'c') {
          if (onCopy) {
            onCopy();
          }
          return;
        }

        if (e.key.toLowerCase() === 'x') {
          if (onCut) {
            onCut();
          }
          return;
        }

        if (e.key.toLowerCase() === 'v') {
          if (onPaste) {
            onPaste();
          }
          return;
        }

        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          onDuplicate();
          return;
        }

        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          onSelectAll();
          return;
        }

        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          onSaveJson();
          return;
        }

        if (e.key.toLowerCase() === 'e' && e.shiftKey) {
          e.preventDefault();
          onExport();
          return;
        }
        
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          if (e.shiftKey) {
            if (onUngroupSelected) onUngroupSelected();
          } else {
            if (onGroupSelected) onGroupSelected();
          }
          return;
        }

        // Ctrl + ': Toggle Grid Show/Hide (Ctrl + Shift + ': Toggle Snap to Grid)
        if (e.key === "'" || e.key === '"') {
          e.preventDefault();
          if (e.shiftKey) {
            setGridConfig({ snapToGrid: !grid.snapToGrid });
          } else {
            setGridConfig({ enabled: !grid.enabled });
          }
          return;
        }

        // Ctrl + /: Decrease Grid Size
        if (e.key === '/' || e.key === '?') {
          e.preventDefault();
          setGridConfig({ size: Math.max(10, grid.size - 5) });
          return;
        }

        // Ctrl + \: Increase Grid Size
        if (e.key === '\\' || e.key === '|') {
          e.preventDefault();
          setGridConfig({ size: Math.min(100, grid.size + 5) });
          return;
        }

        // Ctrl + 0: Reset Zoom 100%
        if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
          return;
        }

        // Ctrl + + / Ctrl + =: Zoom In
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom((z) => Math.min(10, Number((z + 0.1).toFixed(2))));
          return;
        }

        // Ctrl + -: Zoom Out
        if (e.key === '-') {
          e.preventDefault();
          setZoom((z) => Math.max(0.1, Number((z - 0.1).toFixed(2))));
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete();
        return;
      }

      const toolMap: Record<string, ToolType> = {
        v: 'select',
        p: 'pencil',
        b: 'pen',
        m: 'marker',
        l: 'laser',
        e: 'eraser',
        u: 'line',
        a: 'arrow',
        r: 'rectangle',
        c: 'circle',
        t: 'text',
        '1': 'rectangle',
        '2': 'diamond',
        '3': 'circle',
        '4': 'arrow',
        '5': 'line',
        '6': 'pencil',
        '7': 'marker',
        '8': 'laser',
        '9': 'text',
        '0': 'eraser',
      };

      const key = e.key.toLowerCase();
      if (!ctrlOrMeta && !e.altKey) {
        if (e.key === ']') {
          e.preventDefault();
          setGridConfig({ size: Math.min(100, grid.size + 5) });
          return;
        }

        if (e.key === '[') {
          e.preventDefault();
          setGridConfig({ size: Math.max(10, grid.size - 5) });
          return;
        }

        if (key === 'q') {
          e.preventDefault();
          toggleToolLock();
          return;
        }
        if (key === 's') {
          e.preventDefault();
          setIsDrawToShapeMode(!isDrawToShapeMode);
          return;
        }
        if (toolMap[key]) {
          setActiveTool(toolMap[key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onCopy,
    onCut,
    onPaste,
    onUndo,
    onRedo,
    onDelete,
    onDuplicate,
    onCloneShapeWithArrow,
    onNudgeSelection,
    onClearSelection,
    onSelectAll,
    onSaveJson,
    onExport,
    onCloseAllMenus,
    onImageImport,
    setActiveTool,
    toggleToolLock,
    isDrawToShapeMode,
    setIsDrawToShapeMode,
    grid,
    setGridConfig,
    setZoom,
    isZenMode,
    setIsZenMode,
    onToggleFullscreen,
    onRefreshPage,
  ]);
};
