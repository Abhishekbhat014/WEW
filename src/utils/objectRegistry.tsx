import React from 'react';
import {
  Folder,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  Minus,
  PenTool,
  Pencil,
  MousePointer2,
  FileText,
  HelpCircle,
  Zap
} from 'lucide-react';

export interface RegistryEntry {
  shapeType: string;
  label: string;
  icon: React.ReactNode;
}

export const objectRegistry: Record<string, RegistryEntry> = {
  group: { shapeType: 'group', label: 'Group', icon: <Folder className="w-3.5 h-3.5 text-indigo-400" /> },
  image: { shapeType: 'image', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> },
  text: { shapeType: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5 text-amber-400" /> },
  pdf: { shapeType: 'pdf', label: 'PDF Document', icon: <FileText className="w-3.5 h-3.5 text-red-400" /> },
  rectangle: { shapeType: 'rectangle', label: 'Rectangle', icon: <Square className="w-3.5 h-3.5 text-indigo-400" /> },
  'rounded-rect': { shapeType: 'rounded-rect', label: 'Rounded Rect', icon: <Square className="w-3.5 h-3.5 text-indigo-400" /> },
  square: { shapeType: 'square', label: 'Square', icon: <Square className="w-3.5 h-3.5 text-indigo-400" /> },
  circle: { shapeType: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5 text-indigo-400" /> },
  ellipse: { shapeType: 'ellipse', label: 'Ellipse', icon: <Circle className="w-3.5 h-3.5 text-indigo-400" /> },
  triangle: { shapeType: 'triangle', label: 'Triangle', icon: <Triangle className="w-3.5 h-3.5 text-indigo-400" /> },
  diamond: { shapeType: 'diamond', label: 'Diamond', icon: <Diamond className="w-3.5 h-3.5 text-indigo-400" /> },
  arrow: { shapeType: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-3.5 h-3.5 text-indigo-400" /> },
  line: { shapeType: 'line', label: 'Line', icon: <Minus className="w-3.5 h-3.5 text-indigo-400" /> },
  polygon: { shapeType: 'polygon', label: 'Polygon', icon: <MousePointer2 className="w-3.5 h-3.5 text-indigo-400" /> },
  star: { shapeType: 'star', label: 'Star', icon: <MousePointer2 className="w-3.5 h-3.5 text-indigo-400" /> },
  pencil: { shapeType: 'pencil', label: 'Pencil', icon: <Pencil className="w-3.5 h-3.5 text-indigo-400" /> },
  pen: { shapeType: 'pen', label: 'Pen', icon: <PenTool className="w-3.5 h-3.5 text-indigo-400" /> },
  marker: { shapeType: 'marker', label: 'Marker', icon: <PenTool className="w-3.5 h-3.5 text-amber-500" /> },
  laser: { shapeType: 'laser', label: 'Laser Pointer', icon: <Zap className="w-3.5 h-3.5 text-red-500" /> },
  eraser: { shapeType: 'eraser', label: 'Eraser Mask', icon: <Square className="w-3.5 h-3.5 text-neutral-200" /> },
};

/**
 * Validates the object's logical metadata and returns the validated registry info.
 * Fallbacks to an "Unknown Object" if the type is invalid or missing, and emits a dev warning.
 */
export function getValidatedObjectInfo(obj: any): RegistryEntry & { displayName: string } {
  let shapeType = obj.shapeType;

  // Fallback heuristics just in case something slipped through the crack during migration
  // but strictly, shapeType should be required on everything.
  if (!shapeType) {
    if (obj.isPdf) shapeType = 'pdf';
    else if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') shapeType = 'text';
    else if (obj.type === 'image') shapeType = 'image';
    else if (obj.type === 'path' && obj.isEraserMask) shapeType = 'eraser';
    else if (obj.type === 'group' && obj.isGroup) shapeType = 'group';
    else shapeType = obj.type;
  }

  const entry = objectRegistry[shapeType];

  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[Registry Validation] Unknown canvas object shapeType encountered: "${shapeType}". Object ID: ${obj.id}`);
    }
    return {
      shapeType: shapeType || 'unknown',
      label: 'Unknown Object',
      icon: <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />,
      displayName: obj.name || 'Unknown Object',
    };
  }

  return {
    ...entry,
    displayName: obj.name || entry.label,
  };
}
