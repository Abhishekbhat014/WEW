import { useCanvasContext } from '../store/CanvasContext';
import type { DrawingStyle, FillStyle, StrokeStyle, EdgesType } from '../types/canvas';

export interface InspectorObjectCallbacks {
  onUpdateProperties?: (props: Record<string, any>) => void;
  onUpdateGeometry?: (props: { width?: number; height?: number; left?: number; top?: number; angle?: number }) => void;
  onUpdateCornerRadius?: (rx: number, ry: number) => void;
}

/**
 * Custom hook for inspector sections.
 * 
 * KEY DESIGN: When a shape is selected, this hook reads property values
 * from `selectedObject` (which reflects the actual canvas object's state).
 * When nothing is selected, it falls back to the global context tool defaults.
 * 
 * When updating a property, it:
 * 1. Updates the global CanvasContext state (for new shape tool defaults)
 * 2. Directly calls onUpdateProperties to instantly mutate the active canvas object
 */
export function useInspectorObject(callbacks?: InspectorObjectCallbacks) {
  const context = useCanvasContext();
  const sel = context.selectedObject;

  // Derive display values: prefer selected object's actual properties, fall back to global context
  const isPen = (sel as any)?.shapeType === 'pen';
  const rawStroke = sel?.stroke;
  const validStroke = rawStroke && rawStroke !== 'transparent' ? rawStroke : undefined;
  const strokeColor = isPen ? (sel?.fill ?? context.strokeColor) : (validStroke ?? sel?.fill ?? context.strokeColor);
  const fillColor = sel?.fill ?? context.fillColor;
  const strokeWidth = sel?.strokeWidth ?? context.strokeWidth;
  const opacity = sel?.opacity ?? context.opacity;
  const drawingStyle = sel?.drawingStyle ?? context.drawingStyle;
  const roughness = sel?.roughness ?? context.roughness;
  const bowing = sel?.bowing ?? context.bowing;
  const fillStyle = sel?.fillStyle ?? context.fillStyle;
  const hachureGap = sel?.hachureGap ?? context.hachureGap;
  const strokeStyle = sel?.strokeStyle ?? context.strokeStyle;
  const edges = sel?.edges ?? context.edges;

  const updateProperty = (key: string, value: any) => {
    // 1. Immediately update the active Canvas object via direct callback
    // This MUST happen FIRST so the canvas updates before React re-renders
    if (callbacks?.onUpdateProperties) {
      if (key === 'drawingStyle') {
        let roughness = 0;
        let bowing = 0;

        switch (value) {
          case 'sketch':
            roughness = 1.8;
            bowing = 1.5;
            break;
          case 'precise':
            roughness = 0;
            bowing = 0;
            break;
          case 'marker':
            roughness = 0.6;
            bowing = 0.5;
            break;
          default:
            roughness = 0;
            bowing = 0;
        }

        callbacks.onUpdateProperties({ drawingStyle: value, roughness, bowing });
      } else if (key === 'stroke' || key === 'strokeColor') {
        callbacks.onUpdateProperties({ stroke: value, strokeColor: value });
      } else if (key === 'fill' || key === 'fillColor') {
        callbacks.onUpdateProperties({ fill: value, fillColor: value });
      } else {
        callbacks.onUpdateProperties({ [key]: value });
      }
    }

    // 2. Update global CanvasContext defaults for future shapes
    switch (key) {
      case 'stroke':
      case 'strokeColor':
        context.setStrokeColor(value);
        break;
      case 'fill':
      case 'fillColor':
        context.setFillColor(value);
        break;
      case 'strokeWidth':
        context.setStrokeWidth(value);
        break;
      case 'opacity':
        context.setOpacity(value);
        break;
      case 'drawingStyle':
        context.setDrawingStyle(value as DrawingStyle);
        break;
      case 'roughness':
        context.setRoughness(value);
        break;
      case 'bowing':
        context.setBowing(value);
        break;
      case 'fillStyle':
        context.setFillStyle(value as FillStyle);
        break;
      case 'hachureGap':
        context.setHachureGap(value);
        break;
      case 'strokeStyle':
        context.setStrokeStyle(value as StrokeStyle);
        break;
      case 'edges':
        context.setEdges(value as EdgesType);
        break;
    }
  };

  const updateCornerRadius = (radius: number) => {
    if (callbacks?.onUpdateCornerRadius) {
      callbacks.onUpdateCornerRadius(radius, radius);
    }
  };

  const updateGeometry = (props: { width?: number; height?: number; left?: number; top?: number; angle?: number }) => {
    if (callbacks?.onUpdateGeometry) {
      callbacks.onUpdateGeometry(props);
    }
  };

  return {
    // Pass through full context for anything else sections may need
    selectedObject: context.selectedObject,
    selectedCount: context.selectedCount,
    activeTool: context.activeTool,
    // Derived display values (selected object overrides global defaults)
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    drawingStyle,
    roughness,
    bowing,
    fillStyle,
    hachureGap,
    strokeStyle,
    edges,
    // Mutators
    updateProperty,
    updateCornerRadius,
    updateGeometry,
  };
}
