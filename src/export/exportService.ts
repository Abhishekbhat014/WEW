import * as fabric from 'fabric';
import type { ExportFormat } from '../types/canvas';

const CUSTOM_EXPORT_PROPS = [
  'id',
  'name',
  'isGroup',
  'subTargetCheck',
  '_clipPathSvg',
  'layerId',
  'isRoughObject',
  'shapeType',
  'drawingStyle',
  'roughness',
  'bowing',
  'fillStyle',
  'hachureGap',
  'points',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'stroke',
  'strokeWidth',
  'strokeStyle',
  'edges',
  'fill',
  'opacity',
  'isConnector',
  'sourceNodeId',
  'targetNodeId',
  'direction',
  'sourceAnchor',
  'targetAnchor',
  'graphParents',
  'graphChildren',
  'graphArrows',
  'graphNeighbors',
  'isPdf',
  'currentPage',
  'numPages',
  'pdfFileSize',
  '_erasedCircles',
];

export interface ArtworkBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  exportableObjects: fabric.Object[];
}

/**
 * Check if a Fabric object is a valid, exportable artwork object
 */
function isExportableObject(obj: any): boolean {
  if (!obj) return false;
  if (obj.isHiddenGhost || obj.visible === false) return false;
  if (obj.isEraserBrush || obj.isSelectionOverlay || obj.isGhost || obj.isTemp || obj.isGuide) return false;
  if (obj.type === 'activeSelection' || obj instanceof fabric.ActiveSelection) return false;
  
  const id = obj.id || '';
  if (typeof id === 'string' && (id.startsWith('ghost_') || id.startsWith('temp_') || id.startsWith('preview_'))) {
    return false;
  }
  return true;
}

/**
 * Calculate the world-space bounding box of an object including transforms & stroke
 */
