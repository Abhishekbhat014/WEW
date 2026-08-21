import React, { useState, useRef, useCallback } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { CanvasProvider, useCanvasContext } from './store/CanvasContext';
import { TooltipProvider } from './components/ui/Tooltip';
import { DrawingCanvas, type DrawingCanvasRef } from './components/canvas/DrawingCanvas';
import { LaserOverlay } from './components/canvas/LaserOverlay';
import { TopToolbar } from './components/toolbars/TopToolbar';
import { LayersPanel } from './components/layers/LayersPanel';
import { exportService } from './export/exportService';
import { storageService } from './services/storageService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFullscreen } from './hooks/useFullscreen';
import type { ExportFormat } from './types/canvas';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  useContextMenu,
} from './components/ui/context-menu';
import { motion, AnimatePresence } from 'motion/react';

import {
  Copy as CopyIcon,
  Scissors as ScissorsIcon,
  ClipboardPaste as ClipboardPasteIcon,
  Trash2 as TrashIcon,
  SquareDashed,
  CopyPlus,
  Group,
  Ungroup,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Grid3X3,
  Check,
  Sliders,
  X,
  FilePlus,
  FolderOpen,
  Download,
  SlidersHorizontal,
  Focus,
  Maximize,
  Minimize,
  Moon,
  FileText,
  FileImage,
  Code2,
  Info,
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';

import { BottomLeftControls } from './components/toolbars/BottomLeftControls';
import { PropertiesInspectorPanel } from './components/panels/PropertiesInspectorPanel';
import { GroupActionsPanel } from './components/panels/GroupActionsPanel';
import { GroupPropertiesPanel } from './components/panels/GroupPropertiesPanel';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { CanvasSettingsModal } from './components/modals/CanvasSettingsModal';
import { NewCanvasDialog } from './components/modals/NewCanvasDialog';
import { RefreshWarningModal } from './components/modals/RefreshWarningModal';
import { AboutModal } from './components/modals/AboutModal';

const DocumentModeView = React.lazy(() =>
  import('./components/pdf/DocumentModeView').then((m) => ({ default: m.DocumentModeView }))
);

/* ─── Context Menu Type ─────────────────────────────────────────────── */

type CanvasContextMenuType = 'canvas' | 'object' | 'multi-selection' | 'group' | 'text' | 'main-menu';
type GridLayoutType = 'dots' | 'lines' | 'graph' | 'blank';

interface ContextMenuEventData {
  context: CanvasContextMenuType;
  targetId: string | null;
  objectIndex: number;
  totalObjects: number;
  hasClipboard: boolean;
}

/* ─── Grid Layout Submenu ───────────────────────────────────────────── */

const GridLayoutSubmenu: React.FC<{
  activeGrid: GridLayoutType;
  onGridChange: (layout: GridLayoutType) => void;
  onCustomize: () => void;
}> = ({ activeGrid, onGridChange, onCustomize }) => {
  const { closeMenu } = useContextMenu();

  const gridOptions: Array<{ value: GridLayoutType; label: string }> = [
    { value: 'dots', label: 'Dots' },
    { value: 'lines', label: 'Lines' },
    { value: 'graph', label: 'Graph Paper' },
    { value: 'blank', label: 'Blank' },
  ];

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger icon={<Grid3X3 className="w-4 h-4" />}>
        Grid Layout
      </ContextMenuSubTrigger>
      <ContextMenuSubContent width={190}>
        <ContextMenuGroup>
          {gridOptions.map((option) => (
            <ContextMenuItem
              key={option.value}
              onClick={() => {
                onGridChange(option.value);
                closeMenu();
              }}
            >
              <span className="flex w-4 shrink-0 items-center justify-center">
                {activeGrid === option.value && <Check className="w-3.5 h-3.5 text-accent" />}
              </span>
              {option.label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            icon={<Sliders className="w-4 h-4" />}
            onClick={() => {
              onCustomize();
              closeMenu();
            }}
          >
            Customize...
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
};

/* ─── Theme Submenu ─────────────────────────────────────────────────── */

const ThemeSubmenu: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const { closeMenu } = useContextMenu();

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger icon={<Moon className="w-4 h-4" />}>
        Appearance
      </ContextMenuSubTrigger>
      <ContextMenuSubContent width={160}>
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => { setThemeMode('light'); closeMenu(); }}>
            <span className="flex w-4 shrink-0 items-center justify-center">
              {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-accent" />}
            </span>
            Light
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setThemeMode('dark'); closeMenu(); }}>
            <span className="flex w-4 shrink-0 items-center justify-center">
              {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-accent" />}
            </span>
            Dark
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setThemeMode('system'); closeMenu(); }}>
            <span className="flex w-4 shrink-0 items-center justify-center">
              {themeMode === 'system' && <Check className="w-3.5 h-3.5 text-accent" />}
            </span>
            System
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
};

/* ─── Export Submenu ─────────────────────────────────────────────────── */

const ExportSubmenu: React.FC<{ onExport: (format: ExportFormat) => void }> = ({ onExport }) => {
  const { closeMenu } = useContextMenu();

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger icon={<Download className="w-4 h-4" />}>
        Export Canvas
      </ContextMenuSubTrigger>
      <ContextMenuSubContent width={180}>
        <ContextMenuGroup>
          <ContextMenuItem
            icon={<FileImage className="w-4 h-4" />}
            onClick={() => {
              onExport('png');
              closeMenu();
            }}
          >
            PNG Image
            <ContextMenuShortcut>.png</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            icon={<FileImage className="w-4 h-4" />}
            onClick={() => {
              onExport('jpg');
              closeMenu();
            }}
          >
            JPG Image
            <ContextMenuShortcut>.jpg</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            icon={<Code2 className="w-4 h-4" />}
            onClick={() => {
              onExport('svg');
              closeMenu();
            }}
          >
            SVG Vector
            <ContextMenuShortcut>.svg</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            icon={<FileImage className="w-4 h-4 text-icon-muted" />}
            onClick={() => {
              onExport('transparent-png');
              closeMenu();
            }}
          >
            Transparent PNG
          </ContextMenuItem>
          <ContextMenuItem
            icon={<FileText className="w-4 h-4" />}
            onClick={() => {
              onExport('pdf');
              closeMenu();
            }}
          >
            PDF Document
            <ContextMenuShortcut>.pdf</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
};

/* ─── Main App ──────────────────────────────────────────────────────── */

const MainDrawingApp: React.FC = () => {
  const canvasRef = useRef<DrawingCanvasRef | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  const [isRefreshWarningModalOpen, setIsRefreshWarningModalOpen] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const skipBeforeUnloadRef = useRef<boolean>(false);

  const {
    activeTool,
    canvasSize,
    projectName,
    setProjectName,
    setProjectId,
    setLastSavedAt,
    documentMode,
    exitDocumentMode,
    grid,
    setGridConfig,
    setZoom,
    canUndo,
    canRedo,
    isZenMode,
    setIsZenMode,
  } = useCanvasContext();

  const { toggleFullscreen, isFullscreen } = useFullscreen();

  const handleCanvasReady = useCallback((ref: DrawingCanvasRef) => {
    canvasRef.current = ref;
  }, []);

  const handleExport = useCallback((format: ExportFormat) => {
    const fc = canvasRef.current?.getFabricCanvas();
    if (fc) {
      exportService.exportCanvas(fc, format, projectName);
    }
  }, [projectName]);

  const handleSaveJson = useCallback(async () => {
    if (!canvasRef.current || isSavingFile) return;
    setIsSavingFile(true);

    try {
      const rawFilename = projectName || 'Untitled Drawing';
      const canvasData = canvasRef.current.getProjectJSON();
      const project = storageService.createDefaultProject(rawFilename);
      project.canvasData = canvasData;

      const saved = await storageService.saveProjectFile(project, rawFilename);
      if (saved) {
        const cleanName = storageService.normalizeFilename(rawFilename).replace(/\.(webdraw|json)$/i, '');
        setProjectName(cleanName);
        const now = new Date().toLocaleTimeString();
        setLastSavedAt(now);
        project.metadata.name = cleanName;
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Error saving project file:', err);
    } finally {
      setIsSavingFile(false);
    }
  }, [projectName, isSavingFile, setProjectName, setLastSavedAt]);

  const handleImportJson = useCallback((file: File) => {
    storageService.importProjectJson(file).then((project) => {
      if (canvasRef.current && project.canvasData) {
        canvasRef.current.loadProjectJSON(project.canvasData);
        setHasUnsavedChanges(false);
      }
    });
  }, []);

  const handleNewProject = useCallback(() => {
    setIsNewCanvasDialogOpen(true);
  }, []);

  const handleConfirmNewProject = useCallback(() => {
    if (documentMode) {
      exitDocumentMode();
    }
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
    const newId = `proj-${Date.now()}`;
    setProjectId(newId);
    setProjectName('Untitled Project');
    setHasUnsavedChanges(false);
    setIsNewCanvasDialogOpen(false);
  }, [documentMode, exitDocumentMode, setProjectId, setProjectName]);

  React.useEffect(() => {
    const newId = `proj-${Date.now()}`;
    setProjectId(newId);
  }, [setProjectId]);

  const closeAllMenus = useCallback(() => {
    setIsLayersOpen(false);
    window.dispatchEvent(new CustomEvent('app:close-menus'));
  }, []);

  React.useEffect(() => {
    const handleClose = () => setIsLayersOpen(false);
    const handleOpenHelp = () => setIsHelpOpen(true);
    const handleOpenCanvasSettings = () => setIsCanvasSettingsOpen(true);
    const handleOpenNewCanvas = () => setIsNewCanvasDialogOpen(true);

    window.addEventListener('app:close-menus', handleClose);
    window.addEventListener('app:open-help', handleOpenHelp);
    window.addEventListener('app:open-canvas-settings', handleOpenCanvasSettings);
    window.addEventListener('app:open-new-canvas', handleOpenNewCanvas);
    
    const handleCanvasChanged = () => setHasUnsavedChanges(true);
    window.addEventListener('app:canvas-changed', handleCanvasChanged);
    
    return () => {
      window.removeEventListener('app:close-menus', handleClose);
      window.removeEventListener('app:open-help', handleOpenHelp);
      window.removeEventListener('app:open-canvas-settings', handleOpenCanvasSettings);
      window.removeEventListener('app:open-new-canvas', handleOpenNewCanvas);
      window.removeEventListener('app:canvas-changed', handleCanvasChanged);
    };
  }, []);



  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      canvasRef.current?.importImage(file);
    }
    e.target.value = '';
  }, []);

  const handleRefreshRequested = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsRefreshWarningModalOpen(true);
    } else {
      window.location.reload();
    }
  }, [hasUnsavedChanges]);

  useKeyboardShortcuts({
    onCopy: () => canvasRef.current?.copySelected(),
    onCut: () => canvasRef.current?.cutSelected(),
    onPaste: () => canvasRef.current?.pasteClipboard(),
    onUndo: () => canvasRef.current?.undo(),
    onRedo: () => canvasRef.current?.redo(),
    onDelete: () => canvasRef.current?.deleteSelected(),
    onDuplicate: () => canvasRef.current?.duplicateSelected(),
    onCloneShapeWithArrow: (dir) => canvasRef.current?.cloneShapeWithArrow(dir),
    onNudgeSelection: (dx, dy) => canvasRef.current?.nudgeSelected(dx, dy),
    onClearSelection: () => canvasRef.current?.clearSelection(),
    onSelectAll: () => canvasRef.current?.selectAll(),
    onSaveJson: handleSaveJson,
    onExport: () => handleExport('png'),
    onCloseAllMenus: closeAllMenus,
    onImageImport: () => imageInputRef.current?.click(),
    onUpdateProperties: (props) => canvasRef.current?.updateObjectProperties(props),
    onGroupSelected: () => canvasRef.current?.groupSelected(),
    onUngroupSelected: () => canvasRef.current?.ungroupSelected(),
    onToggleFullscreen: toggleFullscreen,
    onRefreshPage: handleRefreshRequested,
  });

  /* ─── Grid handlers ─────────────────────────────────────────────── */

  const currentGridType: GridLayoutType = (grid.type as GridLayoutType) || 'graph';

  const handleGridLayoutChange = useCallback((layout: GridLayoutType) => {
    if (layout === 'blank') {
      setGridConfig({ type: 'blank', enabled: true });
    } else {
      setGridConfig({ type: layout, enabled: true });
    }
  }, [setGridConfig]);

  /* ─── Context menu content renderer ─────────────────────────────── */

  const renderContextMenuContent = useCallback((data: ContextMenuEventData | null) => {
    const context = data?.context || 'canvas';
    const isCanvas = context === 'canvas';
    const isMainMenu = context === 'main-menu';
    const isMulti = context === 'multi-selection';
    const isGroup = context === 'group';
    const isText = context === 'text';
    const isObject = !isCanvas && !isMainMenu;

    if (isMainMenu) {
      return (
        <>
          <ContextMenuGroup>
            <ContextMenuItem icon={<FilePlus className="w-4 h-4" />} onClick={handleNewProject}>
              New Whiteboard
            </ContextMenuItem>
            <ContextMenuItem icon={<FolderOpen className="w-4 h-4" />} onClick={() => document.getElementById('main-menu-json-input')?.click()}>
              Open File...
            </ContextMenuItem>
            <ContextMenuItem icon={<Download className="w-4 h-4" />} onClick={handleSaveJson}>
              Save File
            </ContextMenuItem>
            <ContextMenuItem icon={<FileText className="w-4 h-4" />} onClick={() => document.getElementById('main-menu-pdf-input')?.click()}>
              Import PDF Document
            </ContextMenuItem>
            <ExportSubmenu onExport={handleExport} />
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ThemeSubmenu />
            <ContextMenuItem icon={<SlidersHorizontal className="w-4 h-4" />} onClick={() => setIsCanvasSettingsOpen(true)}>
              Canvas Properties
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem
              icon={isZenMode ? <X className="w-4 h-4" /> : <Focus className="w-4 h-4" />}
              onClick={() => setIsZenMode(!isZenMode)}
            >
              {isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
              <ContextMenuShortcut>Alt+Z</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              className="hidden sm:flex"
              icon={isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              onClick={() => toggleFullscreen()}
            >
              {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              <ContextMenuShortcut>Alt+F</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem icon={<Info className="w-4 h-4" />} onClick={() => setIsAboutModalOpen(true)}>
              About WebDraw
            </ContextMenuItem>
          </ContextMenuGroup>
        </>
      );
    }

    const canBringToFront = isObject && data ? data.objectIndex < data.totalObjects - 1 : false;
    const canBringForward = canBringToFront;
    const canSendToBack = isObject && data ? data.objectIndex > 0 : false;
    const canSendBackward = canSendToBack;
    const hasClipboard = data?.hasClipboard ?? false;

    if (isCanvas) {
      return (
        <>
          <ContextMenuGroup>
            <ContextMenuItem
              disabled={!hasClipboard}
              icon={<ClipboardPasteIcon className="w-4 h-4" />}
              onClick={() => canvasRef.current?.pasteClipboard()}
            >
              Paste
              <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              icon={<SquareDashed className="w-4 h-4" />}
              onClick={() => canvasRef.current?.selectAll()}
            >
              Select All
              <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <GridLayoutSubmenu
            activeGrid={currentGridType}
            onGridChange={handleGridLayoutChange}
            onCustomize={() => setIsCanvasSettingsOpen(true)}
          />

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem
              icon={<ZoomIn className="w-4 h-4" />}
              onClick={() => setZoom((z) => Math.min(10, z + 0.1))}
            >
              Zoom In
              <ContextMenuShortcut>Ctrl++</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              icon={<ZoomOut className="w-4 h-4" />}
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            >
              Zoom Out
              <ContextMenuShortcut>Ctrl+-</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setZoom(1)}
            >
              Reset Zoom
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem
              disabled={!canUndo}
              icon={<Undo2 className="w-4 h-4" />}
              onClick={() => canvasRef.current?.undo()}
            >
              Undo
              <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canRedo}
              icon={<Redo2 className="w-4 h-4" />}
              onClick={() => canvasRef.current?.redo()}
            >
              Redo
              <ContextMenuShortcut>Ctrl+Y</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>
        </>
      );
    }

    return (
      <>
        <ContextMenuGroup>
          <ContextMenuItem
            icon={<ScissorsIcon className="w-4 h-4" />}
            onClick={() => canvasRef.current?.cutSelected()}
          >
            Cut
            <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            icon={<CopyIcon className="w-4 h-4" />}
            onClick={() => canvasRef.current?.copySelected()}
          >
            Copy
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            icon={<CopyPlus className="w-4 h-4" />}
            onClick={() => canvasRef.current?.duplicateSelected()}
          >
            Duplicate
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon={isZenMode ? <X className="w-4 h-4" /> : <Focus className="w-4 h-4" />}
            onClick={() => setIsZenMode(!isZenMode)}
          >
            {isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
            <ContextMenuShortcut>Alt+Z</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className="hidden sm:flex"
            icon={isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            onClick={() => toggleFullscreen()}
          >
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            <ContextMenuShortcut>Alt+F</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>

        {isText && (
          <>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuItem
                icon={<Type className="w-4 h-4" />}
                onClick={() => canvasRef.current?.editTextObject()}
              >
                Edit Text
              </ContextMenuItem>
            </ContextMenuGroup>
          </>
        )}

        {isMulti && (
          <>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuItem
                icon={<Group className="w-4 h-4" />}
                onClick={() => canvasRef.current?.groupSelected()}
              >
                Group
                <ContextMenuShortcut>Ctrl+G</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuGroup>
          </>
        )}

        {isGroup && (
          <>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuItem
                icon={<Ungroup className="w-4 h-4" />}
                onClick={() => canvasRef.current?.ungroupSelected()}
              >
                Ungroup
                <ContextMenuShortcut>Ctrl+Shift+G</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuGroup>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            disabled={!canBringToFront}
            icon={<ArrowUpToLine className="w-4 h-4" />}
            onClick={() => canvasRef.current?.bringToFront()}
          >
            Bring to Front
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!canBringForward}
            icon={<ArrowUp className="w-4 h-4" />}
            onClick={() => canvasRef.current?.bringForward()}
          >
            Bring Forward
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!canSendBackward}
            icon={<ArrowDown className="w-4 h-4" />}
            onClick={() => canvasRef.current?.sendBackward()}
          >
            Send Backward
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!canSendToBack}
            icon={<ArrowDownToLine className="w-4 h-4" />}
            onClick={() => canvasRef.current?.sendToBack()}
          >
            Send to Back
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            variant="destructive"
            icon={<TrashIcon className="w-4 h-4" />}
            onClick={() => canvasRef.current?.deleteSelected()}
          >
            Delete
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </>
    );
  }, [canUndo, canRedo, currentGridType, handleGridLayoutChange, setIsCanvasSettingsOpen, setZoom, isZenMode, isFullscreen, toggleFullscreen, setIsZenMode, handleExport, handleNewProject, handleSaveJson]);

  return (
    <ContextMenu>
      <div className="relative h-screen w-screen overflow-hidden bg-background select-none font-sans">
        <ContextMenuTrigger className="w-full h-full">
          <DrawingCanvas onCanvasReady={handleCanvasReady} />
        </ContextMenuTrigger>

        <ContextMenuContentRenderer renderContent={renderContextMenuContent} />

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
        
        <input id="main-menu-json-input" type="file" accept=".webdraw,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportJson(f); e.target.value = ''; }} className="hidden" />
        <input id="main-menu-pdf-input" type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) canvasRef.current?.importPdf(f); e.target.value = ''; }} className="hidden" />

        <LaserOverlay
          active={activeTool === 'laser'}
          width={canvasSize.width}
          height={canvasSize.height}
        />

        <TopToolbar
          onImageImport={(file) => canvasRef.current?.importImage(file)}
          onPdfImport={(file) => canvasRef.current?.importPdf(file)}
          toggleLayersPanel={() => setIsLayersOpen(!isLayersOpen)}
          isLayersOpen={isLayersOpen}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <PropertiesInspectorPanel
                onDelete={() => canvasRef.current?.deleteSelected()}
                onDuplicate={() => canvasRef.current?.duplicateSelected()}
                onBringForward={() => canvasRef.current?.bringForward()}
                onSendBackward={() => canvasRef.current?.sendBackward()}
                onBringToFront={() => canvasRef.current?.bringToFront()}
                onSendToBack={() => canvasRef.current?.sendToBack()}
                onUpdateGeometry={(props) => canvasRef.current?.updateGeometry(props)}
                onUpdateCornerRadius={(rx, ry) => canvasRef.current?.updateCornerRadius(rx, ry)}
                onUpdateProperties={(props) => canvasRef.current?.updateObjectProperties(props)}
                onFlipHorizontal={() => canvasRef.current?.flipSelected('horizontal')}
                onFlipVertical={() => canvasRef.current?.flipSelected('vertical')}
                onResetRotation={() => canvasRef.current?.resetRotation()}
                onToggleLock={() => canvasRef.current?.toggleLockSelected()}
                onToggleHide={() => canvasRef.current?.toggleHideSelected()}
                onOpenPdfDocumentMode={() => canvasRef.current?.openPdfDocumentMode()}
                onSetPdfPage={(page) => canvasRef.current?.setPdfPage(page)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <GroupActionsPanel
                onGroupSelected={() => canvasRef.current?.groupSelected()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <GroupPropertiesPanel
                onUngroupSelected={() => canvasRef.current?.ungroupSelected()}
                onDuplicate={() => canvasRef.current?.duplicateSelected()}
                onDelete={() => canvasRef.current?.deleteSelected()}
                onToggleLock={() => canvasRef.current?.toggleLockSelected()}
                onToggleHide={() => canvasRef.current?.toggleHideSelected()}
                onBringForward={() => canvasRef.current?.bringForward()}
                onSendBackward={() => canvasRef.current?.sendBackward()}
                onBringToFront={() => canvasRef.current?.bringToFront()}
                onSendToBack={() => canvasRef.current?.sendToBack()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <BottomLeftControls
                onUndo={() => canvasRef.current?.undo()}
                onRedo={() => canvasRef.current?.redo()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <LayersPanel
                isOpen={isLayersOpen}
                onClose={() => setIsLayersOpen(false)}
                onGetLayerObjectCount={(id) => canvasRef.current?.getLayerObjectCount(id) ?? 0}
                onDeleteLayerObjects={(id) => canvasRef.current?.deleteLayerObjects(id)}
                onGetCanvasObjects={() => canvasRef.current?.getCanvasObjects() || []}
                onMoveCanvasObject={(src, tgt, pos, lyr) => canvasRef.current?.moveCanvasObject(src, tgt, pos, lyr)}
                onSelectObject={(id) => canvasRef.current?.selectCanvasObject(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ShortcutsModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />

        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />

        <CanvasSettingsModal
          isOpen={isCanvasSettingsOpen}
          onClose={() => setIsCanvasSettingsOpen(false)}
        />

        <NewCanvasDialog
          isOpen={isNewCanvasDialogOpen}
          onConfirm={handleConfirmNewProject}
          onClose={() => setIsNewCanvasDialogOpen(false)}
        />

        <RefreshWarningModal
          isOpen={isRefreshWarningModalOpen}
          onCancel={() => setIsRefreshWarningModalOpen(false)}
          onReload={() => {
            skipBeforeUnloadRef.current = true;
            window.location.reload();
          }}
          onSave={() => {
            setIsRefreshWarningModalOpen(false);
            handleSaveJson();
          }}
        />

        {documentMode.isActive && documentMode.pdfData && (
          <React.Suspense fallback={null}>
            <DocumentModeView
              pdfData={documentMode.pdfData}
              onExit={(updatedPdfData) => exitDocumentMode(updatedPdfData)}
            />
          </React.Suspense>
        )}

        <AnimatePresence>
          {isZenMode && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsZenMode(false)}
              data-canvas-ui="true"
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-button-background text-foreground px-4 py-2 text-sm font-medium shadow-xl hover:bg-button-hover hover:-translate-y-0.5 hover:shadow-2xl transition-all"
            >
              <X className="w-4 h-4" />
              Exit Zen Mode
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </ContextMenu>
  );
};

/* ─── Context Menu Content Renderer ─────────────────────────────────── */

/**
 * This component lives inside the ContextMenu provider so it can
 * access useContextMenu() to read targetData for context-aware rendering.
 */
const ContextMenuContentRenderer: React.FC<{
  renderContent: (data: ContextMenuEventData | null) => React.ReactNode;
}> = ({ renderContent }) => {
  const { targetData } = useContextMenu();
  const data = targetData as ContextMenuEventData | null;

  return (
    <ContextMenuContent width={220}>
      {renderContent(data)}
    </ContextMenuContent>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <CanvasProvider>
        <TooltipProvider>
          <MainDrawingApp />
        </TooltipProvider>
      </CanvasProvider>
    </ThemeProvider>
  );
}
