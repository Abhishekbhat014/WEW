import React from 'react';
import {
  Grid3X3,
  Grip,
  Rows,
  Square,
} from 'lucide-react';
import { useCanvasContext } from '../../../store/CanvasContext';
import { SliderControl } from '../../ui/inspector/SliderControl';

export const CanvasPropertiesSection: React.FC = () => {
  const { grid, setGridConfig } = useCanvasContext();

  const currentType = grid.type || 'graph';

  const gridStyles = [
    {
      id: 'dots',
      label: 'Dots',
      icon: Grip,
    },
    {
      id: 'lines',
      label: 'Lines',
      icon: Rows,
    },
    {
      id: 'graph',
      label: 'Graph',
      icon: Grid3X3,
    },
    {
      id: 'blank',
      label: 'Blank',
      icon: Square,
    },
  ] as const;

  const sizePresets = [10, 20, 30, 40, 50];

  const gridColors = [
    { id: '', label: 'Default' },
    { id: '#d4d4d4', label: 'Light' },
    { id: '#737373', label: 'Medium' },
    { id: '#404040', label: 'Dark' },
  ];

  return (
    <div className="flex flex-col gap-6 text-text-primary">
      
      {/* GRID Header */}
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-icon-muted">
          Grid
        </span>

        {/* Style */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text-muted">Style</span>
          <div className="grid grid-cols-4 gap-2">
            {gridStyles.map((style) => {
              const Icon = style.icon;
              const isSelected = currentType === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setGridConfig({ type: style.id as any })}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-2.5 px-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-border-strong bg-surface-active text-foreground font-bold shadow-2xs'
                      : 'border-border bg-surface text-text-muted hover:border-border-strong hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium">{style.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-primary">Show Grid</span>
            <p className="text-[10px] text-icon-muted mt-0.5">Display background grid overlay</p>
          </div>
          <button
            type="button"
            onClick={() => setGridConfig({ enabled: !grid.enabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              grid.enabled ? 'bg-accent' : 'bg-surface-active border border-border'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface transition-transform shadow-sm ${
                grid.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-primary">Snap to Grid</span>
              <span className="rounded-md bg-surface-active px-1.5 py-0.5 text-[9px] font-mono font-bold text-text-primary border border-border">Ctrl+Shift+'</span>
            </div>
            <p className="text-[10px] text-icon-muted mt-0.5">Align shapes automatically to grid points</p>
          </div>
          <button
            type="button"
            onClick={() => setGridConfig({ snapToGrid: !grid.snapToGrid })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              grid.snapToGrid ? 'bg-accent' : 'bg-surface-active border border-border'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface transition-transform shadow-sm ${
                grid.snapToGrid ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Size & Color */}
        {currentType !== 'blank' && (
          <>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text-muted">Grid Size</span>
                <span className="text-[11px] font-mono font-bold text-text-primary">{grid.size} px</span>
              </div>
              <SliderControl
                label=""
                value={grid.size}
                min={10}
                max={100}
                step={5}
                unit="px"
                onChange={(val) => setGridConfig({ size: val })}
              />
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {sizePresets.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGridConfig({ size })}
                    className={`flex items-center justify-center rounded-xl py-1.5 text-xs font-mono font-bold transition-all cursor-pointer border ${
                      grid.size === size
                        ? 'bg-surface-active text-foreground border-border-strong shadow-xs ring-1 ring-border-strong'
                        : 'bg-surface-active/40 text-text-primary border-border hover:bg-surface-hover hover:border-border-strong hover:text-foreground'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <span className="text-[11px] font-medium text-text-muted">Grid Color</span>
              <div className="flex items-center gap-2">
                {gridColors.map((c) => {
                  const isSelected = (grid.color || '') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setGridConfig({ color: c.id })}
                      className={`h-6 w-6 rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-accent ring-offset-2 scale-110 border-transparent'
                          : 'border-border hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.id || 'var(--canvas-grid)' }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
