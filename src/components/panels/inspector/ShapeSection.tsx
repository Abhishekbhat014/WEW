import React, { useState, useEffect } from 'react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { NumberInput } from '../../ui/inspector/NumberInput';

export const ShapeSection: React.FC<InspectorObjectCallbacks> = (callbacks) => {
  const { selectedObject, updateCornerRadius } = useInspectorObject(callbacks);
  const [cornerRadius, setCornerRadius] = useState<number>(16);

  useEffect(() => {
    if (selectedObject) {
      const rx = selectedObject.rx !== undefined ? selectedObject.rx : 16;
      setCornerRadius(rx);
    }
  }, [selectedObject]);

  if (!selectedObject) return null;

  const shapeType = selectedObject.shapeType || selectedObject.type || '';
  const isRectangular = ['rectangle', 'rounded-rect', 'rounded-lg-rect', 'rounded-xl-rect', 'rect'].includes(shapeType);
  const isCircular = ['circle', 'ellipse'].includes(shapeType);
  const isPolygonOrStar = ['star', 'polygon', 'diamond', 'triangle'].includes(shapeType);

  if (!isRectangular && !isCircular && !isPolygonOrStar) return null;

  const handleCornerRadiusChange = (val: number) => {
    setCornerRadius(val);
    updateCornerRadius(val);
  };

  const width = selectedObject.width || 100;
  const height = selectedObject.height || 100;
  const maxRadius = Math.max(1, Math.floor(Math.min(width, height) / 2));

  return (
    <div className="flex flex-col gap-3">
      {/* Corner Radius for Rectangles */}
      {isRectangular && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-primary">Corner Radius</span>
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

      {/* Circle / Ellipse Radius Metadata */}
      {isCircular && (
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border shadow-2xs">
            <span className="font-medium text-text-muted">Radius X</span>
            <span className="font-mono font-normal text-text-primary">{Math.round((selectedObject.width || 0) / 2)}px</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border shadow-2xs">
            <span className="font-medium text-text-muted">Radius Y</span>
            <span className="font-mono font-normal text-text-primary">{Math.round((selectedObject.height || 0) / 2)}px</span>
          </div>
        </div>
      )}

      {/* Polygon / Star Metadata */}
      {isPolygonOrStar && (
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border shadow-2xs text-xs">
          <span className="font-medium text-text-muted">Geometry Type</span>
          <span className="font-normal text-accent uppercase tracking-wider">{shapeType}</span>
        </div>
      )}
    </div>
  );
};
