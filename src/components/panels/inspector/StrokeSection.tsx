import React from 'react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { InspectorDropdown } from '../../ui/inspector/InspectorDropdown';
import { NumberInput } from '../../ui/inspector/NumberInput';
import type { StrokeStyle } from '../../../types/canvas';

export const StrokeSection: React.FC<InspectorObjectCallbacks> = (callbacks) => {
  const { strokeWidth, strokeStyle, updateProperty } = useInspectorObject(callbacks);

  const strokePresets = [1, 2, 4, 8, 12];

  const strokeStyles = [
    { id: 'solid', label: 'Solid' },
    { id: 'dashed', label: 'Dashed' },
    { id: 'dotted', label: 'Dotted' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Width Row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">Width</span>
        <NumberInput
          value={strokeWidth}
          min={1}
          max={30}
          unit="px"
          onChange={(val) => updateProperty('strokeWidth', val)}
          className="w-20"
        />
      </div>

      <SliderControl
        label=""
        value={strokeWidth}
        min={1}
        max={30}
        onChange={(val) => updateProperty('strokeWidth', val)}
      />

      {/* Quick Presets */}
      <div className="flex items-center gap-1.5">
        {strokePresets.map((preset) => {
          const isSelected = strokeWidth === preset;
          return (
            <button
              key={preset}
              onClick={() => updateProperty('strokeWidth', preset)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-mono font-bold transition-all cursor-pointer border ${
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

      {/* Style Dropdown */}
      <InspectorDropdown
        label="Style"
        value={strokeStyle}
        options={strokeStyles}
        onChange={(v) => updateProperty('strokeStyle', v as StrokeStyle)}
      />
    </div>
  );
};
