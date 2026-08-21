import React from 'react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { SliderControl } from '../../ui/inspector/SliderControl';
import { InspectorDropdown } from '../../ui/inspector/InspectorDropdown';
import { HighlightText } from '../../ui/inspector/HighlightText';
import type { DrawingStyle, FillStyle, EdgesType } from '../../../types/canvas';

import { useCanvasContext } from '../../../store/CanvasContext';

interface SketchSectionProps extends InspectorObjectCallbacks {
  searchQuery?: string;
}

export const SketchSection: React.FC<SketchSectionProps> = ({ searchQuery = '', ...callbacks }) => {
  const { activeTool } = useCanvasContext();
  const {
    fillColor,
    drawingStyle,
    fillStyle,
    hachureGap,
    edges,
    updateProperty,
    selectedObject,
  } = useInspectorObject(callbacks);

  const isLinearOrPathToolOrObject = (tool: string, obj: any): boolean => {
    const linearTools = ['line', 'arrow', 'pencil', 'marker', 'pen'];
    if (!obj) return linearTools.includes(tool);
    const shapeType = obj.shapeType || obj.type;
    return (
      linearTools.includes(shapeType) ||
      shapeType === 'freehand' ||
      shapeType === 'path' ||
      !!obj.isMarker ||
      linearTools.includes(tool)
    );
  };

  const showEdges = !isLinearOrPathToolOrObject(activeTool, selectedObject);
  const hasVisibleFill = !!fillColor && fillColor !== 'transparent' && fillColor !== 'none';

  const drawingStyles: { id: DrawingStyle; label: string }[] = [
    { id: 'sketch', label: 'Sketch' },
    { id: 'pencil', label: 'Pencil' },
    { id: 'marker', label: 'Marker' },
    { id: 'ink', label: 'Ink' },
    { id: 'precise', label: 'Precise' },
  ];

  const fillPatterns: { id: FillStyle; label: string }[] = [
    { id: 'hachure', label: 'Hachure' },
    { id: 'solid', label: 'Solid' },
    { id: 'zigzag', label: 'Zigzag' },
    { id: 'cross-hatch', label: 'Cross Hatch' },
    { id: 'dots', label: 'Dots' },
    { id: 'dashed', label: 'Dashed' },
  ];

  const edgeTypes: { id: EdgesType; label: string }[] = [
    { id: 'rounded', label: 'Rounded' },
    { id: 'sharp', label: 'Sharp' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Top-level Drawing Style */}
      <InspectorDropdown
        label={<HighlightText text="Drawing Style" query={searchQuery} />}
        value={drawingStyle}
        options={drawingStyles}
        onChange={(v) => updateProperty('drawingStyle', v as DrawingStyle)}
      />

      {/* Fill Pattern (only shown when fill color is active) */}
      {hasVisibleFill && (
        <InspectorDropdown
          label={<HighlightText text="Fill Pattern" query={searchQuery} />}
          value={fillStyle}
          options={fillPatterns}
          onChange={(v) => updateProperty('fillStyle', v as FillStyle)}
        />
      )}

      {/* Hachure Gap */}
      {hasVisibleFill && fillStyle !== 'solid' && (
        <SliderControl
          label={<HighlightText text="Hachure Gap" query={searchQuery} />}
          value={hachureGap}
          min={1}
          max={20}
          unit="px"
          onChange={(val) => updateProperty('hachureGap', val)}
        />
      )}

      {/* Edges */}
      {showEdges && (
        <InspectorDropdown
          label={<HighlightText text="Edges" query={searchQuery} />}
          value={edges}
          options={edgeTypes}
          onChange={(v) => updateProperty('edges', v as EdgesType)}
        />
      )}
    </div>
  );
};
