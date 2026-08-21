export type PdfAnnotationTool =
  | 'select'
  | 'pen'
  | 'marker'
  | 'highlighter'
  | 'laser'
  | 'eraser'
  | 'text';

export interface PdfDocumentData {
  id: string;
  name: string;
  arrayBuffer: ArrayBuffer;
  numPages: number;
  currentPage: number;
  // Map of 1-based page number to Fabric JSON objects string / stringified canvas data
  pageAnnotations: Record<number, string>;
  zoom?: number;
  isLocked?: boolean;
}

export interface DocumentModeState {
  isActive: boolean;
  pdfData: PdfDocumentData | null;
  currentPage: number;
  zoom: number; // e.g., 1 = 100%
  activeTool: PdfAnnotationTool;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface PdfPageRenderResult {
  dataUrl: string;
  width: number;
  height: number;
}
