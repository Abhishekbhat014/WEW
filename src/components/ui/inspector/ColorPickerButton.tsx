import React, { useState } from 'react';
import { ColorPickerPopover } from '../ColorPickerPopover';

interface ColorPickerButtonProps {
  label: React.ReactNode;
  color: string;
  onChange: (color: string) => void;
  allowTransparent?: boolean;
}

export const ColorPickerButton: React.FC<ColorPickerButtonProps> = ({
  label,
  color,
  onChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const isTransparent = color === 'transparent';

  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-text-primary text-xs">{label}</span>
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-surface-hover hover:border-border-strong transition-all cursor-pointer shadow-2xs"
        >
          <div
            className="h-4.5 w-4.5 rounded-lg border border-border-strong shadow-inner"
            style={{
              backgroundColor: isTransparent ? '#ffffff' : color,
              backgroundImage: isTransparent
                ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                : 'none',
              backgroundSize: '4px 4px',
            }}
          />
          <span className="font-mono text-xs font-medium text-text-primary tracking-wide">
            {isTransparent ? 'None' : color.toUpperCase()}
          </span>
        </button>
        {showPicker && (
          <ColorPickerPopover
            color={isTransparent ? '#ffffff' : color}
            onChange={onChange}
            onClose={() => setShowPicker(false)}
            align="right"
            position="bottom"
          />
        )}
      </div>
    </div>
  );
};
