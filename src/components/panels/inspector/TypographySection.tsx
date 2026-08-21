import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
} from 'lucide-react';
import { useCanvasContext } from '../../../store/CanvasContext';
import type { InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { useInspectorObject } from '../../../hooks/useInspectorObject';
import { InspectorDropdown } from '../../ui/inspector/InspectorDropdown';
import { NumberInput } from '../../ui/inspector/NumberInput';
import { ColorPickerButton } from '../../ui/inspector/ColorPickerButton';
import { Tooltip } from '../../ui/Tooltip';

interface TypographySectionProps extends InspectorObjectCallbacks {
  searchQuery?: string;
}

export const TypographySection: React.FC<TypographySectionProps> = ({
  searchQuery = '',
  ...callbacks
}) => {
  const { updateProperty } = useInspectorObject(callbacks);
  const {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    underline,
    linethrough,
    textAlign,
    letterSpacing,
    lineHeight,
    strokeColor,
  } = useCanvasContext();

  const fontColor = strokeColor;

  const fontFamilies = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Nunito', value: 'Nunito, sans-serif' },
    { label: 'Poppins', value: 'Poppins, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Playfair Display', value: 'Playfair Display, serif' },
    { label: 'Caveat (Handwritten)', value: 'Caveat, cursive' },
    { label: 'Fira Code (Code)', value: 'Fira Code, monospace' },
    { label: 'Outfit', value: 'Outfit, sans-serif' },
    { label: 'Comic Neue', value: 'Comic Neue, cursive' },
    { label: 'Arial', value: 'Arial, sans-serif' },
  ];

  const fontSizes = [12, 16, 20, 24, 32, 48, 64];

  const isBold = fontWeight === '700' || fontWeight === '800' || fontWeight === 'bold';
  const isItalic = fontStyle === 'italic';

  // Match the current fontFamily value to fontFamilies list (handles both bare name and with fallback)
  const currentFontValue = fontFamilies.find(
    (f) => f.value === fontFamily || f.value.split(',')[0].trim() === fontFamily
  )?.value ?? fontFamily;

  return (
    <div className="flex flex-col gap-3">
      {/* Font Color */}
      <ColorPickerButton
        label="Font Color"
        color={fontColor}
        onChange={(c) => updateProperty('fill', c)}
      />

      {/* Font Family */}
      <InspectorDropdown
        label="Font Family"
        value={currentFontValue}
        options={fontFamilies.map((f) => ({ id: f.value, label: f.label }))}
        onChange={(val) => updateProperty('fontFamily', val)}
        triggerWidth="w-44"
      />

      {/* Font Size & Presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-text-primary">
          <span>Font Size</span>
          <NumberInput
            value={fontSize}
            min={8}
            max={120}
            unit="pt"
            onChange={(val) => updateProperty('fontSize', val)}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-1">
          {fontSizes.map((size) => {
            const isSelected = fontSize === size;
            return (
              <button
                key={size}
                onClick={() => updateProperty('fontSize', size)}
                className={`flex-1 rounded-lg py-1 text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-surface-active text-foreground border-border-strong shadow-xs'
                    : 'bg-surface text-text-primary hover:bg-surface-hover border-border'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formatting Toggles (Bold, Italic, Underline, Strikethrough) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Format</span>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-surface-hover p-1 border border-border/40">
          <Tooltip label="Bold" shortcut="Ctrl+B" side="top">
            <button
              onClick={() => updateProperty('fontWeight', isBold ? 'normal' : '700')}
              className={`flex h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                isBold
                  ? 'bg-surface-active text-foreground shadow-xs font-bold border border-border-strong'
                  : 'text-icon hover:text-text-primary'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Italic" shortcut="Ctrl+I" side="top">
            <button
              onClick={() => updateProperty('fontStyle', isItalic ? 'normal' : 'italic')}
              className={`flex h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                isItalic
                  ? 'bg-surface-active text-foreground shadow-xs font-bold border border-border-strong'
                  : 'text-icon hover:text-text-primary'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Underline" shortcut="Ctrl+U" side="top">
            <button
              onClick={() => updateProperty('underline', !underline)}
              className={`flex h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                underline
                  ? 'bg-surface-active text-foreground shadow-xs font-bold border border-border-strong'
                  : 'text-icon hover:text-text-primary'
              }`}
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Strikethrough" shortcut="Ctrl+S" side="top">
            <button
              onClick={() => updateProperty('linethrough', !linethrough)}
              className={`flex h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                linethrough
                  ? 'bg-surface-active text-foreground shadow-xs font-bold border border-border-strong'
                  : 'text-icon hover:text-text-primary'
              }`}
            >
              <StrikethroughIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Alignment Buttons */}
      <div className="flex flex-col gap-1.5 pt-2.5">
        <span className="text-xs font-medium text-text-muted">Alignment</span>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-surface-hover p-1 border border-border/40">
          {[
            { id: 'left', icon: AlignLeft, label: 'Align Left' },
            { id: 'center', icon: AlignCenter, label: 'Align Center' },
            { id: 'right', icon: AlignRight, label: 'Align Right' },
            { id: 'justify', icon: AlignJustify, label: 'Justify' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = textAlign === item.id;
            return (
              <Tooltip key={item.id} label={item.label} side="top">
                <button
                  onClick={() => updateProperty('textAlign', item.id)}
                  className={`flex h-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-active text-foreground shadow-xs font-bold border border-border-strong'
                      : 'text-icon hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Line Height & Letter Spacing */}
      <div className="grid grid-cols-2 gap-2.5 pt-2.5">
        <NumberInput
          label="Line H."
          value={lineHeight}
          min={0.8}
          max={3}
          step={0.1}
          onChange={(val) => updateProperty('lineHeight', val)}
        />
        <NumberInput
          label="Spacing"
          value={letterSpacing}
          min={-5}
          max={20}
          step={1}
          onChange={(val) => updateProperty('letterSpacing', val)}
        />
      </div>
    </div>
  );
};
