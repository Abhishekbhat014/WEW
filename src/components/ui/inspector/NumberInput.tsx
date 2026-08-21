import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface NumberInputProps {
  label?: React.ReactNode;
  unit?: string;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(String(value));
    }
  }, [value, isFocused]);

  const commitValue = (valStr: string) => {
    let num = Number(valStr);
    if (isNaN(num)) {
      setInputValue(String(value));
      return;
    }
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setInputValue(String(num));
    onChange(num);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    const currentNum = isNaN(Number(inputValue)) ? Number(value) || 0 : Number(inputValue);
    let num = currentNum - (e.shiftKey ? step * 10 : step);
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setInputValue(String(num));
    onChange(num);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    const currentNum = isNaN(Number(inputValue)) ? Number(value) || 0 : Number(inputValue);
    let num = currentNum + (e.shiftKey ? step * 10 : step);
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setInputValue(String(num));
    onChange(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    let num = Number(inputValue) || 0;
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      commitValue(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      num += e.shiftKey ? step * 10 : step;
      commitValue(String(num));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      num -= e.shiftKey ? step * 10 : step;
      commitValue(String(num));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    let num = Number(inputValue) || 0;
    const delta = e.deltaY < 0 ? step : -step;
    num += e.shiftKey ? delta * 10 : delta;
    commitValue(String(num));
  };

  const numericVal = Number(inputValue);
  const isAtMin = min !== undefined && !isNaN(numericVal) && numericVal <= min;
  const isAtMax = max !== undefined && !isNaN(numericVal) && numericVal >= max;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-semibold text-text-primary select-none">
            {label}
          </span>
          {unit && <span className="text-[10px] font-mono font-medium text-icon-muted select-none">{unit}</span>}
        </div>
      )}
      <div
        className={cn(
          "flex h-8 items-center justify-between rounded-lg border border-border bg-surface p-0.5 focus-within:ring-2 focus-within:ring-accent/20 transition-all shadow-2xs",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Decrement (-) Button */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleDecrement}
          disabled={disabled || isAtMin}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-hover text-text-primary hover:bg-surface-active hover:text-text-primary active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-surface-hover cursor-pointer"
          title="Decrease (-)"
        >
          <Minus className="h-3 w-3" />
        </button>

        {/* Input Field */}
        <input
          type="number"
          value={inputValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            setIsFocused(false);
            commitValue(inputValue);
          }}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          className="w-full bg-transparent text-center font-mono text-xs font-bold text-text-primary focus:outline-none px-0.5 [appearance:textfield]"
        />

        {/* Increment (+) Button */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleIncrement}
          disabled={disabled || isAtMax}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-hover text-text-primary hover:bg-surface-active hover:text-text-primary active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-surface-hover cursor-pointer"
          title="Increase (+)"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
