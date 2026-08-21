import React, { useState } from 'react';
import { useCanvasContext } from '../../store/CanvasContext';
import { Palette, SlidersHorizontal, Wand2 } from 'lucide-react';
import { ColorPickerPopover } from '../ui/ColorPickerPopover';
import { RangeSlider } from '../ui/RangeSlider';
import type { DrawingStyle } from '../../types/canvas';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select';

export const ColorToolbar: React.FC = () => {
  const {
    activeTool,
    selectedObject,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    drawingStyle,
    setDrawingStyle,
  } = useCanvasContext();

  const [activeTab, setActiveTab] = useState<'stroke' | 'fill'>('stroke');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const presetColors = [
    '#6366F1', // Indigo
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#1E293B', // Slate Dark
    '#94A3B8', // Slate Light
    '#FFFFFF', // White
    'transparent', // Transparent
  ];

  const drawingStyles: { id: DrawingStyle; label: string }[] = [
    { id: 'sketch', label: 'Sketch' },
    { id: 'precise', label: 'Precise' },
    { id: 'marker', label: 'Marker' },
    { id: 'pencil', label: 'Pencil' },
    { id: 'ink', label: 'Ink' },
  ];

  const shapeTools = [
    'rectangle',
    'rounded-rect',
    'circle',
    'ellipse',
    'triangle',
    'polygon',
    'star',
    'diamond',
  ];

  const isShapeSelected =
    selectedObject &&
    ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'star', 'diamond'].includes(selectedObject.type);

  const showFillOption = shapeTools.includes(activeTool) || !!isShapeSelected;

  const isDrawingTool = [
    'select',
    'pencil',
    'pen',
    'marker',
    'bucket',
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
    'text',
  ].includes(activeTool);

  if (!isDrawingTool) return null;

  const currentTab = showFillOption ? activeTab : 'stroke';
  const currentActiveColor = currentTab === 'stroke' ? strokeColor : fillColor;
  const setCurrentActiveColor = currentTab === 'stroke' ? setStrokeColor : setFillColor;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-surface/95 p-1.5 px-3 shadow-2xl backdrop-blur-md border border-border text-xs text-text-primary select-none">
      {/* Drawing Style Selector */}
      <div className="flex items-center gap-1.5 border-r border-border pr-2.5">
        <Wand2 className="h-3.5 w-3.5 text-accent" />
        <Select value={drawingStyle} onValueChange={(v) => setDrawingStyle(v as DrawingStyle)}>
          <SelectTrigger className="h-7 px-2 py-0 text-[11px] rounded-lg border-border bg-surface-hover hover:bg-surface-active shadow-none min-w-22">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {drawingStyles.map((ds) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.label} Style
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mode Switcher: Show Fill option ONLY for shapes */}
      {showFillOption ? (
        <div className="flex items-center rounded-xl bg-surface-elevated p-0.5 font-bold text-[11px] border border-border">
          <button
            onClick={() => setActiveTab('stroke')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
              currentTab === 'stroke'
                ? 'bg-surface text-accent shadow-sm font-bold'
                : 'text-icon-muted hover:text-foreground'
            }`}
          >
            <div
              className="h-3 w-3 rounded-full border border-border-strong shadow-inner"
              style={{ backgroundColor: strokeColor }}
            />
            <span>Stroke</span>
          </button>

          <button
            onClick={() => setActiveTab('fill')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
              currentTab === 'fill'
                ? 'bg-surface text-accent shadow-sm font-bold'
                : 'text-icon-muted hover:text-foreground'
            }`}
          >
            <div
              className="h-3 w-3 rounded-full border border-border-strong shadow-inner overflow-hidden"
              style={{
                backgroundColor: fillColor === 'transparent' ? 'white' : fillColor,
                backgroundImage:
                  fillColor === 'transparent'
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                    : 'none',
                backgroundSize: '4px 4px',
              }}
            />
            <span>Fill</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground px-1">
          <div
            className="h-3 w-3 rounded-full border border-border-strong shadow-inner"
            style={{ backgroundColor: strokeColor }}
          />
          <span>Stroke Color</span>
        </div>
      )}

      {/* Preset Swatches with Smooth Circular Borders */}
      <div className="flex items-center gap-2 border-l border-r border-border px-2.5 py-0.5">
        {presetColors.map((color) => {
          const isSelected = currentActiveColor === color;
          return (
            <button
              key={color}
              onClick={() => setCurrentActiveColor(color)}
              className={`relative h-6 w-6 rounded-full border border-border shadow-sm transition-all duration-200 hover:scale-115 active:scale-95 flex items-center justify-center ${
                isSelected
                  ? 'ring-2 ring-accent ring-offset-2 scale-110 shadow-md border-transparent'
                  : 'hover:border-border-strong hover:shadow'
              }`}
              style={{
                backgroundColor: color === 'transparent' ? 'white' : color,
                backgroundImage:
                  color === 'transparent'
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                    : 'none',
                backgroundSize: '6px 6px',
              }}
            >
              {color === 'transparent' && (
                <div className="w-full h-0.5 bg-red-500/80 transform -rotate-45 rounded-full" />
              )}
            </button>
          );
        })}

        {/* Custom Color Palette Picker Button with Smooth Border */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-surface shadow-sm hover:bg-surface-hover hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Palette className="h-3.5 w-3.5 text-icon" />
          </button>

          {showColorPicker && (
            <ColorPickerPopover
              color={currentActiveColor}
              onChange={(newColor) => setCurrentActiveColor(newColor)}
              onClose={() => setShowColorPicker(false)}
              align="center"
              position="bottom"
            />
          )}
        </div>
      </div>

      {/* Stroke Width Slider */}
      <div className="flex items-center gap-2 pr-1">
        <SlidersHorizontal className="h-3.5 w-3.5 text-icon-muted" />
        <div className="w-20">
          <RangeSlider
            min={1}
            max={30}
            value={strokeWidth}
            onValueChange={(val) => setStrokeWidth(val)}
            aria-label="Stroke Width"
          />
        </div>
        <span className="w-5 text-right text-[11px] font-bold text-foreground">{strokeWidth}</span>
      </div>
    </div>
  );
};
