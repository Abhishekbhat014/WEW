import type { ToolType, GridConfig, Layer, ObjectProperties, DrawingStyle, FillStyle, StrokeStyle, EdgesType } from '../types/canvas';
import type { PdfDocumentData } from '../types/pdf';
import type { ColorSource } from '../utils/themeColors';

export interface CanvasState {
  activeTool: ToolType;
  fillColor: string;
  strokeColor: string;
  strokeColorSource: ColorSource;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  linethrough: boolean;
  textAlign: string;
  letterSpacing: number;
  lineHeight: number;
  textBgColor: string;
  isDrawToShapeMode: boolean;
  
  drawingStyle: DrawingStyle;
  roughness: number;
  bowing: number;
  fillStyle: FillStyle;
  hachureGap: number;
  strokeStyle: StrokeStyle;
  edges: EdgesType;

  eraserRadius: number;
  eraserPressure: number;

  grid: GridConfig;
  zoom: number;
  panX: number;
  panY: number;
  cursorPos: { x: number; y: number };
  canvasSize: { width: number; height: number };

  layers: Layer[];
  activeLayerId: string;
  
  selectedObject: ObjectProperties | null;
  selectedCount: number;

  documentMode: {
    isActive: boolean;
    pdfData: PdfDocumentData | null;
  };

  projectName: string;
  projectId: string | null;
  lastSavedAt: string | null;
  
  canUndo: boolean;
  canRedo: boolean;

  isZenMode: boolean;
  isFullscreen: boolean;
  isToolLocked: boolean;
}

export const DEFAULT_INITIAL_STATE: CanvasState = {
  activeTool: 'select',
  isToolLocked: false,
  fillColor: 'transparent',
  strokeColor: '#1E293B', // Slate 800
  strokeColorSource: 'theme-default',
  strokeWidth: 1,
  opacity: 1,
  fontSize: 20,
  fontFamily: 'Caveat, cursive',
  fontWeight: '400',
  fontStyle: 'normal',
  underline: false,
  linethrough: false,
  textAlign: 'left',
  letterSpacing: 0,
  lineHeight: 1.2,
  textBgColor: 'transparent',
  isDrawToShapeMode: false,

  drawingStyle: 'precise',
  roughness: 0,
  bowing: 0,
  fillStyle: 'solid',
  hachureGap: 5,
  strokeStyle: 'solid',
  edges: 'rounded',
  
  eraserRadius: 20,
  eraserPressure: 100,

  grid: {
    enabled: true,
    snapToGrid: false,
    size: 20,
    color: '',
    type: 'graph',
  },
  zoom: 1,
  panX: 0,
  panY: 0,
  cursorPos: { x: 0, y: 0 },
  canvasSize: { width: window.innerWidth, height: window.innerHeight },

  layers: [
    {
      id: 'layer-default',
      name: 'Layer 1',
      visible: true,
      locked: false,
      zIndex: 0,
    },
  ],
  activeLayerId: 'layer-default',

  selectedObject: null,
  selectedCount: 0,

  documentMode: {
    isActive: false,
    pdfData: null,
  },

  projectName: 'Untitled Project',
  projectId: null,
  lastSavedAt: null,

  canUndo: false,
  canRedo: false,

  isZenMode: false,
  isFullscreen: false,
};
