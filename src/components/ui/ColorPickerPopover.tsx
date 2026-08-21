import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, X } from 'lucide-react';

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  align?: 'left' | 'right' | 'center';
  position?: 'top' | 'bottom';
}

// Color Utility Functions (HEX <-> HSV <-> RGB)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '');
  if (cleaned === 'transparent' || !cleaned) return { r: 99, g: 102, b: 241 };
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 99, g: 102, b: 241 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / diff) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / diff + 2;
    } else {
      h = (rNorm - gNorm) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;

  if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  onChange,
  onClose,
  align = 'left',
  position = 'bottom',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const initialRgb = hexToRgb(color);
  const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

  const [hsv, setHsv] = useState(initialHsv);
  const [hexInput, setHexInput] = useState(color === 'transparent' ? '#FFFFFF' : color.toUpperCase());
  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  // Sync state when props color changes externally
  useEffect(() => {
    const rgb = hexToRgb(color);
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHsv(newHsv);
    setHexInput(color === 'transparent' ? '#FFFFFF' : color.toUpperCase());
  }, [color]);

  // Click outside to close (disabled while actively dragging palette or hue slider)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDraggingSatVal.current || isDraggingHue.current) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const updateColorFromHsv = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const { r, g, b } = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // Saturation/Value 2D Dragging Handler
  const handleSatValMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const s = x / rect.width;
    const v = 1 - y / rect.height;

    updateColorFromHsv({ ...hsv, s, v });
  }, [hsv, updateColorFromHsv]);

  const handleSatValDown = (e: React.PointerEvent) => {
    isDraggingSatVal.current = true;
    handleSatValMove(e);
  };

  // Hue Slider Dragging Handler
  const handleHueMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const h = Math.round((x / rect.width) * 360) % 360;

    updateColorFromHsv({ ...hsv, h });
  }, [hsv, updateColorFromHsv]);

  const handleHueDown = (e: React.PointerEvent) => {
    isDraggingHue.current = true;
    handleHueMove(e);
  };

  // Pointer Up listener across window
  useEffect(() => {
    const handlePointerUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingSatVal.current) {
        handleSatValMove(e);
      } else if (isDraggingHue.current) {
        handleHueMove(e);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handleSatValMove, handleHueMove]);

  // EyeDropper Tool Handler
  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.toUpperCase();
          const rgb = hexToRgb(hex);
          const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
          updateColorFromHsv(newHsv);
        }
      } catch {
        // User cancelled eyedropper
      }
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
      const formatted = val.startsWith('#') ? val : `#${val}`;
      const rgb = hexToRgb(formatted);
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      onChange(formatted.toUpperCase());
    }
  };

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);

  const presetColors = [
    '#6366F1', '#3B82F6', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#8B5CF6', '#1E293B',
    '#94A3B8', '#FFFFFF', 'transparent'
  ];

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  };

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 w-64 rounded-xl bg-surface/95 p-3 shadow-2xl backdrop-blur-xl border border-border/90 text-xs select-none ${alignmentClasses[align]} ${positionClasses[position]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border mb-2.5">
        <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">Color Picker</span>
        <button
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded-xl text-icon-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2D Saturation-Value Canvas Box */}
      <div
        ref={satValRef}
        onPointerDown={handleSatValDown}
        className="relative h-32 w-full rounded-xl overflow-hidden cursor-crosshair shadow-inner mb-3"
        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-black to-transparent" />

        {/* Drag Handle Marker */}
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform duration-75"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: `rgb(${r}, ${g}, ${b})`,
          }}
        />
      </div>

      {/* Spectrum Hue Slider & Color Preview / Eyedropper */}
      <div className="flex items-center gap-2.5 mb-3">
        {/* Color Preview Pill / Eyedropper */}
        {'EyeDropper' in window ? (
          <button
            onClick={handleEyeDropper}
            title="Pick color from screen"
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border shadow-sm transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
          >
            <Pipette className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
          </button>
        ) : (
          <div
            className="h-7 w-7 shrink-0 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
          />
        )}

        {/* Hue Spectrum Bar */}
        <div
          ref={hueRef}
          onPointerDown={handleHueDown}
          className="relative h-3 w-full rounded-full cursor-pointer shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          }}
        >
          <div
            className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-foreground shadow-md pointer-events-none"
            style={{ left: `${(hsv.h / 360) * 100}%` }}
          />
        </div>
      </div>

      {/* HEX and RGB Value Controls */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className={['col-span-2 flex items-center rounded-xl border border-border bg-surface-elevated px-2 py-1 transition-colors', 'focus-within:border-accent focus-within:bg-surface'].join(' ')}>
          <span className="text-[10px] font-bold text-icon-muted mr-1">HEX</span>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            className="w-full bg-transparent font-mono text-xs font-bold text-text-primary focus:outline-none uppercase"
          />
        </div>
        <div className="col-span-2 flex items-center gap-1 rounded-xl border border-border bg-surface-elevated px-1.5 py-1 text-[10px] font-mono font-bold text-text-primary">
          <span className="text-icon-muted">R:</span><span>{r}</span>
          <span className="text-icon-muted ml-0.5">G:</span><span>{g}</span>
          <span className="text-icon-muted ml-0.5">B:</span><span>{b}</span>
        </div>
      </div>

      {/* Preset Swatches Grid */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
        {presetColors.map((pColor) => {
          const isSelected = color.toUpperCase() === pColor.toUpperCase();
          return (
            <button
              key={pColor}
              onClick={() => {
                if (pColor === 'transparent') {
                  onChange('transparent');
                } else {
                  const rgbP = hexToRgb(pColor);
                  const newHsvP = rgbToHsv(rgbP.r, rgbP.g, rgbP.b);
                  updateColorFromHsv(newHsvP);
                }
              }}
              className={`relative h-5 w-5 rounded-full border border-border shadow-sm transition-all hover:scale-115 active:scale-95 flex items-center justify-center ${
                isSelected ? 'ring-2 ring-accent ring-offset-1 scale-105 border-transparent' : 'hover:border-border-strong'
              }`}
              style={{
                backgroundColor: pColor === 'transparent' ? 'white' : pColor,
                backgroundImage:
                  pColor === 'transparent'
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                    : 'none',
                backgroundSize: '4px 4px',
              }}
            >
              {pColor === 'transparent' && (
                <div className="w-full h-0.5 bg-red-500/80 transform -rotate-45 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