function getObjectWorldBounds(obj: any): { minX: number; minY: number; maxX: number; maxY: number } {
  if (obj.setCoords) {
    obj.setCoords();
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Use Fabric's absolute world coordinates (aCoords)
  if (obj.aCoords) {
    const coords = [obj.aCoords.tl, obj.aCoords.tr, obj.aCoords.br, obj.aCoords.bl];
    coords.forEach((pt) => {
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
    });
  }

  // Fallback to transformed left/top/width/height if aCoords is unavailable or invalid
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    const left = obj.left || 0;
    const top = obj.top || 0;
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;
    const width = (obj.width || 0) * scaleX;
    const height = (obj.height || 0) * scaleY;
    minX = left;
    minY = top;
    maxX = left + width;
    maxY = top + height;
  }

  // Account for stroke width expansion
  const strokePadding = ((obj.strokeWidth || 0) * Math.max(Math.abs(obj.scaleX || 1), Math.abs(obj.scaleY || 1))) / 2;
  minX -= strokePadding;
  minY -= strokePadding;
  maxX += strokePadding;
  maxY += strokePadding;

  // Account for points array if object has path points (e.g. curved lines / arrows)
  if (Array.isArray(obj.points)) {
    const left = obj.left || 0;
    const top = obj.top || 0;
    obj.points.forEach((pt: any) => {
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
        const px = left + pt.x * (obj.scaleX || 1);
        const py = top + pt.y * (obj.scaleY || 1);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      }
    });
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Calculate world-space bounds of all exportable artwork on the canvas + padding
 */
export function getArtworkBounds(fabricCanvas: fabric.Canvas): ArtworkBounds | null {
  if (!fabricCanvas) return null;

  const exportableObjects = fabricCanvas.getObjects().filter(isExportableObject);
  if (exportableObjects.length === 0) return null;

  let worldMinX = Infinity;
  let worldMinY = Infinity;
  let worldMaxX = -Infinity;
  let worldMaxY = -Infinity;

  exportableObjects.forEach((obj) => {
    const b = getObjectWorldBounds(obj);
    worldMinX = Math.min(worldMinX, b.minX);
    worldMinY = Math.min(worldMinY, b.minY);
    worldMaxX = Math.max(worldMaxX, b.maxX);
    worldMaxY = Math.max(worldMaxY, b.maxY);
  });

  if (!isFinite(worldMinX) || !isFinite(worldMinY) || !isFinite(worldMaxX) || !isFinite(worldMaxY)) {
    return null;
  }

  const EXPORT_PADDING = 40; // 40 world-pixels padding
  const left = Math.floor(worldMinX - EXPORT_PADDING);
  const top = Math.floor(worldMinY - EXPORT_PADDING);
  const width = Math.ceil((worldMaxX - worldMinX) + EXPORT_PADDING * 2);
  const height = Math.ceil((worldMaxY - worldMinY) + EXPORT_PADDING * 2);

  if (width <= 0 || height <= 0) return null;

  return { left, top, width, height, exportableObjects };
}

/**
 * Create an isolated offscreen Fabric canvas rendering context for export.
 * The live Fabric canvas is NEVER mutated or resized.
 */
async function createIsolatedExportCanvas(
  exportableObjects: fabric.Object[],
  bounds: { left: number; top: number; width: number; height: number },
  backgroundColor: string
): Promise<{ tempCanvas: fabric.Canvas; dispose: () => void }> {
  const tempEl = document.createElement('canvas');
  tempEl.width = bounds.width;
  tempEl.height = bounds.height;

  const tempCanvas = new fabric.Canvas(tempEl, {
    width: bounds.width,
    height: bounds.height,
    backgroundColor,
  });

  const clonedObjects = await Promise.all(
    exportableObjects.map((obj) =>
      obj.clone
        ? (obj.clone(CUSTOM_EXPORT_PROPS) as Promise<fabric.Object>)
        : Promise.resolve(null)
    )
  );

  clonedObjects.forEach((cloned) => {
    if (!cloned) return;
    cloned.left = (cloned.left || 0) - bounds.left;
    cloned.top = (cloned.top || 0) - bounds.top;
    cloned.setCoords?.();
    tempCanvas.add(cloned);
  });

  tempCanvas.renderAll();

  const dispose = () => {
    try {
      tempCanvas.dispose();
      tempEl.remove();
    } catch (e) {
      console.warn('Error disposing isolated export canvas:', e);
    }
  };

  return { tempCanvas, dispose };
}

/**
 * Normalize clean export filename without duplicate extension
 */
function cleanExportFilename(filename: string): string {
  const baseName = filename
    .trim()
    .replace(/\.(webdraw|json|png|jpg|jpeg|svg|pdf)$/i, '')
    .replace(/\s+/g, '-');
  return baseName || 'drawing';
}

export const exportService = {
  /**
   * Export the fabric canvas into selected format without mutating live canvas
   */
  async exportCanvas(
    fabricCanvas: fabric.Canvas,
    format: ExportFormat,
    filename: string = 'drawing'
  ): Promise<void> {
    if (!fabricCanvas) return;

    switch (format) {
      case 'png':
        await this.exportPNG(fabricCanvas, filename, false);
        break;
      case 'jpg':
        await this.exportJPG(fabricCanvas, filename);
        break;
      case 'transparent-png':
        await this.exportPNG(fabricCanvas, filename, true);
        break;
      case 'svg':
        await this.exportSVG(fabricCanvas, filename);
        break;
      case 'pdf':
        await this.exportPDF(fabricCanvas, filename);
        break;
    }
  },

  /**
   * Export as PNG (opaque background or transparent) using isolated offscreen canvas
   */
  async exportPNG(fabricCanvas: fabric.Canvas, filename: string, isTransparent: boolean): Promise<void> {
    const bounds = getArtworkBounds(fabricCanvas);
    if (!bounds) {
      alert('Nothing to export on canvas.');
      return;
    }

    const cleanName = cleanExportFilename(filename);
    const { tempCanvas, dispose } = await createIsolatedExportCanvas(
      bounds.exportableObjects,
      bounds,
      isTransparent ? 'transparent' : '#FFFFFF'
    );

    try {
      const dataUrl = tempCanvas.toDataURL({
        format: 'png',
        multiplier: 2,
      });

      const link = document.createElement('a');
      link.download = `${cleanName}${isTransparent ? '-transparent' : ''}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      dispose();
    }
  },

  /**
   * Export as JPG (opaque white background) using isolated offscreen canvas
   */
  async exportJPG(fabricCanvas: fabric.Canvas, filename: string): Promise<void> {
    const bounds = getArtworkBounds(fabricCanvas);
    if (!bounds) {
      alert('Nothing to export on canvas.');
      return;
    }

    const cleanName = cleanExportFilename(filename);
    const { tempCanvas, dispose } = await createIsolatedExportCanvas(
      bounds.exportableObjects,
      bounds,
      '#FFFFFF'
    );

    try {
      const dataUrl = tempCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.95,
        multiplier: 2,
      });

      const link = document.createElement('a');
      link.download = `${cleanName}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      dispose();
    }
  },

  /**
   * Export as SVG vector format using isolated offscreen canvas
   */
  async exportSVG(fabricCanvas: fabric.Canvas, filename: string): Promise<void> {
    const bounds = getArtworkBounds(fabricCanvas);
    if (!bounds) {
      alert('Nothing to export on canvas.');
      return;
    }

    const cleanName = cleanExportFilename(filename);
    const { tempCanvas, dispose } = await createIsolatedExportCanvas(
      bounds.exportableObjects,
      bounds,
      'transparent'
    );

    try {
      const svgData = tempCanvas.toSVG({
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        viewBox: {
          x: 0,
          y: 0,
          width: bounds.width,
          height: bounds.height,
        },
      });

      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `${cleanName}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      dispose();
    }
  },

  /**
   * Export as PDF document using jsPDF & isolated offscreen canvas
   */
  async exportPDF(fabricCanvas: fabric.Canvas, filename: string): Promise<void> {
    const bounds = getArtworkBounds(fabricCanvas);
    if (!bounds) {
      alert('Nothing to export on canvas.');
      return;
    }

    const cleanName = cleanExportFilename(filename);
    const { tempCanvas, dispose } = await createIsolatedExportCanvas(
      bounds.exportableObjects,
      bounds,
      '#FFFFFF'
    );

    try {
      const { default: jsPDF } = await import('jspdf');

      const dataUrl = tempCanvas.toDataURL({
        format: 'png',
        multiplier: 2,
      });

      const width = bounds.width;
      const height = bounds.height;
      const orientation = width > height ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`${cleanName}.pdf`);
    } finally {
      dispose();
    }
  },
};
