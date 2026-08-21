export type ToolType =
  | 'select'
  | 'pencil'
  | 'pen'
  | 'marker'
  | 'laser'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'rounded-rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  | 'star'
  | 'diamond'
  | 'text'
  | 'image'
  | 'bucket';

export interface Point {
  x: number;
  y: number;
}

export interface GridConfig {
  enabled: boolean;
  snapToGrid: boolean;
  size: number;
  color: string;
  type?: 'dots' | 'lines' | 'graph' | 'blank';
}

export interface CanvasTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export type DrawingStyle = 'sketch' | 'precise' | 'marker' | 'pencil' | 'ink';

export type FillStyle =
  | 'hachure'
  | 'solid'
  | 'zigzag'
  | 'cross-hatch'
  | 'dots'
  | 'dashed';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type EdgesType = 'sharp' | 'rounded';

export type DiagramDirection = 'up' | 'down' | 'left' | 'right';
export type AnchorSide = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface GraphNeighbor {
  direction: DiagramDirection;
  targetNodeId: string;
  arrowId: string;
  isChild: boolean;
}

export interface ObjectProperties {
  id: string;
  type: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  angle: number;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  layerId: string;
  locked: boolean;
  visible: boolean;
  selectable?: boolean;
  drawingStyle?: DrawingStyle;
  roughness?: number;
  bowing?: number;
  fillStyle?: FillStyle;
  hachureGap?: number;
  shapeType?: string;
  strokeStyle?: StrokeStyle;
  edges?: EdgesType;
  isPdf?: boolean;
  currentPage?: number;
  numPages?: number;
  pdfFileSize?: number;
  rx?: number;
  ry?: number;
  // Graph & Smart Connector properties
  isConnector?: boolean;
  sourceNodeId?: string;
  targetNodeId?: string;
  direction?: DiagramDirection;
  sourceAnchor?: AnchorSide;
  targetAnchor?: AnchorSide;
  graphParents?: string[];
  graphChildren?: string[];
  graphArrows?: string[];
  graphNeighbors?: GraphNeighbor[];
  // Group properties
  isGroup?: boolean;
  groupId?: string;
  name?: string;
  _objects?: any[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'transparent-png' | 'pdf';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface ProjectFile {
  metadata: ProjectMetadata;
  grid: GridConfig;
  layers: Layer[];
  canvasData: string;
}
