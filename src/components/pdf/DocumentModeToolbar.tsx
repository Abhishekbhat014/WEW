import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Type,
  Undo2,
  Redo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  Maximize2,
  Maximize,
  Minimize2,
  ArrowLeftRight,
  Menu,
} from 'lucide-react';
import type { PdfAnnotationTool } from '../../types/pdf';
import { ColorPickerPopover } from '../ui/ColorPickerPopover';
import { Tooltip } from '../ui/Tooltip';

interface DocumentModeToolbarProps {
  currentPage: number;
  numPages: number;
  zoom: number;
  activeTool: PdfAnnotationTool;
  strokeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  hasSelectedObject: boolean;
  fitMode: 'page' | 'width' | 'manual';
  isFullscreen: boolean;
  onToolSelect: (tool: PdfAnnotationTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  onToggleFit: () => void;
  onToggleFullscreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onExit: () => void;
}

const PRESET_COLORS = [
  '#000000',
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#EAB308',
  '#8B5CF6',
  '#FFFFFF',
];

export const DocumentModeToolbar: React.FC<DocumentModeToolbarProps> = ({
  currentPage,
  numPages,
  zoom,
  activeTool,
  strokeColor,
  strokeWidth,
  canUndo,
  canRedo,
  hasSelectedObject,
  fitMode,
  isFullscreen,
  onToolSelect,
  onColorChange,
  onStrokeWidthChange,
  onPageChange,
  onZoomChange,
  onToggleFit,
  onToggleFullscreen,
  onUndo,
  onRedo,
  onDeleteSelected,
  onExit,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeToolMenu, setActiveToolMenu] = useState<PdfAnnotationTool | null>(null);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Click outside to close tool popover menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveToolMenu(null);
        setShowColorPicker(false);
        setIsHamburgerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      onPageChange(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleToolClick = (toolId: PdfAnnotationTool) => {
    onToolSelect(toolId);
    if (toolId === 'pen' || toolId === 'highlighter' || toolId === 'text') {
      setActiveToolMenu(activeToolMenu === toolId ? null : toolId);
    } else {
      setActiveToolMenu(null);
      setShowColorPicker(false);
    }
  };

  const annotationTools: { id: PdfAnnotationTool; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'select', label: 'Select & Move / Delete', icon: MousePointer },
    { id: 'pen', label: 'Pen', icon: Pencil },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
    { id: 'laser', label: 'Laser Pointer', icon: Sparkles },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'text', label: 'Text', icon: Type },
  ];

