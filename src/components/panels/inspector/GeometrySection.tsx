import React, { useState, useEffect } from 'react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { NumberInput } from '../../ui/inspector/NumberInput';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { HighlightText } from '../../ui/inspector/HighlightText';

interface GeometrySectionProps extends InspectorObjectCallbacks {
  showDimensionsOnly?: boolean;
  searchQuery?: string;
}

export const GeometrySection: React.FC<GeometrySectionProps> = ({
  showDimensionsOnly = false,
  searchQuery = '',
  ...callbacks
}) => {
  const { selectedObject, updateGeometry, updateCornerRadius } = useInspectorObject(callbacks);
  const [cornerRadius, setCornerRadius] = useState<number>(3);

  useEffect(() => {
    if (selectedObject) {
      const rx = selectedObject.rx !== undefined ? selectedObject.rx : 3;
      setCornerRadius(rx);
    }
  }, [selectedObject]);

  if (!selectedObject) return null;

  const width = Math.round(selectedObject.width || 0);
  const height = Math.round(selectedObject.height || 0);
  const posX = Math.round(selectedObject.left || 0);
  const posY = Math.round(selectedObject.top || 0);
  const angle = Math.round(selectedObject.angle || 0);
  const isLocked = selectedObject.locked || false;

  // Corner radius eligibility
  const shapeType = selectedObject.shapeType || selectedObject.type || '';
  const isRectangular = ['rectangle', 'rounded-rect', 'rounded-lg-rect', 'rounded-xl-rect', 'rect'].includes(shapeType);
  const isCircular = ['circle', 'ellipse'].includes(shapeType);

  const handleCornerRadiusChange = (val: number) => {
    setCornerRadius(val);
    updateCornerRadius(val);
  };

  const maxRadius = Math.max(1, Math.floor(Math.min(width || 100, height || 100) / 2));

  return (
    <div className="flex flex-col gap-2.5">
      {/* Row 1: Width & Height */}
      <div className="grid grid-cols-2 gap-2.5">
        <NumberInput
          label={<HighlightText text="W" query={searchQuery} />}
          value={width}
          min={2}
          unit="px"
          disabled={isLocked}
          onChange={(val) => updateGeometry({ width: val })}
        />
        <NumberInput
          label={<HighlightText text="H" query={searchQuery} />}
          value={height}
          min={2}
          unit="px"
          disabled={isLocked}
          onChange={(val) => updateGeometry({ height: val })}
        />
      </div>

      {!showDimensionsOnly && (
        <>
          {/* Row 2: Position X & Position Y */}
          <div className="grid grid-cols-2 gap-2.5">
            <NumberInput
              label={<HighlightText text="X" query={searchQuery} />}
              value={posX}
              unit="px"
              disabled={isLocked}
              onChange={(val) => updateGeometry({ left: val })}
            />
            <NumberInput
              label={<HighlightText text="Y" query={searchQuery} />}
              value={posY}
              unit="px"
              disabled={isLocked}
              onChange={(val) => updateGeometry({ top: val })}
            />
          </div>

          {/* Row 3: Rotation Angle */}
          <NumberInput
            label={<HighlightText text="Rotation" query={searchQuery} />}
            value={angle}
            unit="°"
            disabled={isLocked}
            onChange={(val) => {
              const normalizedAngle = ((val % 360) + 360) % 360;
              updateGeometry({ angle: normalizedAngle });
            }}
          />
        </>
      )}

      {/* Folded Corner Radius for supported shapes */}
      {isRectangular && (
        <div className="flex flex-col gap-1.5 pt-2.5 mt-0.5">
          <span className="text-xs font-medium text-text-primary">
            <HighlightText text="Corner Radius" query={searchQuery} />
          </span>
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <SliderControl
                label=""
                value={cornerRadius}
                min={0}
                max={maxRadius}
                onChange={handleCornerRadiusChange}
              />
            </div>
            <NumberInput
              value={cornerRadius}
              min={0}
              max={maxRadius}
              unit="px"
              onChange={handleCornerRadiusChange}
              className="w-20 shrink-0"
            />
          </div>
        </div>
      )}

      {/* Radius X / Y Metadata for circular shapes */}
      {isCircular && (
        <div className="grid grid-cols-2 gap-2.5 text-xs pt-2.5 mt-0.5">
          <div className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 border border-border shadow-2xs">
            <span className="font-medium text-icon-muted">
              <HighlightText text="Radius X" query={searchQuery} />
            </span>
            <span className="font-mono font-normal text-text-primary">{Math.round((width || 0) / 2)}px</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 border border-border shadow-2xs">
            <span className="font-medium text-icon-muted">
              <HighlightText text="Radius Y" query={searchQuery} />
            </span>
            <span className="font-mono font-normal text-text-primary">{Math.round((height || 0) / 2)}px</span>
          </div>
        </div>
      )}
    </div>
  );
};
