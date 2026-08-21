import React from 'react';
import { RangeSlider } from '../RangeSlider';

interface SliderControlProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <div className="flex items-center justify-between text-xs font-medium text-text-primary">
          <span>{label}</span>
          <span className="inline-flex items-center justify-center rounded-lg bg-surface-hover border border-border px-2 py-0.5 font-mono text-xs font-medium text-text-primary">
            {step < 1 ? value.toFixed(1) : Math.round(value)}
            {unit}
          </span>
        </div>
      ) : null}
      <RangeSlider
        value={value}
        min={min}
        max={max}
        step={step}
        showTicks={false}
        onValueChange={onChange}
        aria-label={typeof label === 'string' ? label : undefined}
      />
    </div>
  );
};
