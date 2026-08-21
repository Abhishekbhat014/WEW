import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useCanvasContext } from '../../../store/CanvasContext';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { NumberInput } from '../../ui/inspector/NumberInput';
import { HighlightText } from '../../ui/inspector/HighlightText';

interface EraserSectionProps {
  searchQuery?: string;
}

export const EraserSection: React.FC<EraserSectionProps> = ({ searchQuery = '' }) => {
  const { eraserRadius, eraserPressure, setEraserRadius, setEraserPressure } = useCanvasContext();

  const radiusPresets = [5, 10, 20, 40, 80, 120];
  const pressurePresets = [20, 50, 75, 100];

  const handleResetDefaults = () => {
    setEraserRadius(20);
    setEraserPressure(100);
  };

  return (
    <div className="flex flex-col gap-3.5 select-none">
      {/* Eraser Radius (Size) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">
            <HighlightText text="Eraser Radius" query={searchQuery} />
          </span>
          <NumberInput
            value={eraserRadius}
            min={2}
            max={120}
            unit="px"
            onChange={(val) => setEraserRadius(val)}
            className="w-20"
          />
        </div>

        <SliderControl
          label=""
          value={eraserRadius}
          min={2}
          max={120}
          step={1}
          onChange={(val) => setEraserRadius(val)}
        />

        <div className="flex items-center gap-1">
          {radiusPresets.map((preset) => {
            const isSelected = eraserRadius === preset;
            return (
              <button
                key={preset}
                onClick={() => setEraserRadius(preset)}
                className={`flex-1 rounded-lg py-1 text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-surface-active text-foreground border-border-strong shadow-xs'
                    : 'bg-surface text-text-primary hover:bg-surface-hover border-border'
                }`}
              >
                {preset}px
              </button>
            );
          })}
        </div>
      </div>

      {/* Eraser Strength (Erasing Power, Softness & Blur Falloff) */}
      <div className="flex flex-col gap-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-primary">
              <HighlightText text="Eraser Strength" query={searchQuery} />
            </span>
            <span className="text-[10px] text-icon-muted font-normal">(Softness)</span>
          </div>
          <NumberInput
            value={eraserPressure}
            min={10}
            max={100}
            unit="%"
            onChange={(val) => setEraserPressure(val)}
            className="w-20"
          />
        </div>

        <SliderControl
          label=""
          value={eraserPressure}
          min={10}
          max={100}
          step={5}
          unit="%"
          onChange={(val) => setEraserPressure(val)}
        />

        <div className="flex items-center gap-1.5">
          {pressurePresets.map((preset) => {
            const isSelected = eraserPressure === preset;
            return (
              <button
                key={preset}
                onClick={() => setEraserPressure(preset)}
                className={`flex-1 rounded-lg py-1 text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-surface-active text-foreground border-border-strong shadow-xs'
                    : 'bg-surface text-text-primary hover:bg-surface-hover border-border'
                }`}
              >
                {preset}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset to Defaults */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </div>
  );
};
