import React, { useRef, useState } from 'react';
import {
  MousePointer,
  Pencil,
  PenTool,
  Highlighter,
  Zap,
  Eraser,
  Shapes,
  Minus,
  MoveRight,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Hexagon,
  Star as StarIcon,
  Diamond as DiamondIcon,
  Type,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { useCanvasContext } from '../../store/CanvasContext';
import type { ToolType } from '../../types/canvas';
import { Tooltip } from '../ui/Tooltip';

interface LeftToolbarProps {
  onImageImport: (file: File) => void;
  onPdfImport: (file: File) => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({ onImageImport, onPdfImport }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const { activeTool, setActiveTool } = useCanvasContext();

  const isShapeActive = [
    'rectangle',
    'rounded-rect',
    'circle',
    'ellipse',
    'triangle',
    'polygon',
    'star',
    'diamond',
    'line',
    'arrow',
  ].includes(activeTool);

  const mainTools: { id: ToolType; label: string; shortcut?: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'select', label: 'Select & Move', shortcut: 'V', icon: MousePointer },
    { id: 'pencil', label: 'Pencil (Freehand)', shortcut: 'P', icon: Pencil },
    { id: 'pen', label: 'Pen (Precision Vector)', shortcut: 'B', icon: PenTool },
    { id: 'marker', label: 'Marker (Highlighter)', shortcut: 'M', icon: Highlighter },
    { id: 'laser', label: 'Laser Pointer', shortcut: 'L', icon: Zap },
    { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
  ];

  const shapeOptions: { id: ToolType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'rectangle', label: 'Rectangle (R)', icon: Square },
    { id: 'rounded-rect', label: 'Rounded Rectangle', icon: Square },
    { id: 'circle', label: 'Circle (C)', icon: CircleIcon },
    { id: 'ellipse', label: 'Ellipse', icon: CircleIcon },
    { id: 'triangle', label: 'Triangle', icon: TriangleIcon },
    { id: 'polygon', label: 'Polygon (Hexagon)', icon: Hexagon },
    { id: 'star', label: 'Star', icon: StarIcon },
    { id: 'diamond', label: 'Diamond', icon: DiamondIcon },
    { id: 'line', label: 'Line (U)', icon: Minus },
    { id: 'arrow', label: 'Arrow (A)', icon: MoveRight },
  ];

  return (
    <aside className="absolute left-4 top-1/2 z-30 -translate-y-1/2 pointer-events-auto flex flex-col gap-1.5 rounded-2xl bg-surface/95 p-2 shadow-2xl backdrop-blur-md border border-border select-none">
      {/* Primary Drawing & Selection Tools */}
      {mainTools.map((t) => {
        const IconComponent = t.icon;
        const isActive = activeTool === t.id;

        return (
          <Tooltip key={t.id} label={t.label} shortcut={t.shortcut} side="right">
            <button
              onClick={() => {
                setActiveTool(t.id);
                setShowShapesMenu(false);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-md'
                  : 'text-icon hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          </Tooltip>
        );
      })}

      {/* Consolidated Shapes Tool Dropdown */}
      <div className="relative">
        <Tooltip label="Shapes & Vectors" side="right">
          <button
            onClick={() => setShowShapesMenu(!showShapesMenu)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              isShapeActive
                ? 'bg-accent text-white shadow-md'
                : 'text-icon hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <Shapes className="w-4 h-4" />
          </button>
        </Tooltip>

        {showShapesMenu && (
          <div className="absolute left-12 top-0 z-50 grid w-48 grid-cols-2 gap-1 rounded-xl bg-surface/98 p-2 shadow-2xl backdrop-blur-2xl border border-border text-xs font-medium text-text-primary">
            {shapeOptions.map((s) => {
              const ShapeIcon = s.icon;
              const isSelected = activeTool === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveTool(s.id);
                    setShowShapesMenu(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
                    isSelected ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'hover:bg-surface-hover text-text-primary'
                  }`}
                >
                  <ShapeIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-icon'}`} />
                  <span className="truncate text-[11px]">{s.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="my-0.5 h-px w-full bg-border" />

      {/* Text Tool */}
      <Tooltip label="Text Tool" shortcut="T" side="right">
        <button
          onClick={() => {
            setActiveTool('text');
            setShowShapesMenu(false);
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            activeTool === 'text'
              ? 'bg-accent text-white shadow-md'
              : 'text-icon hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          <Type className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Image Import Tool */}
      <Tooltip label="Import Image" shortcut="I" side="right">
        <button
          onClick={() => {
            imageInputRef.current?.click();
            setShowShapesMenu(false);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-icon hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </Tooltip>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageImport(file);
        }}
        className="hidden"
      />

      {/* PDF Import Tool */}
      <Tooltip label="Import PDF Document" side="right">
        <button
          onClick={() => {
            pdfInputRef.current?.click();
            setShowShapesMenu(false);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-icon hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <FileText className="w-4 h-4" />
        </button>
      </Tooltip>
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPdfImport(file);
        }}
        className="hidden"
      />
    </aside>
  );
};
