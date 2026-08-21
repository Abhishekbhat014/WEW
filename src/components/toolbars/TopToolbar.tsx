import React, { useState, useRef } from 'react';
import {
  Menu,
  Layers as LayersIcon,
  MousePointer,
  Square,
  Diamond as DiamondIcon,
  Circle as CircleIcon,
  MoveRight,
  Minus,
  Pencil,
  PenTool,
  Type,
  Image as ImageIcon,
  Eraser,
  Triangle as TriangleIcon,
  Hexagon,
  Star as StarIcon,
  Zap,
  Highlighter,
  Wand2,
  HelpCircle,
  MoreHorizontal,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react';
import { useCanvasContext } from '../../store/CanvasContext';
import { Tooltip } from '../ui/Tooltip';
import type { ToolType } from '../../types/canvas';
import { motion, AnimatePresence } from 'motion/react';
import { useContextMenu } from '../ui/context-menu';

interface TopToolbarProps {
  onImageImport: (file: File) => void;
  onPdfImport: (file: File) => void;
  toggleLayersPanel: () => void;
  isLayersOpen: boolean;
  onOpenHelp?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = React.memo(({
  onImageImport,
  onPdfImport,
  toggleLayersPanel,
  isLayersOpen,
  onOpenHelp,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [showMoreShapesMenu, setShowMoreShapesMenu] = useState(false);
  const { openMenu } = useContextMenu();

  const {
    activeTool,
    setActiveTool,
    isToolLocked,
    toggleToolLock,
    isDrawToShapeMode,
    setIsDrawToShapeMode,
    isZenMode,
  } = useCanvasContext();


  React.useEffect(() => {
    const handleClose = () => {
      setShowMoreShapesMenu(false);
    };

    window.addEventListener('app:close-menus', handleClose);
    return () => window.removeEventListener('app:close-menus', handleClose);
  }, []);

  const primaryTools: { id: ToolType; label: string; shortcut?: string; icon: React.FC<{ className?: string }>; hideOnMobile?: boolean }[] = [
    { id: 'select', label: 'Selection', shortcut: 'V', icon: MousePointer },
    { id: 'rectangle', label: 'Rectangle', shortcut: '1', icon: Square },
    { id: 'diamond', label: 'Diamond', shortcut: '2', icon: DiamondIcon, hideOnMobile: true },
    { id: 'circle', label: 'Circle / Ellipse', shortcut: '3', icon: CircleIcon, hideOnMobile: true },
    { id: 'arrow', label: 'Arrow', shortcut: '4', icon: MoveRight, hideOnMobile: true },
    { id: 'line', label: 'Line', shortcut: '5', icon: Minus, hideOnMobile: true },
    { id: 'pencil', label: 'Draw / Freehand', shortcut: '6', icon: Pencil },
    { id: 'marker', label: 'Highlighter', shortcut: '7', icon: Highlighter, hideOnMobile: true },
    { id: 'laser', label: 'Laser Pointer', shortcut: '8', icon: Zap, hideOnMobile: true },
    { id: 'text', label: 'Text', shortcut: '9', icon: Type },
    { id: 'eraser', label: 'Eraser', shortcut: '0', icon: Eraser },
  ];

  const secondaryShapes: { id: ToolType | 'image-import'; label: string; icon: React.FC<{ className?: string }>; hideOnDesktop?: boolean }[] = [
    { id: 'diamond', label: 'Diamond', icon: DiamondIcon, hideOnDesktop: true },
    { id: 'circle', label: 'Circle', icon: CircleIcon, hideOnDesktop: true },
    { id: 'arrow', label: 'Arrow', icon: MoveRight, hideOnDesktop: true },
    { id: 'line', label: 'Line', icon: Minus, hideOnDesktop: true },
    { id: 'marker', label: 'Highlighter', icon: Highlighter, hideOnDesktop: true },
    { id: 'laser', label: 'Laser Pointer', icon: Zap, hideOnDesktop: true },
    { id: 'triangle', label: 'Triangle', icon: TriangleIcon },
    { id: 'polygon', label: 'Polygon (Hexagon)', icon: Hexagon },
    { id: 'star', label: 'Star', icon: StarIcon },
    { id: 'pen', label: 'Speed Pen', icon: PenTool },
    { id: 'image-import', label: 'Insert Image', icon: ImageIcon },
  ];

  return (
    <header
      data-canvas-ui="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 flex items-center justify-center"
    >
      {/* TOP LEFT: Hamburger Menu Button & Dropdown */}
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
        <Tooltip label="Main Menu" side="bottom">
          <button
            onClick={(e) => openMenu(e, { context: 'main-menu' })}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface/95 text-text-primary shadow-lg backdrop-blur-md border border-border hover:bg-surface-hover transition-all active:scale-95"
          >
            <Menu className="w-5 h-5 text-icon" />
          </button>
        </Tooltip>

        <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageImport(f); e.target.value = ''; }} className="hidden" />
        <input ref={pdfInputRef} type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPdfImport(f); e.target.value = ''; }} className="hidden" />
      </div>

      {/* TOP CENTER FLOATING TOOLBAR: Main Excalidraw Tool Buttons */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-surface/95 p-1.5 shadow-xl backdrop-blur-md border border-border select-none max-w-[calc(100vw-24px)] sm:max-w-none mt-14 sm:mt-0">
        {/* Tool Lock Button */}
        <Tooltip
          label={isToolLocked ? 'Keep selected tool active (Locked)' : 'Keep selected tool active (Unlocked)'}
          shortcut="Q"
          side="bottom"
        >
          <button
            data-tool="lock-tool"
            onClick={toggleToolLock}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
              isToolLocked
                ? 'bg-accent text-white shadow-md'
                : 'text-icon hover:bg-surface-hover hover:text-foreground'
            }`}
            aria-label={isToolLocked ? 'Unlock tool' : 'Lock tool'}
            aria-pressed={isToolLocked}
          >
            {isToolLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 opacity-75" />}
            <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-60 hidden sm:block">
              Q
            </span>
          </button>
        </Tooltip>

        <div className="h-5 w-px bg-border mx-0.5" />
        {/* Primary Excalidraw Tools */}
        {primaryTools.map((t) => {
          const IconComp = t.icon;
          const isActive = activeTool === t.id;

          return (
            <Tooltip key={t.id} label={t.label} shortcut={t.shortcut} side="bottom">
              <button
                data-tool={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`relative h-9 w-9 items-center justify-center rounded-xl transition-all ${t.hideOnMobile ? 'hidden sm:flex' : 'flex'} ${
                  isActive
                    ? 'bg-accent text-white shadow-md scale-105'
                    : 'text-icon hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <IconComp className="w-4 h-4" />
                {t.shortcut && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-60 hidden sm:block">
                    {t.shortcut}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}

        {/* More Tools Menu */}
        <div className="relative">
          <Tooltip label="More Tools" side="bottom">
            <button
              data-tool="more-tools"
              onClick={() => setShowMoreShapesMenu(!showMoreShapesMenu)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                showMoreShapesMenu ? 'bg-surface-active text-foreground shadow-xs' : 'text-icon hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </Tooltip>

          <AnimatePresence>
            {showMoreShapesMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-12 z-50 flex w-64 flex-col gap-2 rounded-2xl bg-surface/98 p-2.5 shadow-2xl backdrop-blur-2xl text-xs font-medium text-text-primary border border-border select-none"
              >
                {/* Header Label */}
                <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
                  <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    More Tools & Media
                  </span>
                </div>

                {/* Secondary Shapes Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {secondaryShapes.map((s) => {
                    const ShapeIcon = s.icon;
                    const isSelected = activeTool === s.id;
                    return (
                      <button
                        key={s.id}
                        data-tool={s.id}
                        onClick={() => {
                          if (s.id === 'image-import') {
                            imageInputRef.current?.click();
                          } else {
                            setActiveTool(s.id as ToolType);
                          }
                          setShowMoreShapesMenu(false);
                        }}
                        className={`items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all cursor-pointer active:scale-95 ${s.hideOnDesktop ? 'flex sm:hidden' : 'flex'} ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md font-semibold'
                            : 'bg-surface-active/40 hover:bg-surface-active text-text-primary'
                        }`}
                      >
                        <ShapeIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-icon'}`} />
                        <span className="truncate text-[11px] font-medium">{s.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* PDF Document Button */}
                <button
                  onClick={() => {
                    pdfInputRef.current?.click();
                    setShowMoreShapesMenu(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 bg-surface-active/40 hover:bg-surface-active text-text-primary transition-all cursor-pointer active:scale-95 font-medium"
                >
                  <FileText className="w-4 h-4 shrink-0 text-icon" />
                  <span className="truncate text-[11px]">PDF Document</span>
                </button>

                {/* Draw to Shape Toggle Card */}
                <button
                  type="button"
                  onClick={() => setIsDrawToShapeMode(!isDrawToShapeMode)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl p-2.5 transition-all cursor-pointer active:scale-98 ${
                    isDrawToShapeMode
                      ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 font-semibold'
                      : 'bg-surface-active/40 hover:bg-surface-active text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isDrawToShapeMode ? 'bg-indigo-600 text-white shadow-xs' : 'bg-surface-active text-icon'
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold">Draw to Shape</span>
                        <span className="hidden sm:inline-block rounded bg-surface-active/80 px-1 py-0.2 text-[9px] font-mono font-bold text-text-primary">S</span>
                      </div>
                      <span className="text-[10px] text-text-muted font-normal">Auto-detect shapes</span>
                    </div>
                  </div>

                  <div
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      isDrawToShapeMode ? 'bg-indigo-600' : 'bg-surface-active'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-2xs ${
                        isDrawToShapeMode ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* TOP RIGHT: Help & Layers Buttons */}
      <AnimatePresence>
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2"
          >
            <Tooltip label="Keyboard Shortcuts" side="bottom">
              <button
                onClick={onOpenHelp}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-surface/95 text-icon hover:bg-surface-hover border border-border shadow transition-all hover:text-text-primary active:scale-95"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip label="Layers Drawer" side="bottom">
              <button
                onClick={toggleLayersPanel}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                  isLayersOpen
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-surface/95 text-icon hover:bg-surface-hover border border-border shadow hover:text-text-primary active:scale-95'
                }`}
              >
                <LayersIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});