  return (
    <>
      <header ref={toolbarRef} className="w-full h-14 z-50 pointer-events-auto flex items-center justify-between bg-surface/98 px-2 sm:px-4 shadow-md border-b border-border/80 text-xs select-none shrink-0 backdrop-blur-xl relative gap-1 sm:gap-0">
        {/* Left: Exit Focus Mode Button & Fullscreen Mode Button */}
      <div className="flex items-center gap-2">
        {/* Mobile Hamburger Menu */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-active/30 text-text-primary hover:bg-surface-hover transition-all cursor-pointer active:scale-95 border border-border/60"
          >
            <Menu className="w-5 h-5 text-icon" />
          </button>
          
          {isHamburgerOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 flex flex-col gap-1 p-1.5 rounded-2xl bg-surface/98 shadow-2xl border border-border/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-xs shrink-0 w-48">
              <button
                onClick={() => {
                  setIsHamburgerOpen(false);
                  onExit();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-surface-hover text-text-primary transition-colors text-left group"
              >
                <X className="w-4 h-4 text-icon-muted group-hover:text-text-primary transition-colors" />
                <span className="font-semibold">Exit Focus Mode</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Exit Focus Mode Button */}
        <Tooltip label="Exit Focus Mode (Esc)" side="bottom">
          <button
            onClick={onExit}
            className="hidden sm:flex h-9 items-center gap-2 px-3.5 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95 text-xs"
          >
            <X className="w-4 h-4" />
            <span>Exit Focus Mode</span>
          </button>
        </Tooltip>

        {/* Fullscreen Mode Button (Right side of Exit Focus Mode button) */}
        <Tooltip label={isFullscreen ? 'Exit Fullscreen (F11 / Esc)' : 'Fullscreen Mode (F11)'} side="bottom">
          <button
            onClick={onToggleFullscreen}
            className={`hidden sm:flex h-9 px-3 items-center gap-1.5 rounded-xl transition-all cursor-pointer active:scale-95 font-semibold text-xs border border-border/60 ${
              isFullscreen
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-active/30 text-text-primary hover:bg-surface-hover'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>

      {/* Center: Annotation Tools with Floating Color & Size Popup */}
      <div className="flex items-center gap-1 sm:gap-2.5">
        <div className="flex items-center gap-0.5 sm:gap-1 bg-surface-active/40 p-0.5 sm:p-1 rounded-xl relative">
          {annotationTools.map((t) => {
            const Icon = t.icon;
            const isSelected = activeTool === t.id;
            const hasPopup = t.id === 'pen' || t.id === 'highlighter' || t.id === 'text';

            return (
              <div key={t.id} className="relative">
                <Tooltip label={t.label} side="bottom">
                  <button
                    onClick={() => handleToolClick(t.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-accent text-white shadow-md font-bold'
                        : 'text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </Tooltip>

                {/* Integrated Color & Size Popup Menu */}
                {hasPopup && activeToolMenu === t.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex flex-col gap-2 p-2.5 rounded-2xl bg-surface/98 shadow-2xl border border-border/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-xs shrink-0 w-48">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Color</span>
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-border/60 shadow-xs"
                        style={{ backgroundColor: strokeColor }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onColorChange(c)}
                          className={`h-5 w-5 rounded-full border border-border/40 transition-all cursor-pointer ${
                            strokeColor === c ? 'ring-2 ring-accent scale-110 shadow-xs' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="h-5 w-5 rounded-full border border-dashed border-text-muted/60 flex items-center justify-center text-[11px] font-bold text-text-primary hover:bg-surface-hover cursor-pointer"
                        title="Custom Color Picker"
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    {showColorPicker && (
                      <div className="relative mt-1">
                        <ColorPickerPopover
                          color={strokeColor}
                          onChange={onColorChange}
                          onClose={() => setShowColorPicker(false)}
                          align="center"
                          position="bottom"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/60">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Size</span>
                      <div className="flex items-center gap-1">
                        {[2, 4, 8].map((w) => (
                          <button
                            key={w}
                            onClick={() => onStrokeWidthChange(w)}
                            className={`h-5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              strokeWidth === w
                                ? 'bg-accent text-white shadow-xs'
                                : 'bg-surface-active/40 text-text-primary hover:bg-surface-hover'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Delete Selected Object Button */}
        {hasSelectedObject && (
          <Tooltip label="Delete Selected (Delete / Backspace)" side="bottom">
            <button
              onClick={onDeleteSelected}
              className="flex h-8 px-3 items-center gap-1.5 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-all cursor-pointer font-bold active:scale-95 text-xs shadow-xs border border-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </Tooltip>
        )}

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-1">
          <Tooltip label="Undo" shortcut="Ctrl+Z" side="bottom">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                canUndo ? 'text-text-primary hover:bg-surface-hover cursor-pointer active:scale-95' : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Redo" shortcut="Ctrl+Y" side="bottom">
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                canRedo ? 'text-text-primary hover:bg-surface-hover cursor-pointer active:scale-95' : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Page Navigation, Fit Toggle & Zoom Controls */}
      <div className="flex items-center gap-1 sm:gap-2.5">
        {/* Page Navigation (Desktop) */}
        <div className="hidden sm:flex items-center gap-1 bg-surface-active/30 p-1 rounded-xl">
          <Tooltip label="Previous Page" side="bottom">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                currentPage > 1
                  ? 'text-text-primary hover:bg-surface-hover cursor-pointer active:scale-95'
                  : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Tooltip>

          <form onSubmit={handlePageSubmit} className="flex items-center gap-1 px-1 font-mono">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-8 rounded-md bg-surface-active/60 px-1 py-0.5 text-center font-bold text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-text-muted font-medium text-[11px] whitespace-nowrap">/ {numPages}</span>
          </form>

          <Tooltip label="Next Page" side="bottom">
            <button
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                currentPage < numPages
                  ? 'text-text-primary hover:bg-surface-hover cursor-pointer active:scale-95'
                  : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Single Toggleable Fit to Page / Width Button */}
        <div className="flex items-center bg-surface-active/30 p-1 rounded-xl">
          <Tooltip label={fitMode === 'width' ? 'Fit to Page' : 'Fit to Width'} side="bottom">
            <button
              onClick={onToggleFit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-primary hover:bg-surface-hover transition-all cursor-pointer active:scale-95"
            >
              {fitMode === 'width' ? (
                <Maximize2 className="w-4 h-4 text-accent" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 text-accent" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Zoom Controls (Minus, Percentage Display, Plus) */}
        <div className="hidden md:flex items-center gap-1 bg-surface-active/30 p-1 rounded-xl">
          <Tooltip label="Zoom Out (Ctrl + Wheel Down)" side="bottom">
            <button
              onClick={() => onZoomChange(Math.max(0.25, zoom - 0.15))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-primary hover:bg-surface-hover transition-colors cursor-pointer active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </Tooltip>

          <span className="w-12 text-center font-mono text-xs font-bold text-text-primary px-1 select-none">
            {Math.round(zoom * 100)}%
          </span>

          <Tooltip label="Zoom In (Ctrl + Wheel Up)" side="bottom">
            <button
              onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-primary hover:bg-surface-hover transition-colors cursor-pointer active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>

      {/* Mobile Bottom Floating Page Navigation */}
      <div className="flex sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 items-center gap-2 bg-surface/90 backdrop-blur-xl p-1.5 rounded-full shadow-2xl border border-border/80 z-50">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
            currentPage > 1
              ? 'bg-surface-active/80 text-text-primary hover:bg-surface-hover cursor-pointer'
              : 'bg-surface-active/30 text-text-muted/40 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 px-2 font-mono">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-10 rounded-lg bg-background px-1.5 py-1 text-center font-bold text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent border border-border/60 shadow-inner"
          />
          <span className="text-text-muted font-bold text-sm whitespace-nowrap">/ {numPages}</span>
        </form>

        <button
          onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
            currentPage < numPages
              ? 'bg-surface-active/80 text-text-primary hover:bg-surface-hover cursor-pointer'
              : 'bg-surface-active/30 text-text-muted/40 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};
