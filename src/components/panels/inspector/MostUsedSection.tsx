import React from 'react';
import { Sparkles } from 'lucide-react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { ColorPickerButton } from '../../ui/inspector/ColorPickerButton';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { InspectorDropdown } from '../../ui/inspector/InspectorDropdown';
import { HighlightText } from '../../ui/inspector/HighlightText';
import type { FillStyle } from '../../../types/canvas';

interface MostUsedSectionProps extends InspectorObjectCallbacks {
  showFill?: boolean;
  showColors?: boolean;
  isText?: boolean;
  searchQuery?: string;
}

export const MostUsedSection: React.FC<MostUsedSectionProps> = ({
  showFill = true,
  showColors = true,
  isText = false,
  searchQuery = '',
  ...callbacks
}) => {
  const { strokeColor, fillColor, strokeWidth, opacity, fillStyle, updateProperty, selectedObject } =
    useInspectorObject(callbacks);

  const fontColor = (selectedObject as any)?.fill ?? strokeColor;
  const strokePresets = [1, 2, 4, 8, 12];

  const fillPatterns: { id: FillStyle; label: string }[] = [
    { id: 'hachure', label: 'Hachure' },
    { id: 'solid', label: 'Solid' },
    { id: 'zigzag', label: 'Zigzag' },
    { id: 'cross-hatch', label: 'Cross Hatch' },
    { id: 'dots', label: 'Dots' },
    { id: 'dashed', label: 'Dashed' },
  ];

  if (isText) {
    return (
      <div className="flex flex-col gap-3 pb-3 mb-2 border-b border-border">
        <div className="flex items-center gap-1.5 pb-0.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-icon-muted">
            Most Used
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <ColorPickerButton
            label={<HighlightText text="Font Color" query={searchQuery} />}
            color={fontColor}
            onChange={(c) => updateProperty('fontColor', c)}
          />
          <div className="pt-0.5">
            <SliderControl
              label={<HighlightText text="Opacity" query={searchQuery} />}
              value={Math.round(opacity * 100)}
              min={5}
              max={100}
              step={5}
              unit="%"
              onChange={(val) => updateProperty('opacity', val / 100)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-3 mb-2 border-b border-border">
      {/* Header Badge */}
      <div className="flex items-center gap-1.5 pb-0.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-icon-muted">
          Most Used
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {showColors && (
          <>
            <ColorPickerButton
              label={<HighlightText text="Stroke Color" query={searchQuery} />}
              color={strokeColor}
              onChange={(c) => updateProperty('stroke', c)}
            />

            {showFill && (
              <ColorPickerButton
                label={<HighlightText text="Fill Color" query={searchQuery} />}
                color={fillColor}
                onChange={(c) => updateProperty('fill', c)}
              />
            )}
          </>
        )}

        {/* Fill Pattern (only shown when fill color is active) */}
        {showFill && !!fillColor && fillColor !== 'transparent' && fillColor !== 'none' && (
          <InspectorDropdown
            label={<HighlightText text="Fill Pattern" query={searchQuery} />}
            value={fillStyle}
            options={fillPatterns}
            onChange={(v) => updateProperty('fillStyle', v as FillStyle)}
          />
        )}

        {/* Stroke Width */}
        <div className="flex flex-col gap-1.5">
          <SliderControl
            label={<HighlightText text="Stroke Width" query={searchQuery} />}
            value={strokeWidth}
            min={1}
            max={30}
            unit="px"
            onChange={(val) => updateProperty('strokeWidth', val)}
          />
          <div className="flex items-center gap-1 mt-0.5">
            {strokePresets.map((preset) => {
              const isSelected = strokeWidth === preset;
              return (
                <button
                  key={preset}
                  onClick={() => updateProperty('strokeWidth', preset)}
                  className={`flex-1 rounded-md py-1 text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-surface-active text-foreground border-border-strong shadow-xs'
                      : 'bg-surface text-text-primary hover:bg-surface-hover border-border'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Opacity */}
        <div className="pt-0.5">
          <SliderControl
            label={<HighlightText text="Opacity" query={searchQuery} />}
            value={Math.round(opacity * 100)}
            min={5}
            max={100}
            step={5}
            unit="%"
            onChange={(val) => updateProperty('opacity', val / 100)}
          />
        </div>
      </div>
    </div>
  );
};
