import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useCanvasContext } from '../../store/CanvasContext';
import { useTheme } from '../../hooks/useTheme';
import {
  createStarPointsRelative,
  createPolygonPointsRelative,
  createDiamondPointsRelative,
  snapPointToGrid,
  snapAngle45,
  getClosestPointOnCatmullPath,
} from '../../utils/geometry';
import { getToolCursor, getGrabCursor, getGrabbingCursor } from '../../utils/cursors';
import { SpeedPenBrush } from '../../utils/SpeedPenBrush';
import { HighlighterBrush } from '../../utils/HighlighterBrush';
import { registerPdf, unregisterPdf, renderPdfPageToCanvas, getPdfArrayBuffer, pdfDiagnostics, arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/pdfDocumentManager';
import type { ToolType, DrawingStyle, FillStyle, StrokeStyle, EdgesType } from '../../types/canvas';
import { createRoughShape, updateRoughObject, updateRoughObjectInPlace, finalizeShapeRendering } from '../../utils/roughRenderer';
import { isTextObject, getLegacyColorSource, getDefaultColorForTheme } from '../../utils/themeColors';
import { recognizeShapeFromStroke, type Point, type RecognitionResult } from '../../utils/shapeRecognizer';
import { GridLayer } from './layers/GridLayer';
import type { GridOverlayRef } from './GridOverlay';
import { SelectionLayer } from './layers/SelectionLayer';
import { InteractionLayer, type HoverRect } from './layers/InteractionLayer';
import { GuideLayer, type GuideLine } from './layers/GuideLayer';
import { EffectsLayer } from './layers/EffectsLayer';
import { isErasableObject } from '../../utils/eraserSplitter';
import { useEraserEngine, rebuildEraseMasks, ERASER_CUSTOM_PROPS, cleanupEraserResources } from '../../hooks/useEraserEngine';
import {
  handleKeyboardGraphGrowth,
  getSubtreeData,
  updateConnectorGeometry,
  cleanupGraphOnDelete,
  tryAutoConnectArrow,
  isGraphNode,
  isGraphConnector,
  buildGraphObjectMap,
} from '../../utils/diagramGraph';
import { BlankCanvasOverlay } from './BlankCanvasOverlay';
import { usePinchZoom } from '../../hooks/usePinchZoom';

import { canvasReviver, serializeCanvas } from '../../utils/canvasPersistence';

export interface DrawingCanvasRef {
  getFabricCanvas: () => fabric.Canvas | null;
  undo: () => void;
  redo: () => void;
  importImage: (file: File) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => void;
  cloneShapeWithArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
  nudgeSelected: (dx: number, dy: number) => void;
  clearSelection: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  selectAll: () => void;
  loadProjectJSON: (jsonString: string) => void;
  getProjectJSON: () => string;
  updateGeometry: (props: { width?: number; height?: number; left?: number; top?: number; angle?: number }) => void;
  updateCornerRadius: (rx: number, ry: number) => void;
  flipSelected: (direction: 'horizontal' | 'vertical') => void;
  resetRotation: () => void;
  toggleLockSelected: () => void;
  toggleHideSelected: () => void;
  alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (direction: 'horizontal' | 'vertical') => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  updateObjectProperties: (props: Record<string, any>) => void;
  getLayerObjectCount: (layerId: string) => number;
  deleteLayerObjects: (layerId: string) => void;
  getCanvasObjects: () => any[];
  moveCanvasObject: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after' | 'layer', targetLayerId?: string) => void;
  selectCanvasObject: (id: string) => void;
  importPdf: (file: File) => Promise<void>;
  openPdfDocumentMode: () => void;
  setPdfPage: (page: number) => void;
  editTextObject: () => void;
  clearCanvas: () => void;
}

// Development Memory Diagnostics
if (import.meta.env.DEV) {
  (window as any).getMemoryDiagnostics = () => {
    // Collect stats dynamically if possible, or refer to globals
    // Some stats are fetched from pdfDiagnostics
    return {
      activePdfDocuments: pdfDiagnostics.activePdfDocuments,
      cachedPdfCanvasCount: pdfDiagnostics.cachedPdfCanvasCount,
      cachedPdfCanvasBytes: pdfDiagnostics.cachedPdfCanvasBytes,
      activePdfRenderTasks: pdfDiagnostics.activePdfRenderTasks,
      activePdfPreloads: pdfDiagnostics.activePdfPreloads,
      pendingPdfRegistrations: pdfDiagnostics.pendingPdfRegistrations,
      pdfLifecycleGenerations: pdfDiagnostics.pdfLifecycleGenerations,
      historySnapshotCount: (window as any)._weWHistoryCount || 0,
      historySerializedBytes: (window as any)._weWHistoryBytes || 0,
      eraserMaskObjectCount: (window as any)._weWEraserMaskCount || 0,
      eraserMaskBytes: (window as any)._weWEraserMaskBytes || 0,
      drawingCanvasLifecycleGeneration: (window as any)._weWCanvasGen || 0,
      activeDrawingCanvasTimers: (window as any)._weWCanvasTimers || 0,
    };
  };
}

interface DrawingCanvasProps {
  onCanvasReady?: (ref: DrawingCanvasRef) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCanvasReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  const drawingSessionRef = useRef<{
    active: boolean;
    pointerId: number | null;
    tool: ToolType | null;
    startPoint: { x: number; y: number } | null;
    tempShape: fabric.Object | null;
    lastProps: any | null;
  }>({
    active: false,
    pointerId: null,
    tool: null,
    startPoint: null,
    tempShape: null,
    lastProps: null,
  });
  const capturedElementRef = useRef<HTMLElement | null>(null);
  const isSpacePressedRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const lastPanPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isStateRestoringRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const pdfRenderControllersRef = useRef<Map<string, AbortController>>(new Map());
  const canvasLifecycleRef = useRef<number>(0);
  const timeoutIdsRef = useRef<Set<number>>(new Set());

  if (import.meta.env.DEV) {
    (window as any)._weWCanvasGen = canvasLifecycleRef.current;
    (window as any)._weWCanvasTimers = timeoutIdsRef.current.size;
  }

  // Refs for current settings so path:created and event handlers don't need re-initializing canvas
  const activeToolRef = useRef<ToolType>('select');
  const strokeColorRef = useRef<string>('#1E293B');
  const strokeWidthRef = useRef<number>(2);
  const strokeColorSourceRef = useRef<'theme-default' | 'custom'>('theme-default');
  const fillColorRef = useRef<string>('transparent');
  const activeLayerIdRef = useRef<string>('layer-default');
  const drawingStyleRef = useRef<DrawingStyle>('precise');
  const roughnessRef = useRef<number>(0);
  const bowingRef = useRef<number>(0);
  const fillStyleRef = useRef<FillStyle>('solid');
  const hachureGapRef = useRef<number>(5);
  const strokeStyleRef = useRef<StrokeStyle>('solid');
  const edgesRef = useRef<EdgesType>('rounded');
  const opacityRef = useRef<number>(1);

  // Right-click hold eraser refs
  const isRightClickEraserRef = useRef<boolean>(false);
  const isSyncingSelectionRef = useRef<boolean>(false);
  const isToolLockedRef = useRef<boolean>(false);
  const isTextEditingRef = useRef<boolean>(false);

  // Path Edit Mode refs
  const editingPathObjRef = useRef<fabric.Object | null>(null);
  const selectedPointIndexRef = useRef<number | null>(null);
  const hoverInsertionPointRef = useRef<{ point: { x: number; y: number }; segmentIndex: number } | null>(null);
  const isDraggingPointRef = useRef<boolean>(false);
  const dragStartStateRef = useRef<{ left: number; top: number; width: number; height: number; points: { x: number; y: number }[] } | null>(null);

  const {
    activeTool,
    setActiveTool,
    isToolLocked,
    fillColor,
    strokeColor,
    strokeColorSource,
    strokeWidth,
    opacity,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    linethrough,
    textAlign,
    letterSpacing,
    lineHeight,
    isDrawToShapeMode,
    drawingStyle,
    roughness,
    bowing,
    fillStyle,
    hachureGap,
    strokeStyle,
    edges,
    eraserRadius,
    eraserPressure,
    canvasSize,
    grid,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    setCursorPos,
    setCanvasSize,
    setSelectedObject,
    setSelectedCount,
    setHistoryStatus,
    setStrokeColor,
    setFontSize,
    setFontFamily,
    setFontWeight,
    setFontStyle,
    setUnderline,
    setLinethrough,
    setTextAlign,
    setLetterSpacing,
    setLineHeight,
    setTextBgColor,
    activeLayerId,
    layers,
    setLayers,
    setActiveLayerId,
    openDocumentMode,
    setIsRightClickErasing,
  } = useCanvasContext();


  const gridOverlayRef = useRef<GridOverlayRef>(null);

  const commitViewportToReact = useCallback((vpt: [number, number, number, number, number, number]) => {
    setZoom(vpt[0]);
    setPan(vpt[4], vpt[5]);
    gridOverlayRef.current?.updateViewport(vpt[0], vpt[4], vpt[5]);
    const fc = fabricCanvasRef.current;
    if (fc) {
      const activeObj = fc.getActiveObject();
      if (activeObj) activeObj.setCoords();
      fc.getActiveObjects().forEach((o) => o.setCoords());
    }
    window.dispatchEvent(new CustomEvent('app:pan-changed', { detail: { x: Math.round(vpt[4]), y: Math.round(vpt[5]) } }));
  }, [setZoom, setPan]);

  const hiddenSelectionStateRef = useRef<{ obj: fabric.Object; hasControls: boolean; hasBorders: boolean }[]>([]);

  const hideSelectionVisuals = useCallback((fc: fabric.Canvas) => {
    const activeObjects = fc.getActiveObjects();
    if (activeObjects.length === 0) return;

    hiddenSelectionStateRef.current = activeObjects.map((obj) => ({
      obj,
      hasControls: obj.hasControls ?? true,
      hasBorders: obj.hasBorders ?? true,
    }));

    activeObjects.forEach((obj) => {
      obj.set({ hasControls: false, hasBorders: false });
    });

    const activeGroup = fc.getActiveObject();
    if (activeGroup && activeGroup.type === 'activeSelection') {
      activeGroup.set({ hasControls: false, hasBorders: false });
    }

    fc.requestRenderAll();
  }, []);

  const restoreSelectionVisuals = useCallback((fc: fabric.Canvas) => {
    const activeObjects = fc.getActiveObjects();
    const activeGroup = fc.getActiveObject();

    if (hiddenSelectionStateRef.current.length > 0) {
      hiddenSelectionStateRef.current.forEach(({ obj, hasControls, hasBorders }) => {
        obj.set({ hasControls, hasBorders });
        obj.setCoords();
      });
      hiddenSelectionStateRef.current = [];
    }

    activeObjects.forEach((obj) => {
      obj.setCoords();
    });

    if (activeGroup) {
      if (activeGroup.type === 'activeSelection') {
        activeGroup.set({ hasControls: true, hasBorders: true });
      }
      activeGroup.setCoords();
    }

    fc.requestRenderAll();
  }, []);

  const getProjectJSON = useCallback((): string => {
    const fc = fabricCanvasRef.current;
    if (!fc) return '';
    return JSON.stringify(serializeCanvas(fc));
  }, []);



  // Controls the startup loading veil that prevents the blank canvas flash.
  const [isCanvasReady, setIsCanvasReady] = useState<boolean>(false);

  const { resolvedTheme } = useTheme();

  const isDrawToShapeModeRef = useRef<boolean>(isDrawToShapeMode);
  const clipboardRef = useRef<fabric.Object | null>(null);
  const [shapeSuggestion, setShapeSuggestion] = useState<{
    path: fabric.Path;
    recognition: RecognitionResult;
  } | null>(null);

  const [hoverRect, setHoverRect] = useState<HoverRect | null>(null);
  const [guideLines, _setGuideLines] = useState<GuideLine[]>([]);
  const [rotationBadge, setRotationBadge] = useState<{
    angle: number | null;
    position: { x: number; y: number } | null;
  }>({ angle: null, position: null });

  const eraserRadiusRef = useRef<number>(eraserRadius);
  const eraserPressureRef = useRef<number>(eraserPressure);
  const [cursorScreenPos, setCursorScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isRightClickEraserState, setIsRightClickEraserState] = useState(false);

  const eraserRingRef = useRef<HTMLDivElement>(null);

  // Smooth panning engine state
  const panAnimRef = useRef<{
    targetX: number;
    targetY: number;
    rafId: number | null;
  } | null>(null);

  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const subtreeDragStateRef = useRef<{
    rootId: string;
    initialRootPos: { left: number; top: number };
    descendantObjects: Map<string, fabric.Object>;
    connectorObjects: Map<string, fabric.Object>;
    descendantInitialPositions: Map<string, { left: number; top: number }>;
    connectorInitialPositions: Map<string, { left: number; top: number }>;
    affectedConnectorIds: Set<string>;
    objectMap?: Map<string, fabric.Object>;
  } | null>(null);

  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Sync state settings to refs on render
  useEffect(() => {
    activeToolRef.current = activeTool;
    strokeColorRef.current = strokeColor;
    strokeColorSourceRef.current = strokeColorSource;
    strokeWidthRef.current = strokeWidth;
    fillColorRef.current = fillColor;
    opacityRef.current = opacity;
    activeLayerIdRef.current = activeLayerId;
    drawingStyleRef.current = drawingStyle;
    roughnessRef.current = roughness;
    bowingRef.current = bowing;
    fillStyleRef.current = fillStyle;
    hachureGapRef.current = hachureGap;
    strokeStyleRef.current = strokeStyle;
    edgesRef.current = edges;
    isDrawToShapeModeRef.current = isDrawToShapeMode;
    eraserRadiusRef.current = eraserRadius;
    eraserPressureRef.current = eraserPressure;
    isToolLockedRef.current = isToolLocked;
  }, [
    activeTool,
    isToolLocked,
    strokeColor,
    strokeColorSource,
    strokeWidth,
    fillColor,
    opacity,
    activeLayerId,
    drawingStyle,
    roughness,
    bowing,
    fillStyle,
    hachureGap,
    strokeStyle,
    edges,
    isDrawToShapeMode,
    eraserRadius,
    eraserPressure,
  ]);

  // Re-render Fabric canvas when theme changes and synchronize theme-default colors
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (fc) {
      const objects = fc.getObjects();
      let hasMutated = false;

      objects.forEach((obj: any) => {
        // One-time legacy migration
        if (obj.colorSource == null) {
          let colorToCheck = obj.stroke;
          if (isTextObject(obj)) {
            colorToCheck = obj.fill;
          }
          obj.colorSource = getLegacyColorSource(colorToCheck);
        }

        if (obj.colorSource === 'theme-default') {
          const newColor = getDefaultColorForTheme(resolvedTheme);
          if (isTextObject(obj)) {
            obj.set('fill', newColor);
            hasMutated = true;
          } else if (obj.isRoughObject) {
            updateRoughObject(fc, obj as fabric.Object, { stroke: newColor, strokeColor: newColor });
            hasMutated = true;
          } else {
            obj.set('stroke', newColor);
            hasMutated = true;
          }
        }
      });

      if (hasMutated) {
        fc.requestRenderAll();
        // Do not call saveHistoryState() to prevent creating undo/redo entries on theme switch
      } else {
        fc.requestRenderAll();
      }
    }
  }, [resolvedTheme]);
  const saveHistoryState = useCallback(() => {
    if (!fabricCanvasRef.current || isStateRestoringRef.current) return;
    const json = JSON.stringify(serializeCanvas(fabricCanvasRef.current));

    if (
      historyIndexRef.current >= 0 &&
      historyIndexRef.current < historyRef.current.length &&
      json === historyRef.current[historyIndexRef.current]
    ) {
      return; // Skip identical states
    }

    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    historyRef.current.push(json);
    const MAX_HISTORY_STEPS = 25;
    if (historyRef.current.length > MAX_HISTORY_STEPS) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_HISTORY_STEPS);
    }
    historyIndexRef.current = historyRef.current.length - 1;

    if (import.meta.env.DEV) {
      (window as any)._weWHistoryCount = historyRef.current.length;
      (window as any)._weWHistoryBytes = historyRef.current.reduce((acc, str) => acc + str.length * 2, 0);
    }

    setHistoryStatus(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    
    // Dispatch event so external components like LayersPanel can refresh
    window.dispatchEvent(new CustomEvent('app:canvas-changed'));


  }, [setHistoryStatus]);

  const restoreHistoryState = useCallback((index: number) => {
    const fc = fabricCanvasRef.current;
    if (!fc || index < 0 || index >= historyRef.current.length) return;

    // Capture pre-restoration PDF object states
    isStateRestoringRef.current = true;
    historyIndexRef.current = index;

    // IMPORTANT: Safely release runtime eraser resources BEFORE replacing the active canvas state.
    // We do NOT mutate the serialized history representation, but we must free the backing memory
    // of the currently mounted objects that are about to be garbage collected by loadFromJSON.    fc.getObjects().forEach(cleanupEraserResources);
    setHoverRect(null);

    fc.loadFromJSON(historyRef.current[index], canvasReviver).then(() => {
      const objects = fc.getObjects();
      let activePdfInfo: { currentPage: number; numPages: number; isLocked: boolean } | null = null;

      objects.forEach((obj: any) => {
        if (obj.isPdf) {
          const isDocumentLocked = !!(obj.isPdfLocked || !obj.selectable);
          
          if (isDocumentLocked) {
            obj.set({
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              lockRotation: true,
            });
          }

          activePdfInfo = {
            currentPage: obj.currentPage || 1,
            numPages: obj.numPages || 1,
            isLocked: isDocumentLocked
          };
        } else if (obj.isRoughObject && (obj.shapeType === 'line' || obj.shapeType === 'arrow')) {
          // Migration for legacy lines/arrows without worldPoints
          if (!obj.worldPoints) {
            const pts = obj.points || [
              { x: obj.x1 ?? 0, y: obj.y1 ?? 0 },
              { x: obj.x2 ?? (obj.width || 0), y: obj.y2 ?? (obj.height || 0) },
            ];
            const oldT = obj.calcTransformMatrix();
            obj.worldPoints = pts.map((p: any) => fabric.util.transformPoint(p, oldT));
          }
        } else if (obj.isMarker) {
          if (obj.stroke && typeof obj.stroke === 'string' && obj.stroke.startsWith('rgba')) {
            const rgbaMatch = obj.stroke.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbaMatch) {
              const r = parseInt(rgbaMatch[1], 10);
              const g = parseInt(rgbaMatch[2], 10);
              const b = parseInt(rgbaMatch[3], 10);
              const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
              obj.set('stroke', hex);
            }
          }
          obj.set({
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
          });
        }
      });
        
      // Rebuild erase masks for non-destructive erasing
      rebuildEraseMasks(fc);
      fc.requestRenderAll();
      
      if (activePdfInfo) {
        setSelectedPdfInfo(activePdfInfo);
      } else {
        setSelectedPdfInfo(null);
      }
      isStateRestoringRef.current = false;
      setHistoryStatus(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [setHistoryStatus]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      restoreHistoryState(historyIndexRef.current - 1);
    }
  }, [restoreHistoryState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      restoreHistoryState(historyIndexRef.current + 1);
    }
  }, [restoreHistoryState]);

  const setSelectedPdfInfo = (_info: any) => {};

  const updateSelectedState = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    isSyncingSelectionRef.current = true;

    const activeObjects = fc.getActiveObjects();
    setSelectedCount(activeObjects.length);

    const activeObj = activeObjects.length === 1 ? activeObjects[0] : null;
    const pdfObj = (activeObj as any)?.isPdf
      ? activeObj
      : fc.getObjects().find((o: any) => o.isPdf || (o.currentPage && o.numPages));

    if (pdfObj) {
      (pdfObj as any).isPdf = true;
      setSelectedPdfInfo({
        currentPage: (pdfObj as any).currentPage || 1,
        numPages: (pdfObj as any).numPages || 1,
        isLocked: !!(pdfObj as any).isPdfLocked,
      });
    } else {
      setSelectedPdfInfo(null);
    }

    if (activeObj) {
      if (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') {
        const isEditing = (activeObj as any).isEditing;
        const hasSelection = isEditing && (activeObj as any).selectionStart !== (activeObj as any).selectionEnd;

        let curFontFamily = (activeObj as any).fontFamily;
        let curFontSize = (activeObj as any).fontSize;
        let curFontWeight = String((activeObj as any).fontWeight || 'normal');
        let curFontStyle = (activeObj as any).fontStyle || 'normal';
        let curUnderline = !!(activeObj as any).underline;
        let curLinethrough = !!(activeObj as any).linethrough;
        let curFill = typeof activeObj.fill === 'string' ? activeObj.fill : undefined;

        if (hasSelection && typeof (activeObj as any).getSelectionStyles === 'function') {
          const selStyles = (activeObj as any).getSelectionStyles();
          if (Array.isArray(selStyles) && selStyles.length > 0) {
            const first = selStyles[0];
            if (first.fontFamily) curFontFamily = first.fontFamily;
            if (first.fontSize) curFontSize = first.fontSize;
            if (first.fontWeight !== undefined) curFontWeight = String(first.fontWeight);
            if (first.fontStyle !== undefined) curFontStyle = first.fontStyle;
            if (first.underline !== undefined) curUnderline = !!first.underline;
            if (first.linethrough !== undefined) curLinethrough = !!first.linethrough;
            if (typeof first.fill === 'string') curFill = first.fill;
          }
        }

        if (curFontFamily) setFontFamily(curFontFamily);
        if (curFontSize) setFontSize(curFontSize);
        setFontWeight(curFontWeight);
        setFontStyle(curFontStyle);
        setUnderline(curUnderline);
        setLinethrough(curLinethrough);
        if (curFill) setStrokeColor(curFill);
        if ((activeObj as any).textAlign) setTextAlign((activeObj as any).textAlign);
        if (typeof (activeObj as any).charSpacing === 'number') setLetterSpacing(Math.round((activeObj as any).charSpacing / 10));
        if (typeof (activeObj as any).lineHeight === 'number') setLineHeight(Number((activeObj as any).lineHeight.toFixed(1)));
        if ((activeObj as any).backgroundColor) setTextBgColor((activeObj as any).backgroundColor);
      }

      setSelectedObject({
        id: (activeObj as any).id || `obj-${Date.now()}`,
        type: (activeObj as any).shapeType || activeObj.type || 'object',
        fill: typeof activeObj.fill === 'string' ? activeObj.fill : (activeObj as any).fill || '#6366F1',
        stroke: typeof activeObj.stroke === 'string' ? activeObj.stroke : (activeObj as any).stroke || '#1E293B',
        strokeWidth: activeObj.strokeWidth ?? (activeObj as any).strokeWidth ?? 1,
        opacity: activeObj.opacity ?? 1,
        angle: Math.round(activeObj.angle || 0),
        left: Math.round(activeObj.left || 0),
        top: Math.round(activeObj.top || 0),
        width: Math.round(((activeObj as any).targetWidth ?? activeObj.width ?? 0) * (activeObj.scaleX || 1)),
        height: Math.round(((activeObj as any).targetHeight ?? activeObj.height ?? 0) * (activeObj.scaleY || 1)),
        scaleX: activeObj.scaleX || 1,
        scaleY: activeObj.scaleY || 1,
        layerId: (activeObj as any).layerId || 'layer-default',
        locked: !!(activeObj as any).locked,
        visible: !(activeObj as any).isHiddenGhost && activeObj.visible !== false,
        drawingStyle: (activeObj as any).drawingStyle || 'precise',
        roughness: (activeObj as any).roughness ?? 0,
        bowing: (activeObj as any).bowing ?? 0,
        fillStyle: (activeObj as any).fillStyle || 'solid',
        hachureGap: (activeObj as any).hachureGap ?? 5,
        shapeType: (activeObj as any).shapeType,
        strokeStyle: (activeObj as any).strokeStyle || 'solid',
        edges: (activeObj as any).edges || 'rounded',
        isPdf: !!(activeObj as any).isPdf,
        currentPage: (activeObj as any).currentPage,
        numPages: (activeObj as any).numPages,
        pdfFileSize: (activeObj as any).pdfFileSize,
        rx: (activeObj as any).rx !== undefined ? (activeObj as any).rx : 3,
        ry: (activeObj as any).ry !== undefined ? (activeObj as any).ry : 3,
        isGroup: (activeObj as any).isGroup || activeObj.type === 'group',
        _objects: (activeObj as any)._objects,
        name: (activeObj as any).name,
      });
    } else {
      setSelectedObject(null);
    }
  }, [setSelectedCount, setSelectedObject]);

  // Listen for Ctrl+Arrow (word jump) and Ctrl+Shift+Arrow (word select) when editing Fabric text
  useEffect(() => {
    const getPrevWordIndex = (text: string, fromIndex: number): number => {
      if (fromIndex <= 0) return 0;
      let idx = fromIndex - 1;
      while (idx > 0 && /\s/.test(text[idx])) {
        idx--;
      }
      while (idx > 0 && !/\s/.test(text[idx - 1])) {
        idx--;
      }
      return Math.max(0, idx);
    };

    const getNextWordIndex = (text: string, fromIndex: number): number => {
      if (fromIndex >= text.length) return text.length;
      let idx = fromIndex;
      while (idx < text.length && !/\s/.test(text[idx])) {
        idx++;
      }
      while (idx < text.length && /\s/.test(text[idx])) {
        idx++;
      }
      return Math.min(text.length, idx);
    };

    const handleWordNavigation = (e: KeyboardEvent) => {
      const fc = fabricCanvasRef.current;
      if (!fc) return;

      const activeObj = fc.getActiveObject() as any;
      if (!activeObj || !activeObj.isEditing) return;

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      e.stopPropagation();

      const text: string = activeObj.text || '';
      const isLeft = e.key === 'ArrowLeft';
      const isShift = e.shiftKey;

      let start = activeObj.selectionStart ?? 0;
      let end = activeObj.selectionEnd ?? 0;

      if (isLeft) {
        const targetIndex = getPrevWordIndex(text, start);
        if (isShift) {
          if (targetIndex > end) {
            start = end;
            end = targetIndex;
          } else {
            start = targetIndex;
          }
        } else {
          start = targetIndex;
          end = targetIndex;
        }
      } else {
        const targetIndex = getNextWordIndex(text, end);
        if (isShift) {
          if (targetIndex < start) {
            end = start;
            start = targetIndex;
          } else {
            end = targetIndex;
          }
        } else {
          start = targetIndex;
          end = targetIndex;
        }
      }

      activeObj.selectionStart = start;
      activeObj.selectionEnd = end;

      if (activeObj.hiddenTextarea) {
        try {
          activeObj.hiddenTextarea.selectionStart = start;
          activeObj.hiddenTextarea.selectionEnd = end;
        } catch (err) {}
      }

      if (typeof activeObj.initDimensions === 'function') {
        activeObj.initDimensions();
      }
      activeObj.setCoords();
      fc.requestRenderAll();
      updateSelectedState();
    };

    window.addEventListener('keydown', handleWordNavigation, true);
    return () => {
      window.removeEventListener('keydown', handleWordNavigation, true);
    };
  }, [updateSelectedState]);

  // Safely find valid target object under pointer for Eraser & Bucket tools
  const getPointerTarget = useCallback((fc: fabric.Canvas, e: React.PointerEvent): fabric.Object | null => {
    const target = fc.findTarget(e.nativeEvent);
    if (target) {
      const targetObj = (target as any).target || target;
      if (targetObj && targetObj !== (fc as any) && typeof targetObj.type === 'string' && targetObj.type !== 'canvas') {
        const allObjects = fc.getObjects();
        if (allObjects.includes(targetObj)) {
          return targetObj;
        }
      }
    }

    const pointer = fc.getScenePoint(e.nativeEvent);
    const objects = fc.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj.visible && obj.containsPoint(pointer)) {
        return obj;
      }
    }
    return null;
  }, []);

  // ── Shared Eraser Engine (hook) ──────────────────────────────────────────
  const isObjectErasable = useCallback((obj: fabric.Object): boolean => {
    if (!isErasableObject(obj)) return false;
    const objLayerId = (obj as any).layerId || 'layer-default';
    const objLayer = layersRef.current?.find((l) => l.id === objLayerId);
    if (objLayer && (!objLayer.visible || objLayer.locked)) return false;
    return true;
  }, []);

  const { performContinuousErase, flushEraserQueue, resetPointerTracking, disposeEraserEngine } = useEraserEngine({
    fabricCanvasRef,
    eraserRadiusRef,
    eraserPressureRef,
    isObjectErasable,
  });

  // Update Custom Tool Cursor across Fabric canvas & Container
  useEffect(() => {
    const cursor = getToolCursor(activeTool, isSpacePressedRef.current, isTextEditingRef.current);

    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }

    const fc = fabricCanvasRef.current;
    if (fc) {
      if (activeTool === 'laser') {
        fc.discardActiveObject();
        fc.requestRenderAll();
      }
      fc.defaultCursor = cursor;
      fc.freeDrawingCursor = cursor;
      fc.hoverCursor = cursor;
      if (fc.upperCanvasEl) {
        fc.upperCanvasEl.style.cursor = cursor;
      }
    }
  }, [activeTool, resolvedTheme]);

  useEffect(() => {
    if (!canvasElementRef.current) return;

    // Optimize memory: disable offscreen canvas caching for individual shapes
    // objectCaching dynamically managed on shapes

    const fc = new fabric.Canvas(canvasElementRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
      uniformScaling: false,
      stopContextMenu: false,
      fireRightClick: true,
      enableRetinaScaling: true,
    } as any);

    SelectionLayer.initSelectionVisuals(fc);

    fabricCanvasRef.current = fc;

    // ── Canonical Viewport Initialization ──
    // Start with default viewport (fresh canvas every time)
    const initialVpt: [number, number, number, number, number, number] = [
      zoom, 0, 0, zoom, panX, panY
    ];
    fc.setViewportTransform(initialVpt);
    fc.requestRenderAll();
    setZoom(zoom);
    setPan(panX, panY);
    isInitializedRef.current = true;
    setIsCanvasReady(true);

    // We do NOT call saveHistoryState() immediately here since initialization is async.
    // Instead we rely on user actions later.

    const handleSelectionChange = (opt?: any) => {
      if (opt?.e && (opt.e as MouseEvent).button === 2) return;
      setHoverRect(null);
      updateSelectedState();
    };

    fc.on('selection:created', handleSelectionChange);
    fc.on('selection:updated', handleSelectionChange);
    fc.on('selection:cleared', handleSelectionChange);
    fc.on('text:selectionchanged' as any, handleSelectionChange);
    fc.on('text:changed' as any, handleSelectionChange);
    fc.on('mouse:down', handleSelectionChange);
    const handleObjectAdded = (e: any) => {
      if (e.target) {
        if (!e.target.id) {
          e.target.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
        }
        if (!e.target.layerId) {
          e.target.layerId = activeLayerIdRef.current;
        }
      }
      updateSelectedState();
    };
    fc.on('object:added', handleObjectAdded);
    fc.on('object:removed', updateSelectedState);

    // Hover feedback logic: Fabric handles cursor pointers natively, hover overlay set to null
    const handleMouseOver = () => {
      setHoverRect(null);
    };

    const handleMouseOut = () => {
      setHoverRect(null);
    };

    fc.on('mouse:over', handleMouseOver);
    fc.on('mouse:out', handleMouseOut);

    const updateCanvasCursor = () => {
      const cursor = getToolCursor(activeToolRef.current, isSpacePressedRef.current, isTextEditingRef.current);
      if (containerRef.current) containerRef.current.style.cursor = cursor;
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.defaultCursor = cursor;
        fabricCanvasRef.current.hoverCursor = cursor;
        fabricCanvasRef.current.freeDrawingCursor = cursor;
        if (fabricCanvasRef.current.upperCanvasEl) fabricCanvasRef.current.upperCanvasEl.style.cursor = cursor;
      }
    };

    fc.on('text:editing:entered', () => {
      isTextEditingRef.current = true;
      updateCanvasCursor();
    });

    fc.on('text:editing:exited', () => {
      isTextEditingRef.current = false;
      updateCanvasCursor();
    });

    // Rotation & angle badge feedback logic
    const handleObjectRotating = (e: any) => {
      const target = e.target;
      if (!target) return;

      const rawEvent = e.e as MouseEvent;
      if (rawEvent && rawEvent.shiftKey) {
        const snappedAngle = Math.round((target.angle || 0) / 15) * 15;
        target.set('angle', snappedAngle);
      }

      const canvasEl = canvasElementRef.current;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const clientX = rawEvent?.clientX ?? rect.left + (target.left || 0);
        const clientY = rawEvent?.clientY ?? rect.top + (target.top || 0);
        setRotationBadge({
          angle: target.angle || 0,
          position: { x: clientX, y: clientY - 30 },
        });
      }
    };

    const handleRotationEnd = () => {
      setRotationBadge({ angle: null, position: null });
    };

    fc.on('object:rotating', handleObjectRotating);
    fc.on('mouse:up', () => {
      handleRotationEnd();
      // Finalize connector geometry after drag ends (precise anchor-point recalculation)
      const dragState = subtreeDragStateRef.current;
      if (dragState && dragState.connectorObjects.size > 0) {
        const objectMap = buildGraphObjectMap(fc);
        dragState.connectorObjects.forEach((connObj) => {
          if (isGraphConnector(connObj)) {
            const anyConn = connObj as any;
            const source = objectMap.get(anyConn.sourceNodeId);
            const targetNode = objectMap.get(anyConn.targetNodeId);
            if (source && targetNode) {
              updateConnectorGeometry(fc, connObj, source, targetNode);
            }
          }
        });
        fc.requestRenderAll();
      }
      subtreeDragStateRef.current = null;
    });

    // Movement, Subtree Dragging & Smart Connectors
    fc.on('object:moving', (e: any) => {
      const target = e.target;
      if (!target) return;

      if (gridRef.current?.snapToGrid && gridRef.current.size) {
        const size = gridRef.current.size;
        target.set({
          left: Math.round((target.left || 0) / size) * size,
          top: Math.round((target.top || 0) / size) * size,
        });
      }

      const targetId = (target as any).id;
      if (targetId && isGraphNode(target)) {
        // Initialize drag state on first move event
        if (!subtreeDragStateRef.current || subtreeDragStateRef.current.rootId !== targetId) {
          const { descendantIds, affectedConnectorIds, objectMap } = getSubtreeData(targetId, fc);
          const descendantObjects = new Map<string, fabric.Object>();
          const connectorObjects = new Map<string, fabric.Object>();
          const descendantInitialPositions = new Map<string, { left: number; top: number }>();

          descendantIds.forEach((dId) => {
            const dObj = objectMap.get(dId);
            if (dObj && dObj !== target) {
              descendantObjects.set(dId, dObj);
              descendantInitialPositions.set(dId, { left: dObj.left || 0, top: dObj.top || 0 });
            }
          });

          affectedConnectorIds.forEach((connId) => {
            const connObj = objectMap.get(connId);
            if (connObj) {
              connectorObjects.set(connId, connObj);
            }
          });

          // Use transform.original to get pre-drag position for accurate first-frame delta
          const transform = (fc as any)._currentTransform;
          const originLeft = transform?.original?.left ?? (target.left || 0);
          const originTop = transform?.original?.top ?? (target.top || 0);

          subtreeDragStateRef.current = {
            rootId: targetId,
            initialRootPos: { left: originLeft, top: originTop },
            descendantObjects,
            connectorObjects,
            descendantInitialPositions,
            connectorInitialPositions: new Map(), // unused but kept for type compat
            affectedConnectorIds,
            objectMap, // Store full map for fast source/target lookups during drag
          };
        }

        // Apply absolute delta from initial position every frame
        const state = subtreeDragStateRef.current;
        const dx = (target.left || 0) - state.initialRootPos.left;
        const dy = (target.top || 0) - state.initialRootPos.top;

        // Move all descendant nodes by the absolute delta
        state.descendantObjects.forEach((descObj, id) => {
          const initPos = state.descendantInitialPositions.get(id);
          if (initPos) {
            descObj.set({
              left: initPos.left + dx,
              top: initPos.top + dy,
            });
            descObj.setCoords();
          }
        });

        // Recompute connector geometries in-place live during drag
        state.connectorObjects.forEach((connObj) => {
          if (isGraphConnector(connObj)) {
            const anyConn = connObj as any;
            // Lookup from the cached objectMap to avoid rebuilding it every frame
            const source = state.objectMap?.get(anyConn.sourceNodeId);
            const targetNode = state.objectMap?.get(anyConn.targetNodeId);
            if (source && targetNode) {
              updateConnectorGeometry(fc, connObj, source, targetNode, true);
            }
          }
        });
      }

      fc.requestRenderAll();
    });

    const handleObjectScaling = (_e: any) => {
      // Allow native smooth visual scaling during transform drag without force-resetting scaleX/scaleY
    };

    fc.on('object:scaling', handleObjectScaling);

    fc.on('object:modified', (e: any) => {
      const target = e.target;
      if (target) {
        if (target.type === 'i-text' || target.type === 'text' || target.type === 'textbox') {
          const scale = target.scaleY || target.scaleX || 1;
          if (Math.abs(scale - 1) > 0.001) {
            const currentFontSize = target.fontSize || 24;
            const newFontSize = Math.max(8, Math.round(currentFontSize * scale));
            target.set({
              fontSize: newFontSize,
              scaleX: 1,
              scaleY: 1,
            });
            if (typeof target.initDimensions === 'function') {
              target.initDimensions();
            }
            target.setCoords();
          }
        } else {
          const isImageOrPdf = target.type === 'image' || (target as any).isPdf;
          if (!isImageOrPdf) {
            const scaleX = Math.abs(target.scaleX || 1);
            const scaleY = Math.abs(target.scaleY || 1);

            if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
              const topLeft = target.getPointByOrigin('left', 'top');
              if ((target as any).isRoughObject) {
                const origW = (target as any).targetWidth || target.width || 10;
                const origH = (target as any).targetHeight || target.height || 10;
                const newW = Math.max(10, Math.round(origW * scaleX));
                const newH = Math.max(10, Math.round(origH * scaleY));

                if ((target as any).shapeType === 'line' || (target as any).shapeType === 'arrow') {
                  delete (target as any).worldPoints;
                }

                const currentGen = canvasLifecycleRef.current;
                const timerId = window.setTimeout(() => {
                  timeoutIdsRef.current.delete(timerId);
                  if (canvasLifecycleRef.current !== currentGen || !fabricCanvasRef.current) return;
                  updateRoughObject(fabricCanvasRef.current, target, {
                    left: topLeft.x,
                    top: topLeft.y,
                    width: newW,
                    height: newH,
                    angle: target.angle || 0,
                  });
                  (fabricCanvasRef.current as any)._currentTransform = null;
                  updateSelectedState();
                  saveHistoryState();
                  fc.requestRenderAll();
                }, 0);
                timeoutIdsRef.current.add(timerId);
                return;
              } else if (target.type !== 'group' && target.type !== 'activeSelection' && target.type !== 'ActiveSelection' && !(target as any).isGroup) {
                const newW = Math.max(5, (target.width || 1) * scaleX);
                const newH = Math.max(5, (target.height || 1) * scaleY);
                target.set({
                  left: topLeft.x,
                  top: topLeft.y,
                  width: newW,
                  height: newH,
                  scaleX: 1,
                  scaleY: 1,
                });
                target.setCoords();
              }
            }
          }
        }
      }
      (fc as any)._currentTransform = null;
      updateSelectedState();
      saveHistoryState();
      fc.requestRenderAll();
    });

    fc.on('after:render', () => {
      const editingObj = editingPathObjRef.current;
      if (!editingObj || !fc.getObjects().includes(editingObj)) {
        if (editingPathObjRef.current) {
          editingPathObjRef.current.set({ hasControls: true, lockMovementX: false, lockMovementY: false });
          editingPathObjRef.current = null;
          selectedPointIndexRef.current = null;
          hoverInsertionPointRef.current = null;
          
          // Only clear the top context ONCE when we actually exit path edit mode
          const ctx = fc.getSelectionContext() || (fc as any).contextTop;
          if (ctx) fc.clearContext(ctx);
        }
        return;
      }

      const ctx = fc.getSelectionContext() || (fc as any).contextTop || (fc as any).contextContainer;
      if (!ctx) return;

      if (ctx === fc.getSelectionContext() || ctx === (fc as any).contextTop) {
        fc.clearContext(ctx);
      }

      let worldPts: { x: number; y: number }[] = (editingObj as any).worldPoints;
      
      // Fallback/Migration
      if (!worldPts) {
        const pts: { x: number; y: number }[] = (editingObj as any).points || [
          { x: (editingObj as any).x1 ?? 0, y: (editingObj as any).y1 ?? 0 },
          { x: (editingObj as any).x2 ?? (editingObj.width || 0), y: (editingObj as any).y2 ?? (editingObj.height || 0) },
        ];
        const oldT = editingObj.calcTransformMatrix();
        worldPts = pts.map((p) => fabric.util.transformPoint(p, oldT));
        (editingObj as any).worldPoints = worldPts;
      }

      const vpt = fc.viewportTransform;

      ctx.save();

      // Draw hover insertion preview handle if hovering path segment
      if (hoverInsertionPointRef.current && !isDraggingPointRef.current) {
        const hWorld = hoverInsertionPointRef.current.point;
        const hScreenX = vpt ? vpt[0] * hWorld.x + vpt[2] * hWorld.y + vpt[4] : hWorld.x;
        const hScreenY = vpt ? vpt[1] * hWorld.x + vpt[3] * hWorld.y + vpt[5] : hWorld.y;

        ctx.beginPath();
        ctx.arc(hScreenX, hScreenY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#6366F1';
        ctx.stroke();
      }

      // Draw path point handles directly
      for (let i = 0; i < worldPts.length; i++) {
        const p = worldPts[i];
        const spX = vpt ? vpt[0] * p.x + vpt[2] * p.y + vpt[4] : p.x;
        const spY = vpt ? vpt[1] * p.x + vpt[3] * p.y + vpt[5] : p.y;
        
        const isSelected = i === selectedPointIndexRef.current;
        const radius = isSelected ? 6 : 5;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        ctx.beginPath();
        ctx.arc(spX, spY, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#6366F1' : '#FFFFFF';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.strokeStyle = isSelected ? '#FFFFFF' : '#6366F1';
        ctx.stroke();
      }

      ctx.restore();
    });

    const handleDblClick = (e: any) => {
      const target = e.target || fc.getActiveObject();
      if (target) {
        if (target.type === 'i-text' || target.type === 'text' || target.type === 'textbox') {
          if (typeof (target as any).enterEditing === 'function') {
            (target as any).enterEditing();
            if (typeof (target as any).selectAll === 'function') {
              (target as any).selectAll();
            }
            fc.renderAll();
          }
          return;
        }

        const shapeType = (target as any).shapeType || target.type;
        if (shapeType === 'line' || shapeType === 'arrow') {
          if (editingPathObjRef.current && editingPathObjRef.current !== target) {
            editingPathObjRef.current.set({ hasControls: true });
          }
          editingPathObjRef.current = target;
          target.set({ hasControls: false, lockMovementX: true, lockMovementY: true });
          selectedPointIndexRef.current = null;
          hoverInsertionPointRef.current = null;
          fc.setActiveObject(target);
          fc.requestRenderAll();
          return;
        }
        if (target.type === 'group' || target.isGroup) {
          target.set({
            subTargetCheck: true,
            interactive: true,
          });
          fc.requestRenderAll();
        }
      }
    };

    fc.on('mouse:dblclick' as any, handleDblClick);
    fc.on('mousedblclick' as any, handleDblClick);

    fc.on('mouse:down', (e: any) => {
      const target = e.target;
      const rawEvent = e.e as MouseEvent;
      
      // Prevent clearing selection on Ctrl+Click or Meta+Click empty space
      if (!target && rawEvent && (rawEvent.ctrlKey || rawEvent.metaKey)) {
        // We can just stop propagation/prevent default but fabric might still clear it before this.
        // Fabric actually provides a way to cancel selection clear by not doing anything if we just return,
        // Wait, mouse:down in fabric might not be cancellable this way.
        // We will just let selection clear and then restore if needed, or rely on selectionKey handling it correctly.
      }

      if (!target || (target.type !== 'group' && !target.isGroup)) {
        // Exit edit mode for any groups
        const groups = fc.getObjects().filter((o) => o.type === 'group' || (o as any).isGroup);
        groups.forEach((g) => {
          if ((g as any).subTargetCheck) {
            g.set({
              subTargetCheck: false,
              interactive: false,
            });
          }
        });
        fc.requestRenderAll();
      }
    });

    fc.on('before:selection:cleared' as any, (e: any) => {
      const rawEvent = e.e as MouseEvent;
      if (rawEvent && (rawEvent.ctrlKey || rawEvent.metaKey)) {
        // Cancel the selection clearing when Ctrl/Meta is held and clicking empty space
        e.cancel = true;
      }
    });

    fc.on('path:created', (e: any) => {
      if (e.path) {
        let strokeDashArray: number[] | undefined = undefined;
        if (strokeStyleRef.current === 'dashed') strokeDashArray = [8, 8];
        else if (strokeStyleRef.current === 'dotted') strokeDashArray = [3, 6];

        if (activeToolRef.current === 'eraser') {
          e.path.set({
            globalCompositeOperation: 'destination-out',
            stroke: '#000000',
            strokeWidth: Math.max(12, strokeWidthRef.current * 4),
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            fill: 'transparent',
            selectable: false,
            evented: false,
            layerId: activeLayerIdRef.current,
            shapeType: 'eraser',
          });
          fc.renderAll();
        } else if (activeToolRef.current === 'marker') {
          e.path.set({
            stroke: strokeColorRef.current,
            strokeWidth: Math.max(16, strokeWidthRef.current * 4),
            strokeDashArray: undefined,
            opacity: opacityRef.current,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            globalCompositeOperation: 'multiply',
            layerId: activeLayerIdRef.current,
            colorSource: strokeColorSourceRef.current,
            shapeType: 'marker',
            drawingStyle: drawingStyleRef.current,
          });
          (e.path as any).isMarker = true;
          (e.path as any).drawingStyle = drawingStyleRef.current;
          (e.path as any).strokeStyle = undefined;
        } else if (activeToolRef.current === 'pen') {
          e.path.set({
            fill: strokeColorRef.current,
            stroke: 'transparent',
            strokeWidth: 0,
            opacity: opacityRef.current,
            layerId: activeLayerIdRef.current,
            colorSource: strokeColorSourceRef.current,
            shapeType: 'pen',
          });
        } else {
          e.path.set({
            layerId: activeLayerIdRef.current,
            stroke: strokeColorRef.current,
            strokeWidth: strokeWidthRef.current,
            strokeDashArray,
            opacity: opacityRef.current,
            fill: 'transparent',
            colorSource: strokeColorSourceRef.current,
            shapeType: activeToolRef.current,
            drawingStyle: drawingStyleRef.current,
          });
          (e.path as any).drawingStyle = drawingStyleRef.current;
        }
        (e.path as any).strokeStyle = strokeStyleRef.current;

        // Draw to Shape Recognition
        if (isDrawToShapeModeRef.current && (activeToolRef.current === 'pencil' || activeToolRef.current === 'pen')) {
          const strokePoints: Point[] = [];
          if (Array.isArray(e.path.path)) {
            e.path.path.forEach((cmd: any[]) => {
              if (cmd && cmd.length >= 3) {
                const px = Number(cmd[cmd.length - 2]);
                const py = Number(cmd[cmd.length - 1]);
                if (!isNaN(px) && !isNaN(py)) strokePoints.push({ x: px, y: py });
              }
            });
          }

          if (strokePoints.length > 5) {
            const rec = recognizeShapeFromStroke(strokePoints);
            if (rec.shapeType && rec.confidence >= 0.72) {
              fc.remove(e.path);
              const newGroup = createRoughShape({
                shapeType: rec.shapeType,
                layerId: activeLayerIdRef.current,
                left: rec.bounds.left,
                top: rec.bounds.top,
                width: rec.bounds.width,
                height: rec.bounds.height,
                stroke: strokeColorRef.current,
                fill: fillColorRef.current,
                strokeColor: strokeColorRef.current,
                fillColor: fillColorRef.current,
                strokeWidth: strokeWidthRef.current,
                opacity: opacityRef.current,
                drawingStyle: drawingStyleRef.current,
                roughness: roughnessRef.current,
                bowing: bowingRef.current,
                fillStyle: fillStyleRef.current,
                strokeStyle: strokeStyleRef.current,
                edges: edgesRef.current,
                colorSource: strokeColorSourceRef.current,
              });
              fc.add(newGroup);
              fc.setActiveObject(newGroup);
              fc.renderAll();
              saveHistoryState();
              return;
            } else if (rec.shapeType && rec.confidence >= 0.45) {
              setShapeSuggestion({
                path: e.path,
                recognition: rec,
              });
            }
          }
        }
      }
      saveHistoryState();
    });

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setCanvasSize(w, h);
      fc.setDimensions({ width: w, height: h });
      fc.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Centralized disposal to prevent memory leaks and stale callbacks
      if (panAnimRef.current?.rafId !== null && panAnimRef.current?.rafId !== undefined) {
        cancelAnimationFrame(panAnimRef.current.rafId);
        panAnimRef.current.rafId = null;
      }

      disposeEraserEngine();

      // Clear all scheduled timeouts owned by this lifecycle
      timeoutIdsRef.current.forEach(id => window.clearTimeout(id));
      timeoutIdsRef.current.clear();
      canvasLifecycleRef.current++; // Invalidate lifecycle generation

      for (const [_, controller] of pdfRenderControllersRef.current) {
        controller.abort();
      }
      pdfRenderControllersRef.current.clear();

      fc.getObjects().forEach((obj) => {
        cleanupEraserResources(obj);
        // Explicitly sever the display canvas to ensure memory is released immediately
        if ((obj as any).isPdf && typeof (obj as any).getElement === 'function') {
           const elem = (obj as any).getElement();
           if (elem && typeof elem.width === 'number') {
             elem.width = 0;
             elem.height = 0;
           }
        }
      });

      subtreeDragStateRef.current = null;
      hoverInsertionPointRef.current = null;
      selectedPointIndexRef.current = null;
      dragStartStateRef.current = null;
      editingPathObjRef.current = null;
      clipboardRef.current = null;
      drawingSessionRef.current = {
        active: false,
        pointerId: null,
        tool: null,
        startPoint: null,
        tempShape: null,
        lastProps: null,
      };

      fc.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCanvasSize]);

  // Configure Brushes (Pencil: Uniform Thin, Pen: Dynamic Velocity Sensitive Brush, Marker: Highlighter)
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const cursor = getToolCursor(activeTool, isSpacePressedRef.current, isTextEditingRef.current);
    fc.defaultCursor = cursor;
    fc.freeDrawingCursor = cursor;
    fc.hoverCursor = cursor;
    if (fc.upperCanvasEl) {
      fc.upperCanvasEl.style.cursor = cursor;
    }

    // Clean up any in-flight shape drawing session on tool change
    if (drawingSessionRef.current.active) {
      const oldShape = drawingSessionRef.current.tempShape;
      if (fc && oldShape) {
        fc.remove(oldShape);
      }
      if (capturedElementRef.current && drawingSessionRef.current.pointerId !== null) {
        try {
          capturedElementRef.current.releasePointerCapture(drawingSessionRef.current.pointerId);
        } catch (err) {}
        capturedElementRef.current = null;
      }
      drawingSessionRef.current = {
        active: false,
        pointerId: null,
        tool: null,
        startPoint: null,
        tempShape: null,
        lastProps: null,
      };
    }

    // Reset previous brush if active
    if (fc.freeDrawingBrush && typeof (fc.freeDrawingBrush as any).abort === 'function') {
      (fc.freeDrawingBrush as any).abort();
    }
    if ((fc as any)._isCurrentlyDrawing) {
      (fc as any)._isCurrentlyDrawing = false;
    }
    const ctx = fc.contextTop;
    if (ctx) {
      fc.clearContext(ctx);
    }

    const currentActiveLayer = layers.find((l) => l.id === activeLayerId);
    const isLayerBlocked = currentActiveLayer ? (currentActiveLayer.locked || !currentActiveLayer.visible) : false;

    if (isLayerBlocked && activeTool !== 'select') {
      fc.isDrawingMode = false;
    } else if (activeTool === 'pencil') {
      fc.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fc);
      brush.color = strokeColor;
      brush.width = strokeWidth;
      brush.decimate = 1;
      fc.freeDrawingBrush = brush;
    } else if (activeTool === 'pen') {
      fc.isDrawingMode = true;
      const brush = new SpeedPenBrush(fc);
      brush.color = strokeColor;
      brush.width = strokeWidth;
      brush.opacity = opacity;
      brush.layerId = activeLayerIdRef.current;
      fc.freeDrawingBrush = brush;
    } else if (activeTool === 'marker') {
      fc.isDrawingMode = true;
      const brush = new HighlighterBrush(fc);
      brush.color = strokeColor;
      brush.width = Math.max(16, strokeWidth * 4);
      brush.opacity = opacity;
      brush.layerId = activeLayerIdRef.current;
      fc.freeDrawingBrush = brush;
    } else {
      fc.isDrawingMode = false;
      if ((fc as any).upperCanvasEl) {
        (fc as any).upperCanvasEl.style.mixBlendMode = '';
      }
    }

    fc.selection = activeTool === 'select';
    fc.skipTargetFind = activeTool !== 'select' && activeTool !== 'text';

    if (activeTool !== 'select' && activeTool !== 'text') {
      fc.discardActiveObject();
      fc.renderAll();
    }
  }, [activeTool, strokeColor, strokeWidth, opacity, fillColor]);

  // Live sync color, stroke, and sketch properties to active canvas selection
  useEffect(() => {
    if (isSyncingSelectionRef.current) {
      isSyncingSelectionRef.current = false;
      return;
    }

    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const activeObjects = fc.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        if ((obj as any).isRoughObject) {
          updateRoughObject(fc, obj, {
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
            opacity,
            drawingStyle,
            roughness,
            bowing,
            fillStyle,
            hachureGap,
            strokeStyle,
            edges,
          });
        } else {
          const isImageOrPdf = obj.type === 'image' || (obj as any).isPdf;
          if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
            obj.set({
              fill: strokeColor,
              fontSize,
              fontFamily,
              fontWeight,
              fontStyle,
              underline: !!underline,
              linethrough: !!linethrough,
              textAlign,
              charSpacing: (letterSpacing || 0) * 20,
              lineHeight,
              opacity,
            } as any);
          } else if (!isImageOrPdf) {
            const isPen = (obj as any).shapeType === 'pen';
            if (isPen) {
              obj.set({
                fill: strokeColor,
                stroke: 'transparent',
                strokeWidth: 0,
                opacity,
              });
            } else {
              (obj as any).drawingStyle = drawingStyle;
              if (obj.type !== 'line' && obj.type !== 'path') {
                obj.set({ fill: fillColor });
              }

              let strokeDashArray: number[] | undefined = undefined;
              if (strokeStyle === 'dashed') strokeDashArray = [8, 8];
              else if (strokeStyle === 'dotted') strokeDashArray = [3, 6];

              const isMarker = (obj as any).isMarker || activeTool === 'marker';

              if (isMarker) {
                obj.set({
                  stroke: strokeColor,
                  strokeWidth: Math.max(16, strokeWidth * 4),
                  strokeDashArray: undefined,
                  opacity,
                  strokeLineCap: 'round',
                  strokeLineJoin: 'round',
                });
                (obj as any).strokeStyle = undefined;
              } else {
                obj.set({
                  stroke: strokeColor,
                  strokeWidth,
                  strokeDashArray,
                  opacity,
                });
                (obj as any).strokeStyle = strokeStyle;
              }
            }
          } else {
            obj.set({ opacity });
          }
        }
      });
      fc.renderAll();
      saveHistoryState();
    }
  }, [
    fillColor,
    strokeColor,
    strokeWidth,
    opacity,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    linethrough,
    textAlign,
    letterSpacing,
    lineHeight,
    drawingStyle,
    roughness,
    bowing,
    fillStyle,
    hachureGap,
    strokeStyle,
    edges,
    saveHistoryState,
    activeTool,
  ]);

  // Keyboard listener for Path Edit Mode shortcuts (Escape to cancel/exit, Delete/Backspace to delete intermediate point)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingPathObjRef.current) return;
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const fc = fabricCanvasRef.current;
        if (isDraggingPointRef.current && dragStartStateRef.current && editingPathObjRef.current) {
          const obj = editingPathObjRef.current;
          const startState = dragStartStateRef.current;
          const relPoints = startState.points.map((pt) => ({ x: pt.x, y: pt.y }));
          updateRoughObjectInPlace(obj, {
            left: startState.left,
            top: startState.top,
            width: startState.width,
            height: startState.height,
            points: relPoints,
            x1: relPoints[0].x,
            y1: relPoints[0].y,
            x2: relPoints[relPoints.length - 1].x,
            y2: relPoints[relPoints.length - 1].y,
          });
        }
        if (editingPathObjRef.current) {
          editingPathObjRef.current.set({ hasControls: true, lockMovementX: false, lockMovementY: false });
        }
        isDraggingPointRef.current = false;
        dragStartStateRef.current = null;
        editingPathObjRef.current = null;
        selectedPointIndexRef.current = null;
        hoverInsertionPointRef.current = null;
        if (fc) fc.requestRenderAll();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = fabricCanvasRef.current;
        const obj = editingPathObjRef.current;
        const selectedIdx = selectedPointIndexRef.current;
        if (fc && obj && selectedIdx !== null) {
          const pts: { x: number; y: number }[] = (obj as any).points || [];
          if (pts.length > 2 && selectedIdx >= 0 && selectedIdx < pts.length) {
            e.preventDefault();
            e.stopPropagation();
            const left = obj.left || 0;
            const top = obj.top || 0;
            const worldPts = pts.map((p) => ({ x: left + p.x, y: top + p.y }));
            worldPts.splice(selectedIdx, 1);

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            worldPts.forEach((pt) => {
              minX = Math.min(minX, pt.x);
              minY = Math.min(minY, pt.y);
              maxX = Math.max(maxX, pt.x);
              maxY = Math.max(maxY, pt.y);
            });

            const newLeft = minX;
            const newTop = minY;
            const newW = Math.max(2, maxX - minX);
            const newH = Math.max(2, maxY - minY);
            const relPoints = worldPts.map((pt) => ({ x: pt.x - minX, y: pt.y - minY }));

            updateRoughObjectInPlace(obj, {
              left: newLeft,
              top: newTop,
              width: newW,
              height: newH,
              points: relPoints,
              x1: relPoints[0].x,
              y1: relPoints[0].y,
              x2: relPoints[relPoints.length - 1].x,
              y2: relPoints[relPoints.length - 1].y,
            });

            selectedPointIndexRef.current = null;
            hoverInsertionPointRef.current = null;
            fc.requestRenderAll();
            saveHistoryState();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [saveHistoryState]);

  // Sync Layers visibility, locking, and z-index ordering across Fabric objects
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const objects = fc.getObjects();
    let hasChanged = false;

    objects.forEach((obj) => {
      const objLayerId = (obj as any).layerId || 'layer-default';
      const layer = layers.find((l) => l.id === objLayerId);

      if (layer) {
        if (obj.visible !== layer.visible) {
          obj.visible = layer.visible;
          hasChanged = true;
        }
        const isSelectable = !layer.locked && layer.visible;
        if (obj.selectable !== isSelectable || obj.evented !== isSelectable) {
          obj.selectable = isSelectable;
          obj.evented = isSelectable;
          hasChanged = true;
        }
      }
    });

    const sortedObjects = [...objects].sort((a, b) => {
      const aLayerId = (a as any).layerId || 'layer-default';
      const bLayerId = (b as any).layerId || 'layer-default';
      let aIdx = layers.findIndex((l) => l.id === aLayerId);
      let bIdx = layers.findIndex((l) => l.id === bLayerId);
      if (aIdx < 0) aIdx = layers.length;
      if (bIdx < 0) bIdx = layers.length;

      if (aIdx !== bIdx) {
        return bIdx - aIdx;
      }
      return 0;
    });

    sortedObjects.forEach((obj, index) => {
      fc.moveObjectTo(obj, index);
    });

    if (hasChanged) {
      fc.discardActiveObject();
    }
    fc.renderAll();
  }, [layers]);

  // Mouse Wheel zooming and panning via Fabric's native event system
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const handleWheel = (opt: any) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      let dx = e.deltaX;
      let dy = e.deltaY;
      
      if (e.deltaMode === 1) { // LINE
        dx *= 40;
        dy *= 40;
      } else if (e.deltaMode === 2) { // PAGE
        dx *= 800;
        dy *= 800;
      }

      if (e.ctrlKey || e.metaKey) {
        let newZoom = fc.getZoom() * (0.999 ** dy);
        newZoom = Math.max(0.1, Math.min(10, newZoom));

        fc.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom);
        setZoom(newZoom);
        
        const vpt = fc.viewportTransform;
        if (vpt) {
          commitViewportToReact(vpt);
        }
      } else {
        // 1. Establish a single zoom-independent pan sensitivity
        const WHEEL_PAN_SPEED = 1;

        // 2. Define Panning in SCREEN Space (Shift+Wheel & Alt+Wheel pan horizontally)
        let panScreenX = 0;
        let panScreenY = 0;

        if (e.shiftKey) {
          // Shift + Mouse Wheel -> Horizontal Panning
          panScreenX = (dx !== 0 ? dx : dy) * WHEEL_PAN_SPEED;
          panScreenY = 0;
        } else {
          // Normal Mouse Wheel / Trackpad -> 2D Panning (Vertical & Horizontal)
          panScreenX = dx * WHEEL_PAN_SPEED;
          panScreenY = dy * WHEEL_PAN_SPEED;
        }

        // 4. Smooth Pan Accumulation Engine
        const currentVpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
        
        if (!panAnimRef.current) {
          panAnimRef.current = {
            targetX: currentVpt[4],
            targetY: currentVpt[5],
            rafId: null
          };
        }

        const animState = panAnimRef.current;
        animState.targetX -= panScreenX;
        animState.targetY -= panScreenY;

        // Prevent excessive target accumulation (clamping to max 3000px ahead of current view)
        const MAX_AHEAD = 3000;
        const distX = animState.targetX - currentVpt[4];
        const distY = animState.targetY - currentVpt[5];
        if (Math.abs(distX) > MAX_AHEAD) animState.targetX = currentVpt[4] + Math.sign(distX) * MAX_AHEAD;
        if (Math.abs(distY) > MAX_AHEAD) animState.targetY = currentVpt[5] + Math.sign(distY) * MAX_AHEAD;

        // 5. Continuous Animation Loop
        if (animState.rafId === null) {
          const animatePan = () => {
            const vpt = [...(fc.viewportTransform || [1, 0, 0, 1, 0, 0])] as [number, number, number, number, number, number];
            const currentX = vpt[4];
            const currentY = vpt[5];
            
            const diffX = animState.targetX - currentX;
            const diffY = animState.targetY - currentY;
            
            // Settle smoothly when very close
            if (Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5) {
              vpt[4] = animState.targetX;
              vpt[5] = animState.targetY;
              fc.setViewportTransform(vpt);
              fc.requestRenderAll();
              commitViewportToReact(vpt); // Sync canonical state for GridLayer
              animState.rafId = null;
              return;
            }
            
            // Smoothing range 0.25 - 0.3 as requested
            vpt[4] = currentX + diffX * 0.28;
            vpt[5] = currentY + diffY * 0.28;
            
            fc.setViewportTransform(vpt);
            fc.requestRenderAll();
            gridOverlayRef.current?.updateViewport(vpt[0], vpt[4], vpt[5]);
            
            animState.rafId = requestAnimationFrame(animatePan);
          };
          animState.rafId = requestAnimationFrame(animatePan);
        }
      }
      

    };

    fc.on('mouse:wheel', handleWheel);
    return () => {
      fc.off('mouse:wheel', handleWheel);
    };
  }, [setZoom, setPan]);

  // Synchronize external zoom state changes (e.g. from BottomLeftControls "-" / "+" / "100%" buttons or Ctrl+0/+/shortcuts) to Fabric Canvas
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || !isCanvasReady) return;
    const currentFabricZoom = fc.getZoom();

    if (Math.abs(currentFabricZoom - zoom) > 0.005) {
      const center = new fabric.Point(
        fc.width ? fc.width / 2 : 500,
        fc.height ? fc.height / 2 : 500
      );
      fc.zoomToPoint(center, zoom);
      fc.requestRenderAll();
      const vpt = fc.viewportTransform;
      if (vpt) {
        commitViewportToReact(vpt);
        gridOverlayRef.current?.updateViewport(vpt[0], vpt[4], vpt[5]);
      }
    }
  }, [zoom, isCanvasReady, commitViewportToReact]);

  // Non-passive native Wheel listener to prevent native browser page zoom completely on Ctrl + Mouse Wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const finishRightClickEraser = useCallback(() => {
    if (isRightClickEraserRef.current) {
      isRightClickEraserRef.current = false;
      setIsRightClickEraserState(false);
      setIsRightClickErasing(false);
      resetPointerTracking();
      flushEraserQueue();
      saveHistoryState();
    }
  }, [flushEraserQueue, resetPointerTracking, saveHistoryState, setIsRightClickErasing, updateSelectedState]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (e.altKey) {
        e.preventDefault();
        return;
      }

      const targetEl = e.target as HTMLElement;
      const isUIElement = targetEl?.closest?.(
        '[data-canvas-ui="true"], .top-toolbar, .properties-panel, .group-panel, .bottom-left-controls, .layers-panel, [role="dialog"], button, input, select, textarea'
      );
      if (isUIElement) {
        e.preventDefault();
        return;
      }
      e.preventDefault();

      const fc = fabricCanvasRef.current;
      if (!fc) return;

      const targetObj = getPointerTarget(fc, { nativeEvent: e } as any);
      const allObjects = fc.getObjects();
      const totalObjects = allObjects.length;
      const hasClipboard = clipboardRef.current !== null;

      if (targetObj && !(targetObj as any).isGrid) {
        // Preserve existing multi-selection if the right-clicked object is part of it
        const activeObjects = fc.getActiveObjects();
        const isPartOfSelection = activeObjects.includes(targetObj);

        if (!isPartOfSelection) {
          // Right-clicked an object outside the current selection — select it
          fc.setActiveObject(targetObj);
          fc.renderAll();
          updateSelectedState();
        }

        // Determine context type
        let context: string;
        const refreshedActive = fc.getActiveObject();
        const refreshedActiveObjects = fc.getActiveObjects();

        if (refreshedActive && refreshedActive.type === 'activeSelection' && refreshedActiveObjects.length > 1) {
          context = 'multi-selection';
        } else if (refreshedActive && (refreshedActive.type === 'group' || (refreshedActive as any).isGroup)) {
          context = 'group';
        } else if (refreshedActive && (refreshedActive.type === 'i-text' || refreshedActive.type === 'text' || refreshedActive.type === 'textbox')) {
          context = 'text';
        } else {
          context = 'object';
        }

        // Compute object index in the canvas stacking order
        const objectIndex = allObjects.indexOf(targetObj);

        window.dispatchEvent(
          new CustomEvent('app:open-context-menu', {
            detail: {
              x: e.clientX,
              y: e.clientY,
              data: {
                context,
                targetId: (targetObj as any).id || null,
                objectIndex: objectIndex >= 0 ? objectIndex : 0,
                totalObjects,
                hasClipboard,
              },
            },
          })
        );
        return;
      }

      // Empty canvas right-click
      window.dispatchEvent(
        new CustomEvent('app:open-context-menu', {
          detail: {
            x: e.clientX,
            y: e.clientY,
            data: {
              context: 'canvas',
              targetId: null,
              objectIndex: 0,
              totalObjects,
              hasClipboard,
            },
          },
        })
      );
    };

    const handleGlobalPointerDown = (e: MouseEvent | PointerEvent) => {
      // Only activate eraser if Alt is held down with Right Click
      if (e.altKey && (e.button === 2 || (e.buttons & 2) !== 0)) {
        if (!isRightClickEraserRef.current) {
          isRightClickEraserRef.current = true;
          setIsRightClickEraserState(true);
          setIsRightClickErasing(true);
        }
      }
    };

    const handleGlobalPointerUp = (e: MouseEvent | PointerEvent) => {
      if (e.button === 2 || (e.buttons & 2) === 0) {
        finishRightClickEraser();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handleGlobalPointerDown as any);
    window.addEventListener('pointerup', handleGlobalPointerUp as any);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handleGlobalPointerDown as any);
      window.removeEventListener('pointerup', handleGlobalPointerUp as any);
    };
  }, [finishRightClickEraser, getPointerTarget, setIsRightClickErasing, updateSelectedState]);

  const handlePointerDown = (e: React.PointerEvent) => {
    window.dispatchEvent(new CustomEvent('app:close-menus'));

    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const pointer = fc.getScenePoint(e.nativeEvent);
    setCursorPos(pointer.x, pointer.y);
    setCursorScreenPos({ x: e.clientX, y: e.clientY });

    // Alt + Right click activates quick temporary eraser mode while held down
    if (e.altKey && (e.button === 2 || (e.buttons & 2) !== 0)) {
      e.preventDefault();
      e.stopPropagation();
      if (!isRightClickEraserRef.current) {
        isRightClickEraserRef.current = true;
        setIsRightClickEraserState(true);
        setIsRightClickErasing(true);
        performContinuousErase(pointer);
      }
      return;
    }

    updateSelectedState();

    if (isSpacePressedRef.current || e.button === 1) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      const cursor = getGrabbingCursor();
      if (containerRef.current) containerRef.current.style.cursor = cursor;
      if (fc) {
        fc.defaultCursor = cursor;
        fc.hoverCursor = cursor;
        hideSelectionVisuals(fc);
      }
      return;
    }

    // STRICT LIFECYCLE: Only left-click initiates drawing/tool usage
    if (e.button !== 0) return;

    if (activeTool === 'bucket') {
      const targetObj = getPointerTarget(fc, e);
      if (targetObj && 'set' in targetObj) {
        targetObj.set({ fill: fillColor });
        fc.renderAll();
        saveHistoryState();
      }
      return;
    }

    if (activeTool === 'eraser') {
      performContinuousErase(pointer);
      return;
    }

    // Freehand tools (pencil, pen, marker, laser) and select tool:
    // Fabric owns freehand drawing strokes entirely. React pointer handlers do not collect stroke points.
    if (activeTool === 'select' || activeTool === 'pencil' || activeTool === 'pen' || activeTool === 'marker' || activeTool === 'laser') {
      if (editingPathObjRef.current) {
        const editingObj = editingPathObjRef.current;
        let worldPts: { x: number; y: number }[] = (editingObj as any).worldPoints;
        
        // Fallback/Migration
        if (!worldPts) {
          const pts: { x: number; y: number }[] = (editingObj as any).points || [
            { x: (editingObj as any).x1 ?? 0, y: (editingObj as any).y1 ?? 0 },
            { x: (editingObj as any).x2 ?? (editingObj.width || 0), y: (editingObj as any).y2 ?? (editingObj.height || 0) },
          ];
          const oldT = editingObj.calcTransformMatrix();
          worldPts = pts.map((p) => fabric.util.transformPoint(p, oldT));
          (editingObj as any).worldPoints = worldPts;
        }

        const vpt = fc.viewportTransform;

        const rect = containerRef.current?.getBoundingClientRect();
        const canvasScreenX = rect ? e.clientX - rect.left : e.clientX;
        const canvasScreenY = rect ? e.clientY - rect.top : e.clientY;

        let hitPointIndex = -1;
        worldPts.forEach((p, idx) => {
          const sp = vpt
            ? {
                x: vpt[0] * p.x + vpt[2] * p.y + vpt[4],
                y: vpt[1] * p.x + vpt[3] * p.y + vpt[5],
              }
            : p;

          const dist = Math.hypot(sp.x - canvasScreenX, sp.y - canvasScreenY);
          if (dist <= 10) {
            hitPointIndex = idx;
          }
        });

        if (hitPointIndex >= 0) {
          selectedPointIndexRef.current = hitPointIndex;
          isDraggingPointRef.current = true;
          dragStartStateRef.current = {
            left: editingObj.left || 0,
            top: editingObj.top || 0,
            width: editingObj.width || 1,
            height: editingObj.height || 1,
            points: JSON.parse(JSON.stringify((editingObj as any).points || [])),
          };
          if (fc.getActiveObject() !== editingObj) {
            fc.setActiveObject(editingObj);
          }
          fc.requestRenderAll();
          return;
        }

        // Check if clicking near path segment (within 10 screen px)
        const zoom = fc.getZoom() || 1;
        const closest = getClosestPointOnCatmullPath(worldPts, pointer, zoom);

        if (closest && closest.distanceScreen <= 10) {
          const newWorldPt = closest.point;
          const insertIndex = closest.segmentIndex + 1;
          const newWorldPts = [...worldPts];
          newWorldPts.splice(insertIndex, 0, newWorldPt);

          dragStartStateRef.current = {
            left: editingObj.left || 0,
            top: editingObj.top || 0,
            width: editingObj.width || 1,
            height: editingObj.height || 1,
            points: JSON.parse(JSON.stringify((editingObj as any).points || [])),
          };

          updateRoughObjectInPlace(editingObj, {
            worldPoints: newWorldPts,
          });

          selectedPointIndexRef.current = insertIndex;
          isDraggingPointRef.current = true;
          hoverInsertionPointRef.current = null;
          if (fc.getActiveObject() !== editingObj) {
            fc.setActiveObject(editingObj);
          }
          fc.requestRenderAll();
          return;
        }

        // Clicked away from points and path segment
        const targetObj = getPointerTarget(fc, e);
        if (targetObj === editingObj) {
          return;
        }
        if (editingPathObjRef.current) {
          editingPathObjRef.current.set({ hasControls: true, lockMovementX: false, lockMovementY: false });
        }
        editingPathObjRef.current = null;
        selectedPointIndexRef.current = null;
        hoverInsertionPointRef.current = null;
        fc.requestRenderAll();
      }
      return;
    }

    // Clean up any un-finalized orphan preview shape before starting a new one
    if (drawingSessionRef.current.active) {
      const oldShape = drawingSessionRef.current.tempShape;
      if (fc && oldShape) {
        fc.remove(oldShape);
        fc.requestRenderAll();
      }
      if (capturedElementRef.current && drawingSessionRef.current.pointerId !== null) {
        try {
          capturedElementRef.current.releasePointerCapture(drawingSessionRef.current.pointerId);
        } catch {
          // Pointer capture release safety
        }
        capturedElementRef.current = null;
      }
      drawingSessionRef.current = {
        active: false,
        pointerId: null,
        tool: null,
        startPoint: null,
        tempShape: null,
        lastProps: null,
      };
    }

    let p = { x: pointer.x, y: pointer.y };
    if (grid.snapToGrid) {
      p = snapPointToGrid(p, grid.size);
    }

    if (activeTool === 'text') {
      const targetObj = getPointerTarget(fc, e);
      if (targetObj && (targetObj.type === 'i-text' || targetObj.type === 'text' || targetObj.type === 'textbox')) {
        fc.setActiveObject(targetObj);
        if ('enterEditing' in targetObj && typeof (targetObj as any).enterEditing === 'function') {
          (targetObj as any).enterEditing();
        }
        fc.renderAll();
        if (!isToolLockedRef.current) {
          setActiveTool('select');
          activeToolRef.current = 'select';
        }
        return;
      }

      const itext = new fabric.IText('', {
        left: p.x,
        top: p.y,
        fill: strokeColor,
        fontSize: fontSize || 24,
        fontFamily: fontFamily || 'Caveat, cursive',
        fontWeight: fontWeight || 'normal',
        fontStyle: fontStyle || 'normal',
        underline: !!underline,
        linethrough: !!linethrough,
        textAlign: textAlign || 'left',
        charSpacing: (letterSpacing || 0) * 20,
        lineHeight: lineHeight || 1.16,
        opacity,
        layerId: activeLayerIdRef.current,
        shapeType: 'text',
        colorSource: strokeColorSourceRef.current,
        editingEvent: 'dblclick',
      } as any);

      itext.on('editing:exited', () => {
        if (!itext.text || itext.text.trim() === '') {
          fc.remove(itext);
          fc.renderAll();
        } else {
          saveHistoryState();
        }
      });

      fc.add(itext);
      fc.setActiveObject(itext);
      itext.enterEditing();
      itext.selectAll();
      fc.renderAll();

      if (!isToolLockedRef.current) {
        setActiveTool('select');
        activeToolRef.current = 'select';
      }
      return;
    }

    // Custom Shapes interaction pipeline
    const isShapeTool = [
      'rectangle',
      'rounded-rect',
      'circle',
      'ellipse',
      'triangle',
      'line',
      'arrow',
      'star',
      'polygon',
      'diamond',
    ].includes(activeTool);

    if (isShapeTool) {
      const sketchProps = {
        drawingStyle: drawingStyleRef.current,
        roughness: roughnessRef.current,
        bowing: bowingRef.current,
        fillStyle: fillStyleRef.current,
        hachureGap: hachureGapRef.current,
        strokeStyle: strokeStyleRef.current,
        edges: edgesRef.current,
        stroke: strokeColorRef.current,
        fill: fillColorRef.current,
        strokeWidth: strokeWidthRef.current,
        opacity: opacity,
        layerId: activeLayerIdRef.current,
        colorSource: strokeColorSourceRef.current,
      };

      const isLine = activeTool === 'line' || activeTool === 'arrow';
      const shape = createRoughShape({
        shapeType: activeTool as any,
        left: p.x,
        top: p.y,
        width: 2,
        height: 2,
        ...(isLine ? { worldPoints: [{ x: p.x, y: p.y }, { x: p.x, y: p.y }] } : {
          x1: 0,
          y1: 0,
          x2: 2,
          y2: 2,
        }),
        rx: 3,
        ry: 3,
        ...sketchProps,
      });

      if (shape) {
        shape.set('objectCaching', false);
        if (typeof (shape as any).getObjects === 'function') {
          (shape as any).getObjects().forEach((child: any) => child.set('objectCaching', false));
        }

        drawingSessionRef.current = {
          active: true,
          pointerId: e.pointerId,
          tool: activeTool,
          startPoint: p,
          tempShape: shape,
          lastProps: null,
        };

        const targetEl = e.currentTarget as HTMLElement;
        if (targetEl && typeof targetEl.setPointerCapture === 'function') {
          try {
            targetEl.setPointerCapture(e.pointerId);
            capturedElementRef.current = targetEl;
          } catch {
            // Pointer capture safety
          }
        }

        fc.add(shape);
        fc.renderAll();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (eraserRingRef.current) {
      eraserRingRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    }

    const isErasing =
      (isRightClickEraserRef.current && (e.buttons & 2) !== 0) ||
      (activeToolRef.current === 'eraser' && (e.buttons & 1) !== 0);

    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const pointer = fc.getScenePoint(e.nativeEvent);

    if (isErasing) {
      performContinuousErase(pointer);
      return;
    }

    setCursorScreenPos({ x: e.clientX, y: e.clientY });
    setCursorPos(pointer.x, pointer.y);

    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };

      const vpt = fc.viewportTransform;
      if (vpt) {
        vpt[4] += dx;
        vpt[5] += dy;
        fc.requestRenderAll();
        commitViewportToReact(vpt);
      }
      return;
    }

    if (editingPathObjRef.current) {
      const editingObj = editingPathObjRef.current;
      let worldPts: { x: number; y: number }[] = (editingObj as any).worldPoints;
      
      if (!worldPts) {
        const pts: { x: number; y: number }[] = (editingObj as any).points || [
          { x: (editingObj as any).x1 ?? 0, y: (editingObj as any).y1 ?? 0 },
          { x: (editingObj as any).x2 ?? (editingObj.width || 0), y: (editingObj as any).y2 ?? (editingObj.height || 0) },
        ];
        const oldT = editingObj.calcTransformMatrix();
        worldPts = pts.map((p) => fabric.util.transformPoint(p, oldT));
        (editingObj as any).worldPoints = worldPts;
      }

      if (isDraggingPointRef.current && selectedPointIndexRef.current !== null) {
        const idx = selectedPointIndexRef.current;
        const newWorldPts = [...worldPts];
        newWorldPts[idx] = { x: pointer.x, y: pointer.y };

        updateRoughObjectInPlace(editingObj, {
          worldPoints: newWorldPts,
        });

        fc.requestRenderAll();
        return;
      } else {
        const zoom = fc.getZoom() || 1;
        const closest = getClosestPointOnCatmullPath(worldPts, pointer, zoom);

        if (closest && closest.distanceScreen <= 10) {
          hoverInsertionPointRef.current = { point: closest.point, segmentIndex: closest.segmentIndex };
        } else {
          hoverInsertionPointRef.current = null;
        }
        fc.requestRenderAll();
      }
    }

    const session = drawingSessionRef.current;
    if (!session.active || session.pointerId !== e.pointerId || !session.startPoint || !session.tempShape) return;

    const isPrimaryDown = (e.buttons & 1) === 1;
    if (!isPrimaryDown) {
      handlePointerUp(e);
      return;
    }

    let current = { x: pointer.x, y: pointer.y };
    if (grid.snapToGrid) {
      current = snapPointToGrid(current, grid.size);
    }

    const isShiftPressed = !!(e.nativeEvent as PointerEvent).shiftKey;
    const start = session.startPoint;
    const shape = session.tempShape;
    const currentTool = session.tool || activeTool;

    let updatedProps: any = {};

    if (currentTool === 'line' || currentTool === 'arrow') {
      if (isShiftPressed) {
        current = snapAngle45(start, current);
      }
      updatedProps = {
        worldPoints: [start, current]
      };
    } else {
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      let w = Math.max(2, Math.abs(dx));
      let h = Math.max(2, Math.abs(dy));

      const isSquare = isShiftPressed;
      if (isSquare) {
        const maxDim = Math.max(w, h);
        w = maxDim;
        h = maxDim;
      }

      const left = dx >= 0 ? start.x : start.x - w;
      const top = dy >= 0 ? start.y : start.y - h;

      switch (currentTool) {
        case 'rectangle':
        case 'rounded-rect':
          updatedProps = { left, top, width: w, height: h, rx: 3, ry: 3 };
          break;

        case 'circle':
        case 'ellipse':
          updatedProps = { left, top, width: w, height: h };
          break;

        case 'triangle':
          updatedProps = { left, top, width: w, height: h };
          break;

        case 'star':
          updatedProps = {
            left,
            top,
            width: w,
            height: h,
            points: createStarPointsRelative(w, h),
          };
          break;

        case 'polygon':
          updatedProps = {
            left,
            top,
            width: w,
            height: h,
            points: createPolygonPointsRelative(w, h),
          };
          break;

        case 'diamond':
          updatedProps = {
            left,
            top,
            width: w,
            height: h,
            points: createDiamondPointsRelative(w, h),
          };
          break;
      }
    }

    if (shape && (shape as any).isRoughObject) {
      session.lastProps = updatedProps;
      (shape as any).lastUpdatedProps = updatedProps;

      // Update in place during drag to avoid removing/re-adding object and churning React state
      updateRoughObjectInPlace(shape, {
        ...updatedProps,
        scaleX: 1,
        scaleY: 1,
      });

      fc.requestRenderAll();
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    resetPointerTracking();

    if (isDraggingPointRef.current) {
      isDraggingPointRef.current = false;
      dragStartStateRef.current = null;
      saveHistoryState();
    }

    if (e && e.button === 2) {
      return;
    }

    if (isRightClickEraserRef.current && (!e || (e.buttons & 2) === 0)) {
      finishRightClickEraser();
    }

    if (activeToolRef.current === 'eraser') {
      flushEraserQueue();
      saveHistoryState();
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      const cursor = getToolCursor(activeTool, isSpacePressedRef.current, isTextEditingRef.current);
      if (containerRef.current) containerRef.current.style.cursor = cursor;
      const fc = fabricCanvasRef.current;
      if (fc) {
        fc.defaultCursor = cursor;
        fc.hoverCursor = cursor;
        restoreSelectionVisuals(fc);
      }
    }

    // Atomic Finalization of Shape Drawing Session
    if (drawingSessionRef.current.active) {
      if (e && drawingSessionRef.current.pointerId !== null && e.pointerId !== undefined && drawingSessionRef.current.pointerId !== e.pointerId) {
        return;
      }

      if (capturedElementRef.current && drawingSessionRef.current.pointerId !== null) {
        try {
          capturedElementRef.current.releasePointerCapture(drawingSessionRef.current.pointerId);
        } catch {
          // Pointer capture release safety
        }
        capturedElementRef.current = null;
      }

      const session = { ...drawingSessionRef.current };
      drawingSessionRef.current = {
        active: false,
        pointerId: null,
        tool: null,
        startPoint: null,
        tempShape: null,
        lastProps: null,
      };

      const fc = fabricCanvasRef.current;
      const shape = session.tempShape;
      const start = session.startPoint;
      const lastProps = session.lastProps || (shape && (shape as any).lastUpdatedProps);
      const currentTool = session.tool || activeToolRef.current;

      if (fc && shape) {
        let finalProps = lastProps;
        const isSingleClick = !lastProps || (lastProps.width < 10 && lastProps.height < 10);

        if (isSingleClick && start) {
          const shapeType = (shape as any).shapeType || currentTool;
          let defaultW = 150;
          let defaultH = 100;

          if (['circle', 'star', 'polygon'].includes(shapeType)) {
            defaultW = 120;
            defaultH = 120;
          } else if (shapeType === 'triangle') {
            defaultW = 120;
            defaultH = 100;
          }

          if (shapeType === 'line' || shapeType === 'arrow') {
            finalProps = {
              worldPoints: [{ x: start.x, y: start.y }, { x: start.x + 120, y: start.y }]
            };
          } else if (shapeType === 'star') {
            finalProps = {
              left: start.x - 60,
              top: start.y - 60,
              width: 120,
              height: 120,
              points: createStarPointsRelative(120, 120),
            };
          } else if (shapeType === 'polygon') {
            finalProps = {
              left: start.x - 60,
              top: start.y - 60,
              width: 120,
              height: 120,
              points: createPolygonPointsRelative(120, 120),
            };
          } else if (shapeType === 'diamond') {
            finalProps = {
              left: start.x - defaultW / 2,
              top: start.y - defaultH / 2,
              width: defaultW,
              height: defaultH,
              points: createDiamondPointsRelative(defaultW, defaultH),
            };
          } else {
            finalProps = {
              left: start.x - defaultW / 2,
              top: start.y - defaultH / 2,
              width: defaultW,
              height: defaultH,
              rx: 3,
              ry: 3,
            };
          }
        }

        const finalShape = updateRoughObject(fc, shape, {
          ...finalProps,
          scaleX: 1,
          scaleY: 1,
        });

        if (finalShape) {
          if ((finalShape as any).shapeType === 'arrow') {
            const worldPts = (finalShape as any).worldPoints;
            if (worldPts && worldPts.length >= 2) {
              const startPt = worldPts[0];
              const endPt = worldPts[worldPts.length - 1];
              tryAutoConnectArrow(fc, finalShape, startPt, endPt);
            }
          }
          fc.setActiveObject(finalShape);
          finalizeShapeRendering(finalShape, fc);
        }

        updateSelectedState();
        saveHistoryState();
      }

      const isShapeTool = [
        'rectangle',
        'rounded-rect',
        'circle',
        'ellipse',
        'triangle',
        'line',
        'arrow',
        'star',
        'polygon',
        'diamond',
      ].includes(currentTool);

      if (isShapeTool && !isToolLockedRef.current) {
        setActiveTool('select');
      }
    }
  };

  const handlePointerCancel = (_e?: React.PointerEvent) => {
    if (capturedElementRef.current && drawingSessionRef.current.pointerId !== null) {
      try {
        capturedElementRef.current.releasePointerCapture(drawingSessionRef.current.pointerId);
      } catch {
        // Pointer capture release safety
      }
      capturedElementRef.current = null;
    }

    if (drawingSessionRef.current.active) {
      const shape = drawingSessionRef.current.tempShape;
      const fc = fabricCanvasRef.current;
      if (fc && shape) {
        fc.remove(shape);
        fc.requestRenderAll();
      }
      drawingSessionRef.current = {
        active: false,
        pointerId: null,
        tool: null,
        startPoint: null,
        tempShape: null,
        lastProps: null,
      };
    }
  };

  useEffect(() => {
    const handleGlobalBlurOrCancel = () => {
      const fc = fabricCanvasRef.current;
      // Abort custom shape session if active
      if (drawingSessionRef.current.active) {
        const shape = drawingSessionRef.current.tempShape;
        if (fc && shape) {
          fc.remove(shape);
          fc.requestRenderAll();
        }
        if (capturedElementRef.current && drawingSessionRef.current.pointerId !== null) {
          try {
            capturedElementRef.current.releasePointerCapture(drawingSessionRef.current.pointerId);
          } catch {
            // Pointer capture release safety
          }
          capturedElementRef.current = null;
        }
        drawingSessionRef.current = {
          active: false,
          pointerId: null,
          tool: null,
          startPoint: null,
          tempShape: null,
          lastProps: null,
        };
      }

      // Reset Fabric brush state if drawing mode active
      if (fc && fc.isDrawingMode) {
        if (fc.freeDrawingBrush && typeof (fc.freeDrawingBrush as any).abort === 'function') {
          (fc.freeDrawingBrush as any).abort();
        }
        if ((fc as any)._isCurrentlyDrawing) {
          (fc as any)._isCurrentlyDrawing = false;
        }
        const ctx = fc.contextTop;
        if (ctx) {
          fc.clearContext(ctx);
        }
        fc.requestRenderAll();
      }
    };

    window.addEventListener('blur', handleGlobalBlurOrCancel);
    window.addEventListener('pointercancel', handleGlobalBlurOrCancel);

    return () => {
      window.removeEventListener('blur', handleGlobalBlurOrCancel);
      window.removeEventListener('pointercancel', handleGlobalBlurOrCancel);
    };
  }, []);

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (isRightClickEraserRef.current && (e.button === 2 || (e.buttons & 2) === 0)) {
        finishRightClickEraser();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [finishRightClickEraser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressedRef.current && document.activeElement?.tagName !== 'INPUT') {
        isSpacePressedRef.current = true;
        window.dispatchEvent(new CustomEvent('app:panning-state', { detail: { isPanning: true } }));
        const cursor = getGrabCursor();
        if (containerRef.current) containerRef.current.style.cursor = cursor;
        const fc = fabricCanvasRef.current;
        if (fc) {
          fc.defaultCursor = cursor;
          fc.freeDrawingCursor = cursor;
          fc.hoverCursor = cursor;
          fc.skipTargetFind = true;
          if (fc.upperCanvasEl) fc.upperCanvasEl.style.cursor = cursor;
          hideSelectionVisuals(fc);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        window.dispatchEvent(new CustomEvent('app:panning-state', { detail: { isPanning: false } }));
        const cursor = getToolCursor(activeTool, false, isTextEditingRef.current);
        if (containerRef.current) containerRef.current.style.cursor = cursor;
        const fc = fabricCanvasRef.current;
        if (fc) {
          fc.defaultCursor = cursor;
          fc.freeDrawingCursor = cursor;
          fc.hoverCursor = cursor;
          fc.skipTargetFind = activeTool !== 'select' && activeTool !== 'text';
          if (fc.upperCanvasEl) fc.upperCanvasEl.style.cursor = cursor;
          restoreSelectionVisuals(fc);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool]);

  useEffect(() => {
    if (!onCanvasReady) return;

    const canvasRefObj: DrawingCanvasRef = {
      getFabricCanvas: () => fabricCanvasRef.current,
      openPdfDocumentMode: handleOpenDocumentMode,
      setPdfPage: handlePdfPageChange,
      undo,
      redo,
      deleteSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        if (editingPathObjRef.current && selectedPointIndexRef.current !== null) {
          const obj = editingPathObjRef.current;
          const selectedIdx = selectedPointIndexRef.current;
          const pts: { x: number; y: number }[] = (obj as any).points || [];
          if (pts.length > 2 && selectedIdx >= 0 && selectedIdx < pts.length) {
            const left = obj.left || 0;
            const top = obj.top || 0;
            const worldPts = pts.map((p) => ({ x: left + p.x, y: top + p.y }));
            worldPts.splice(selectedIdx, 1);

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            worldPts.forEach((pt) => {
              minX = Math.min(minX, pt.x);
              minY = Math.min(minY, pt.y);
              maxX = Math.max(maxX, pt.x);
              maxY = Math.max(maxY, pt.y);
            });

            const newLeft = minX;
            const newTop = minY;
            const newW = Math.max(2, maxX - minX);
            const newH = Math.max(2, maxY - minY);
            const relPoints = worldPts.map((pt) => ({ x: pt.x - minX, y: pt.y - minY }));

            updateRoughObjectInPlace(obj, {
              left: newLeft,
              top: newTop,
              width: newW,
              height: newH,
              points: relPoints,
              x1: relPoints[0].x,
              y1: relPoints[0].y,
              x2: relPoints[relPoints.length - 1].x,
              y2: relPoints[relPoints.length - 1].y,
            });

            selectedPointIndexRef.current = null;
            hoverInsertionPointRef.current = null;
            fc.requestRenderAll();
            saveHistoryState();
            return;
          }
        }

        const active = fc.getActiveObjects();
        if (active.length > 0) {
          const extraConnectorsToRemove = cleanupGraphOnDelete(fc, active);
          extraConnectorsToRemove.forEach((conn) => fc.remove(conn));
          active.forEach((obj: any) => {
            if (obj.isPdf && obj.id) {
              const prevController = pdfRenderControllersRef.current.get(obj.id);
              if (prevController) prevController.abort();
              unregisterPdf(obj.id);
            }
            fc.remove(obj);
          });
          fc.discardActiveObject();
          fc.renderAll();
          saveHistoryState();
        }
      },
      duplicateSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (!active) return;
        if ((active as any).isPdf) return; // Disallow duplicating PDFs

        active.clone(['id', 'isGroup', 'subTargetCheck', '_clipPathSvg', 'layerId', 'colorSource', 'isRoughObject', 'shapeType', 'drawingStyle', 'roughness', 'bowing', 'fillStyle', 'hachureGap', 'points', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'isConnector', 'sourceNodeId', 'targetNodeId', 'direction', 'sourceAnchor', 'targetAnchor', 'graphParents', 'graphChildren', 'graphArrows', 'graphNeighbors', ...ERASER_CUSTOM_PROPS]).then((cloned: fabric.Object) => {
          (cloned as any)._clipPathSvg = (active as any)._clipPathSvg;
          
          const generateNewIds = (obj: any) => {
            if (obj.id) {
              obj.id = `${obj.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }
            if (obj._objects && Array.isArray(obj._objects)) {
              obj._objects.forEach(generateNewIds);
            }
          };
          generateNewIds(cloned);

          cloned.set({
            left: (cloned.left || 0) + 20,
            top: (cloned.top || 0) + 20,
            layerId: activeLayerId,
          } as any);

          if (cloned.type === 'activeSelection') {
            (cloned as any).canvas = fc;
            (cloned as any).forEachObject((obj: fabric.Object) => fc.add(obj));
          } else {
            fc.add(cloned);
          }

          fc.setActiveObject(cloned);
          fc.renderAll();
          saveHistoryState();
        });
      },
      copySelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (!active || (active as any).isPdf) return;

        active.clone(['id', 'isGroup', 'subTargetCheck', '_clipPathSvg', 'layerId', 'colorSource', 'isRoughObject', 'shapeType', 'drawingStyle', 'roughness', 'bowing', 'fillStyle', 'hachureGap', 'points', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'isConnector', 'sourceNodeId', 'targetNodeId', 'direction', 'sourceAnchor', 'targetAnchor', 'graphParents', 'graphChildren', 'graphArrows', 'graphNeighbors', ...ERASER_CUSTOM_PROPS]).then((cloned: fabric.Object) => {
          (cloned as any)._clipPathSvg = (active as any)._clipPathSvg;
          clipboardRef.current = cloned;
        });
      },
      cutSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (!active || (active as any).isPdf) return;

        active.clone(['id', 'isGroup', 'subTargetCheck', '_clipPathSvg', 'layerId', 'colorSource', 'isRoughObject', 'shapeType', 'drawingStyle', 'roughness', 'bowing', 'fillStyle', 'hachureGap', 'points', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'isConnector', 'sourceNodeId', 'targetNodeId', 'direction', 'sourceAnchor', 'targetAnchor', 'graphParents', 'graphChildren', 'graphArrows', 'graphNeighbors', ...ERASER_CUSTOM_PROPS]).then((cloned: fabric.Object) => {
          (cloned as any)._clipPathSvg = (active as any)._clipPathSvg;
          clipboardRef.current = cloned;

          const activeList = fc.getActiveObjects();
          const extraConnectorsToRemove = cleanupGraphOnDelete(fc, activeList);
          extraConnectorsToRemove.forEach((conn) => fc.remove(conn));
          if (active.type === 'activeSelection') {
            (active as any).forEachObject((obj: fabric.Object) => fc.remove(obj));
          } else {
            fc.remove(active);
          }
          fc.discardActiveObject();
          fc.renderAll();
          saveHistoryState();
        });
      },
      pasteClipboard: () => {
        const fc = fabricCanvasRef.current;
        const cb = clipboardRef.current;
        if (!fc || !cb) return;

        cb.clone(['id', 'isGroup', 'subTargetCheck', '_clipPathSvg', 'layerId', 'colorSource', 'isRoughObject', 'shapeType', 'drawingStyle', 'roughness', 'bowing', 'fillStyle', 'hachureGap', 'points', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'isConnector', 'sourceNodeId', 'targetNodeId', 'direction', 'sourceAnchor', 'targetAnchor', 'graphParents', 'graphChildren', 'graphArrows', 'graphNeighbors', ...ERASER_CUSTOM_PROPS]).then((cloned: fabric.Object) => {
          (cloned as any)._clipPathSvg = (cb as any)._clipPathSvg;

          const generateNewIds = (obj: any) => {
            if (obj.id) {
              obj.id = `${obj.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }
            if (obj._objects && Array.isArray(obj._objects)) {
              obj._objects.forEach(generateNewIds);
            }
          };
          generateNewIds(cloned);

          cloned.set({
            left: (cloned.left || 0) + 24,
            top: (cloned.top || 0) + 24,
            layerId: activeLayerId,
          } as any);

          if (cloned.type === 'activeSelection') {
            (cloned as any).canvas = fc;
            (cloned as any).forEachObject((obj: fabric.Object) => fc.add(obj));
          } else {
            fc.add(cloned);
          }

          if (clipboardRef.current) {
            clipboardRef.current.top = (clipboardRef.current.top || 0) + 24;
            clipboardRef.current.left = (clipboardRef.current.left || 0) + 24;
          }

          fc.setActiveObject(cloned);
          fc.renderAll();
          saveHistoryState();
        });
      },
      cloneShapeWithArrow: (direction: 'up' | 'down' | 'left' | 'right') => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        handleKeyboardGraphGrowth(
          fc,
          direction,
          {
            strokeColor: strokeColorRef.current || '#1E293B',
            fillColor: fillColorRef.current || '#6366F1',
            strokeWidth: strokeWidthRef.current || 2,
            activeLayerId: activeLayerIdRef.current || 'layer-default',
            gap: 60,
          },
          saveHistoryState
        );
      },
      nudgeSelected: (dx: number, dy: number) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject();
        if (!activeObj) return;

        const targetId = (activeObj as any).id;
        if (targetId && isGraphNode(activeObj)) {
          const { descendantIds, affectedConnectorIds, objectMap } = getSubtreeData(targetId, fc);
          activeObj.set({
            left: (activeObj.left || 0) + dx,
            top: (activeObj.top || 0) + dy,
          });
          activeObj.setCoords();

          descendantIds.forEach((dId) => {
            const dObj = objectMap.get(dId);
            if (dObj) {
              dObj.set({
                left: (dObj.left || 0) + dx,
                top: (dObj.top || 0) + dy,
              });
              dObj.setCoords();
            }
          });

          if (affectedConnectorIds.size > 0) {
            affectedConnectorIds.forEach((connId) => {
              const connObj = objectMap.get(connId);
              if (connObj && isGraphConnector(connObj)) {
                const anyConn = connObj as any;
                const source = objectMap.get(anyConn.sourceNodeId);
                const targetNode = objectMap.get(anyConn.targetNodeId);
                if (source && targetNode) {
                  updateConnectorGeometry(fc, connObj, source, targetNode);
                }
              }
            });
          }
        } else {
          activeObj.set({
            left: (activeObj.left || 0) + dx,
            top: (activeObj.top || 0) + dy,
          });
          activeObj.setCoords();
        }

        fc.requestRenderAll();
        saveHistoryState();
      },
      clearSelection: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        fc.discardActiveObject();
        fc.requestRenderAll();
        updateSelectedState();
      },
      groupSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        
        const activeObjects = fc.getActiveObjects();
        if (activeObjects.length < 2) return;
        
        const active = fc.getActiveObject();
        if (active) {
          const objs = [...activeObjects];
          
          const layerId = (objs[0] as any).layerId || activeLayerIdRef.current;
          
          // Discard active object to restore children's absolute coordinates on the canvas
          fc.discardActiveObject();
          
          // Remove them from canvas
          objs.forEach((o: fabric.Object) => fc.remove(o));
          
          // Create the group (Fabric automatically calculates center and makes children relative)
          const group = new fabric.Group(objs, {
            id: `group-${Date.now()}`,
            shapeType: 'group',
            isGroup: true,
            layerId,
            subTargetCheck: false,
            interactive: false,
          } as any);
          
          fc.add(group);
          fc.setActiveObject(group);
          fc.requestRenderAll();
          updateSelectedState();
          saveHistoryState();
        }
      },
      ungroupSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject();
        
        if (activeObj && (activeObj.type === 'group' || (activeObj as any).isGroup)) {
          const objs = [...(activeObj as any).getObjects()];
          
          // Get absolute coordinates before destroying the group
          objs.forEach((obj: fabric.Object) => {
             const matrix = obj.calcTransformMatrix();
             const options = fabric.util.qrDecompose(matrix);
             
             obj.set({
               left: options.translateX,
               top: options.translateY,
               scaleX: options.scaleX,
               scaleY: options.scaleY,
               angle: options.angle,
               skewX: options.skewX,
               skewY: options.skewY,
             });
          });

          fc.remove(activeObj);
          objs.forEach((obj: fabric.Object) => fc.add(obj));
          
          const sel = new fabric.ActiveSelection(objs, { canvas: fc });
          fc.setActiveObject(sel);
          fc.requestRenderAll();
          updateSelectedState();
          saveHistoryState();
        }
      },
      selectAll: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const sel = new fabric.ActiveSelection(fc.getObjects(), { canvas: fc });
        fc.setActiveObject(sel);
        fc.renderAll();
      },
      importImage: (file: File) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        const reader = new FileReader();
        reader.onload = (f) => {
          const dataUrl = f.target?.result as string;
          fabric.FabricImage.fromURL(dataUrl).then((img) => {
            const maxDim = 400;
            if ((img.width || 0) > maxDim || (img.height || 0) > maxDim) {
              img.scaleToWidth(maxDim);
            }

            img.set({
              layerId: activeLayerIdRef.current,
              shapeType: 'image',
            } as any);

            fc.add(img);
            fc.viewportCenterObject(img);
            const currentZoom = fc.getZoom() || 1.0;
            img.set({
              left: img.left! - 160 / currentZoom,
            });
            img.setCoords();
            fc.setActiveObject(img);
            fc.renderAll();
            saveHistoryState();
            setActiveTool('select');
          });
        };
        reader.readAsDataURL(file);
      },
      importPdf: async (file: File) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfBase64 = arrayBufferToBase64(arrayBuffer);
          const pdfId = `pdf-${Date.now()}`;
          const { numPages } = await registerPdf(pdfId, arrayBuffer);
          const { canvas: sourceCanvas, width, height } = await renderPdfPageToCanvas(pdfId, 1);

          const displayCanvas = document.createElement('canvas');
          displayCanvas.width = width;
          displayCanvas.height = height;
          const ctx = displayCanvas.getContext('2d');
          if (!ctx) throw new Error('Unable to create PDF display canvas');
          ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, width, height);

          const img = new fabric.FabricImage(displayCanvas);

          const currentZoom = fc.getZoom() || 1.0;
          const vpWidth = fc.width || window.innerWidth;
          const vpHeight = fc.height || window.innerHeight;

          // Target size: fit comfortably within current view
          const availableHeight = Math.max(300, (vpHeight - 160) / currentZoom);
          const availableWidth = Math.max(300, (vpWidth - 440) / currentZoom);

          const fitScale = Math.min(0.65, Math.min(availableWidth / width, availableHeight / height));

          img.set({
            id: pdfId,
            scaleX: fitScale,
            scaleY: fitScale,
            layerId: activeLayerIdRef.current,
            shapeType: 'pdf',
            isPdf: true,
            currentPage: 1,
            numPages,
            pdfFileSize: file.size,
            pdfBase64,
            name: file.name,
            isPdfLocked: false,
          } as any);

          fc.add(img);
          fc.viewportCenterObject(img);
          img.set({
            left: img.left! - 160 / currentZoom,
          });
          img.setCoords();
          fc.setActiveObject(img);
          fc.renderAll();
          saveHistoryState();

            setSelectedPdfInfo({
              currentPage: 1,
              numPages,
              isLocked: false,
            });
        } catch (err) {
          console.error('Failed to import PDF:', err);
        }
      },
      selectCanvasObject: (id: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const target = fc.getObjects().find((o: any) => o.id === id);
        if (target) {
          fc.discardActiveObject();
          fc.setActiveObject(target);
          fc.requestRenderAll();
          
          // Fire event so Properties Inspector and Layers Panel update
          fc.fire('selection:updated', { selected: [target], deselected: [] });
          window.dispatchEvent(new CustomEvent('app:canvas-changed'));

          // Center the object in the viewport using existing pan architecture
          const center = target.getCenterPoint();
          const zoom = fc.getZoom();
          const vpt = fc.viewportTransform;
          if (!vpt) return;

          const viewportWidth = fc.getWidth();
          const viewportHeight = fc.getHeight();

          const targetPanX = viewportWidth / 2 - center.x * zoom;
          const targetPanY = viewportHeight / 2 - center.y * zoom;

          let animState = panAnimRef.current;
          if (!animState) {
            animState = {
              targetX: targetPanX,
              targetY: targetPanY,
              rafId: null
            };
            panAnimRef.current = animState;
          } else {
            animState.targetX = targetPanX;
            animState.targetY = targetPanY;
          }

          if (animState.rafId === null) {
            const animatePan = () => {
              const currentVpt = [...(fc.viewportTransform || [1, 0, 0, 1, 0, 0])] as [number, number, number, number, number, number];
              const currentX = currentVpt[4];
              const currentY = currentVpt[5];

              const diffX = animState!.targetX - currentX;
              const diffY = animState!.targetY - currentY;

              if (Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5) {
                currentVpt[4] = animState!.targetX;
                currentVpt[5] = animState!.targetY;
                fc.setViewportTransform(currentVpt);
                fc.requestRenderAll();
                gridOverlayRef.current?.updateViewport(currentVpt[0], currentVpt[4], currentVpt[5]);
                commitViewportToReact(currentVpt as any);
                animState!.rafId = null;
                return;
              }

              currentVpt[4] = currentX + diffX * 0.28;
              currentVpt[5] = currentY + diffY * 0.28;

              fc.setViewportTransform(currentVpt);
              fc.requestRenderAll();
              gridOverlayRef.current?.updateViewport(currentVpt[0], currentVpt[4], currentVpt[5]);
              commitViewportToReact(currentVpt as any);

              animState!.rafId = requestAnimationFrame(animatePan);
            };
            animState.rafId = requestAnimationFrame(animatePan);
          }
        }
      },
      getProjectJSON: () => getProjectJSON(),
      getCanvasObjects: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return [];
        
        const mapObject = (obj: any): any => {
          if (!obj.id) {
            obj.id = `obj-${Math.random().toString(36).substring(2, 9)}`;
          }
          const shapeType = obj.shapeType || obj.type;
          
          if (import.meta.env.DEV) {
            console.log(`[Metadata Audit] id: ${obj.id}, shapeType: ${obj.shapeType}, fallbackShapeType: ${shapeType}, layerId: ${obj.layerId}, fabricType: ${obj.type}, name: ${obj.name}`);
          }

          return {
            id: obj.id,
            layerId: obj.layerId || 'layer-default',
            shapeType: shapeType,
            name: obj.name,
            type: obj.type,
            isActive: fc.getActiveObjects().some((activeObj: any) => activeObj.id === obj.id),
            isGroup: obj.isGroup || obj.type === 'group',
            isPdf: obj.isPdf,
            isEraserMask: obj.isEraserMask,
            isRoughObject: obj.isRoughObject,
            objects: (shapeType === 'group' && obj._objects) ? obj._objects.map(mapObject) : undefined
          };
        };

        return fc.getObjects().map(mapObject);
      },
      moveCanvasObject: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after' | 'layer', targetLayerId?: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;

        // Recursive finder
        const findObjInfo = (objs: any[], id: string, parentGroup?: any): { obj: any; parent?: any } | null => {
          for (const o of objs) {
            if (o.id === id) return { obj: o, parent: parentGroup };
            if ((o.type === 'group' || o.isGroup) && o._objects) {
              const found = findObjInfo(o._objects, id, o);
              if (found) return found;
            }
          }
          return null;
        };
        
        const allObjs = fc.getObjects();
        const sourceInfo = findObjInfo(allObjs, sourceId);
        if (!sourceInfo) return;
        
        const { obj: sourceObj, parent: sourceParent } = sourceInfo;

        // Extract source object to absolute coordinates and remove from its current location
        if (sourceParent) {
          const matrix = sourceObj.calcTransformMatrix();
          const options = fabric.util.qrDecompose(matrix);
          sourceObj.set({
            left: options.translateX,
            top: options.translateY,
            scaleX: options.scaleX,
            scaleY: options.scaleY,
            angle: options.angle,
            skewX: options.skewX,
            skewY: options.skewY,
          });
          sourceParent.remove(sourceObj);
          // In Fabric 7, group bounds update automatically on remove/add. Wait, actually we might need to recreate the group or call addWithUpdate
        } else {
          fc.remove(sourceObj);
        }

        if (position === 'layer' && targetLayerId) {
           sourceObj.set({ layerId: targetLayerId });
           fc.add(sourceObj);
           fc.requestRenderAll();
           saveHistoryState();
           return;
        }
        
        const targetInfo = findObjInfo(fc.getObjects(), targetId);
        if (!targetInfo) {
           // fallback to canvas if target lost
           fc.add(sourceObj);
           return;
        }
        
        const { obj: targetObj, parent: targetParent } = targetInfo;
        
        if (position === 'before' || position === 'after') {
          if (targetParent) {
             const targetIndex = targetParent._objects.findIndex((o: any) => o === targetObj);
             if (position === 'before') {
               targetParent.insertAt(Math.max(0, targetIndex), sourceObj);
             } else {
               targetParent.insertAt(Math.min(targetParent._objects.length, targetIndex + 1), sourceObj);
             }
          } else {
             const targetIndex = fc.getObjects().findIndex(o => o === targetObj);
             if (position === 'before') {
               fc.insertAt(Math.max(0, targetIndex), sourceObj);
             } else {
               fc.insertAt(Math.min(fc.getObjects().length, targetIndex + 1), sourceObj);
             }
          }
        } else if (position === 'inside') {
          if (targetObj.type === 'group' || targetObj.isGroup) {
             const group = targetObj as fabric.Group;
             group.add(sourceObj);
             // Note: Fabric 7 group.add handles adding with absolute coordinates properly!
          } else {
             fc.add(sourceObj);
          }
        }
        
        fc.requestRenderAll();
        saveHistoryState();
      },
      loadProjectJSON: (jsonString: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        isStateRestoringRef.current = true;
        fc.loadFromJSON(jsonString, canvasReviver).then(() => {
          const objects = fc.getObjects();
          objects.forEach((obj: any) => {
            if (obj.isPdf && obj.pdfBase64 && obj.id) {
              try {
                const buffer = base64ToArrayBuffer(obj.pdfBase64);
                registerPdf(obj.id, buffer);
              } catch (err) {
                console.error('Failed to register embedded PDF on load:', err);
              }
            }

            // One-time legacy migration on load
            if (obj.colorSource == null) {
              let colorToCheck = obj.stroke;
              if (isTextObject(obj)) {
                colorToCheck = obj.fill;
              }
              obj.colorSource = getLegacyColorSource(colorToCheck);
            }

            if (obj.colorSource === 'theme-default') {
              const newColor = getDefaultColorForTheme(resolvedTheme);
              if (isTextObject(obj)) {
                obj.set('fill', newColor);
              } else if (obj.isRoughObject) {
                updateRoughObject(fc, obj as fabric.Object, { stroke: newColor, strokeColor: newColor });
              } else {
                obj.set('stroke', newColor);
              }
            }

            if (obj.isMarker) {
              if (obj.stroke && typeof obj.stroke === 'string' && obj.stroke.startsWith('rgba')) {
                const rgbaMatch = obj.stroke.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (rgbaMatch) {
                  const r = parseInt(rgbaMatch[1], 10);
                  const g = parseInt(rgbaMatch[2], 10);
                  const b = parseInt(rgbaMatch[3], 10);
                  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                  obj.set('stroke', hex);
                }
              }
              obj.set({
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
              });
            }
          });
          fc.renderAll();
          isStateRestoringRef.current = false;
          updateSelectedState();
          saveHistoryState();
        });
      },
      updateGeometry: (props: { width?: number; height?: number; left?: number; top?: number; angle?: number }) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject() as any;
        if (!activeObj) return;

        const currentWidth = Math.round(((activeObj as any).targetWidth || activeObj.width || 0) * (activeObj.scaleX || 1));
        const currentHeight = Math.round(((activeObj as any).targetHeight || activeObj.height || 0) * (activeObj.scaleY || 1));

        if (activeObj.isRoughObject) {
          activeObj.set({ scaleX: 1, scaleY: 1 });
          updateRoughObject(fc, activeObj, {
            left: props.left !== undefined ? props.left : activeObj.left,
            top: props.top !== undefined ? props.top : activeObj.top,
            width: props.width !== undefined ? props.width : currentWidth,
            height: props.height !== undefined ? props.height : currentHeight,
            angle: props.angle !== undefined ? props.angle : (activeObj.angle || 0),
          });
        } else {
          if (props.left !== undefined) activeObj.set('left', props.left);
          if (props.top !== undefined) activeObj.set('top', props.top);
          if (props.angle !== undefined) activeObj.set('angle', props.angle);

          if (props.width !== undefined) {
            const baseW = activeObj.width || 1;
            activeObj.set('scaleX', props.width / baseW);
          }
          if (props.height !== undefined) {
            const baseH = activeObj.height || 1;
            activeObj.set('scaleY', props.height / baseH);
          }

          activeObj.setCoords();
          fc.requestRenderAll();
        }
        updateSelectedState();
        saveHistoryState();
      },
      updateCornerRadius: (rx: number, ry: number) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject() as any;
        if (!activeObj) return;

        if (activeObj.isRoughObject) {
          updateRoughObject(fc, activeObj, {
            rx,
            ry,
            edges: 'rounded',
          });
        } else {
          activeObj.set({ rx, ry });
          activeObj.setCoords();
          fc.requestRenderAll();
        }
        updateSelectedState();
        saveHistoryState();
      },
      flipSelected: (direction: 'horizontal' | 'vertical') => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject();
        if (!activeObj) return;

        if (direction === 'horizontal') {
          activeObj.set('flipX', !activeObj.flipX);
        } else {
          activeObj.set('flipY', !activeObj.flipY);
        }
        activeObj.setCoords();
        fc.requestRenderAll();
        saveHistoryState();
      },
      resetRotation: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject() as any;
        if (!activeObj) return;

        if (activeObj.isRoughObject) {
          updateRoughObject(fc, activeObj, { angle: 0 });
        } else {
          activeObj.set('angle', 0);
          activeObj.setCoords();
          fc.requestRenderAll();
        }
        updateSelectedState();
        saveHistoryState();
      },
      toggleLockSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObjs = fc.getActiveObjects();
        if (activeObjs.length === 0) return;

        const isAnyUnlocked = activeObjs.some((o) => !(o as any).locked);
        const shouldLock = isAnyUnlocked;

        activeObjs.forEach((o) => {
          (o as any).locked = shouldLock;
          o.set({
            lockMovementX: shouldLock,
            lockMovementY: shouldLock,
            lockRotation: shouldLock,
            lockScalingX: shouldLock,
            lockScalingY: shouldLock,
            lockSkewingX: shouldLock,
            lockSkewingY: shouldLock,
            hasControls: !shouldLock,
            selectable: true,
            evented: true,
          });
        });

        fc.requestRenderAll();
        updateSelectedState();
        saveHistoryState();
      },
      toggleHideSelected: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObjs = fc.getActiveObjects();
        if (activeObjs.length === 0) return;

        const isAnyVisible = activeObjs.some((o) => !(o as any).isHiddenGhost);
        const shouldHide = isAnyVisible;

        activeObjs.forEach((o) => {
          if (shouldHide) {
            if ((o as any).originalOpacity === undefined) {
              (o as any).originalOpacity = o.opacity ?? 1;
            }
            (o as any).isHiddenGhost = true;
            o.set({
              opacity: 0.15,
              visible: true,
            });
          } else {
            (o as any).isHiddenGhost = false;
            const restoredOpacity = (o as any).originalOpacity ?? 1;
            o.set({
              opacity: restoredOpacity,
              visible: true,
            });
          }
        });

        fc.requestRenderAll();
        updateSelectedState();
        saveHistoryState();
      },
      alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObjs = fc.getActiveObjects();
        if (activeObjs.length < 2) return;

        const bboxes = activeObjs.map((o) => o.getBoundingRect());
        const minX = Math.min(...bboxes.map((b) => b.left));
        const maxX = Math.max(...bboxes.map((b) => b.left + b.width));
        const minY = Math.min(...bboxes.map((b) => b.top));
        const maxY = Math.max(...bboxes.map((b) => b.top + b.height));

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        activeObjs.forEach((o, i) => {
          const b = bboxes[i];
          if (alignment === 'left') o.set('left', minX);
          else if (alignment === 'center') o.set('left', midX - b.width / 2);
          else if (alignment === 'right') o.set('left', maxX - b.width);
          else if (alignment === 'top') o.set('top', minY);
          else if (alignment === 'middle') o.set('top', midY - b.height / 2);
          else if (alignment === 'bottom') o.set('top', maxY - b.height);
          o.setCoords();
        });
        fc.requestRenderAll();
        updateSelectedState();
        saveHistoryState();
      },
      distributeSelected: (direction: 'horizontal' | 'vertical') => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObjs = fc.getActiveObjects();
        if (activeObjs.length < 3) return;

        if (direction === 'horizontal') {
          const sorted = [...activeObjs].sort((a, b) => (a.left || 0) - (b.left || 0));
          const firstLeft = sorted[0].left || 0;
          const lastLeft = sorted[sorted.length - 1].left || 0;
          const step = (lastLeft - firstLeft) / (sorted.length - 1);
          sorted.forEach((o, idx) => {
            o.set('left', firstLeft + step * idx);
            o.setCoords();
          });
        } else {
          const sorted = [...activeObjs].sort((a, b) => (a.top || 0) - (b.top || 0));
          const firstTop = sorted[0].top || 0;
          const lastTop = sorted[sorted.length - 1].top || 0;
          const step = (lastTop - firstTop) / (sorted.length - 1);
          sorted.forEach((o, idx) => {
            o.set('top', firstTop + step * idx);
            o.setCoords();
          });
        }
        fc.requestRenderAll();
        updateSelectedState();
        saveHistoryState();
      },
      bringToFront: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (active) {
          fc.bringObjectToFront(active);
          fc.requestRenderAll();
          saveHistoryState();
        }
      },
      sendToBack: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (active) {
          fc.sendObjectToBack(active);
          fc.requestRenderAll();
          saveHistoryState();
        }
      },
      bringForward: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (active) {
          fc.bringObjectForward(active);
          fc.requestRenderAll();
          saveHistoryState();
        }
      },
      sendBackward: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        if (active) {
          fc.sendObjectBackwards(active);
          fc.requestRenderAll();
          saveHistoryState();
        }
      },
      updateObjectProperties: (props: Record<string, any>) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObjs = fc.getActiveObjects();
        if (activeObjs.length === 0) return;

        // Text-specific property keys that need special handling
        const textCharProps = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'underline', 'linethrough'];
        const textObjProps = ['textAlign', 'charSpacing', 'lineHeight', 'textBackgroundColor'];

        activeObjs.forEach((obj) => {
          const objAny = obj as any;
          
          if (props.name !== undefined) {
            obj.set('name', props.name);
          }

          const isTextObj = isTextObject(obj);

          if (isTextObj) {
            const hasCharSelection = objAny.isEditing && objAny.selectionStart !== objAny.selectionEnd;

            // Build character-level style object for partial selection
            const charStyles: Record<string, any> = {};
            for (const key of textCharProps) {
              if (props[key] !== undefined) {
                charStyles[key] = key === 'fontWeight' ? String(props[key]) : props[key];
              }
            }
            // fill applies as char-level style too (font color)
            if (props.fill !== undefined) charStyles.fill = props.fill;

            if (hasCharSelection && Object.keys(charStyles).length > 0 && typeof objAny.setSelectionStyles === 'function') {
              // Apply only to selected characters
              objAny.setSelectionStyles(charStyles);
            } else {
              // Apply to entire text object
              for (const [key, val] of Object.entries(charStyles)) {
                objAny.set(key, val);
              }
              // When applying to entire object, clear per-char overrides for these keys
              if (objAny.styles && Object.keys(charStyles).length > 0) {
                if (typeof objAny.cleanStyle === 'function') {
                  for (const key of Object.keys(charStyles)) {
                    objAny.cleanStyle(key);
                  }
                }
              }
            }

            // Object-level text props (always apply to whole object, not per-char)
            for (const key of textObjProps) {
              if (props[key] !== undefined) objAny.set(key, props[key]);
            }

            if (props.fill !== undefined) {
              objAny.colorSource = props.colorSource || 'custom';
            }

            if (typeof objAny.initDimensions === 'function') objAny.initDimensions();
            obj.setCoords();
          } else if (objAny.isRoughObject) {
            if (props.stroke !== undefined) {
              objAny.colorSource = props.colorSource || 'custom';
            }
            updateRoughObject(fc, obj, props);
          } else {
            const isImageOrPdf = obj.type === 'image' || objAny.isPdf;
            const isPen = objAny.shapeType === 'pen';
            const effectiveStroke = props.strokeColor !== undefined ? props.strokeColor : props.stroke;
            const effectiveFill = props.fillColor !== undefined ? props.fillColor : props.fill;

            if (isPen) {
              if (effectiveStroke !== undefined) {
                obj.set('fill', effectiveStroke);
              }
              if (effectiveFill !== undefined && effectiveFill !== 'transparent') {
                obj.set('fill', effectiveFill);
              }
              if (props.opacity !== undefined) {
                obj.set('opacity', props.opacity);
              }
            } else if (!isImageOrPdf) {
              if (effectiveFill !== undefined && obj.type !== 'line' && obj.type !== 'path') {
                obj.set('fill', effectiveFill);
              }
              if (effectiveStroke !== undefined) {
                objAny.colorSource = props.colorSource || 'custom';
                obj.set('stroke', effectiveStroke);
              }
            }

            if (props.strokeWidth !== undefined && !isImageOrPdf) {
              obj.set('strokeWidth', props.strokeWidth);
            }
            if (props.opacity !== undefined) {
              obj.set('opacity', props.opacity);
            }
            if (props.drawingStyle !== undefined) {
              objAny.drawingStyle = props.drawingStyle;
            }
            if (props.strokeStyle !== undefined && !isImageOrPdf) {
              let dash: number[] | undefined = undefined;
              if (props.strokeStyle === 'dashed') dash = [8, 8];
              else if (props.strokeStyle === 'dotted') dash = [3, 6];
              obj.set('strokeDashArray', dash);
              objAny.strokeStyle = props.strokeStyle;
            }
            if (props.left !== undefined) obj.set('left', props.left);
            if (props.top !== undefined) obj.set('top', props.top);
            if (props.angle !== undefined) obj.set('angle', props.angle);

            if (isImageOrPdf) {
              obj.set({ cropX: 0, cropY: 0 });
              if (props.width !== undefined && obj.width) {
                obj.set('scaleX', props.width / obj.width);
              }
              if (props.height !== undefined && obj.height) {
                obj.set('scaleY', props.height / obj.height);
              }
            } else {
              if (props.width !== undefined) obj.set('width', props.width);
              if (props.height !== undefined) obj.set('height', props.height);
            }

            obj.setCoords();
          }
        });

        fc.requestRenderAll();
        updateSelectedState();
        saveHistoryState();
      },
      getLayerObjectCount: (layerId: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return 0;
        const objects = fc.getObjects();
        return objects.filter((obj: any) => (obj.layerId || 'layer-default') === layerId).length;
      },
      deleteLayerObjects: (layerId: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const objects = fc.getObjects();
        const toRemove = objects.filter((obj: any) => (obj.layerId || 'layer-default') === layerId);
        toRemove.forEach((obj) => fc.remove(obj));
        fc.discardActiveObject();
        fc.renderAll();
        saveHistoryState();
        return toRemove.length;
      },
      editTextObject: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const activeObj = fc.getActiveObject();
        if (!activeObj) return;
        if (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') {
          const itext = activeObj as any;
          if (typeof itext.enterEditing === 'function') {
            itext.enterEditing();
            itext.selectAll();
            fc.requestRenderAll();
          }
        }
      },
      clearCanvas: () => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        pdfRenderControllersRef.current.forEach((controller) => controller.abort());
        pdfRenderControllersRef.current.clear();
        
        fc.getObjects().forEach((obj: any) => {
          if (obj.isPdf && obj.getElement && obj.getElement()) {
             const elem = obj.getElement();
             if (elem && elem.width) {
               elem.width = 0;
               elem.height = 0;
             }
          }
          cleanupEraserResources(obj);
        });
        
        fc.clear();
        fc.backgroundColor = 'transparent';
        fc.discardActiveObject();
        fc.requestRenderAll();
        
        setLayers([{ id: 'layer-default', name: 'Base Layer', visible: true, locked: false, zIndex: 0 }]);
        setActiveLayerId('layer-default');
        
        historyRef.current = [];
        historyIndexRef.current = -1;
        setHistoryStatus(false, false);
        
        updateSelectedState();
        saveHistoryState();
      },
    };

    onCanvasReady(canvasRefObj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCanvasReady]);

  const handlePdfPageChange = useCallback(async (newPage: number) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const activeObj = (fc.getActiveObject() as any) || fc.getObjects().find((o: any) => o.isPdf);
    if (activeObj && activeObj.isPdf && activeObj.id) {
      const pdfId = activeObj.id;
      const targetPage = Math.max(1, Math.min(activeObj.numPages || 1, newPage));
      
      const prevController = pdfRenderControllersRef.current.get(pdfId);
      if (prevController) prevController.abort();
      
      const controller = new AbortController();
      pdfRenderControllersRef.current.set(pdfId, controller);
      
      try {
        const { canvas: sourceCanvas, width, height } = await renderPdfPageToCanvas(pdfId, targetPage, 1.5, controller.signal);
        
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = width;
        displayCanvas.height = height;
        const ctx = displayCanvas.getContext('2d');
        if (!ctx) throw new Error('Unable to create PDF display canvas');
        ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, width, height);

        const prevElem = activeObj.getElement();
        if (prevElem && prevElem.width) {
          prevElem.width = 0;
          prevElem.height = 0;
        }

        activeObj.setElement(displayCanvas);
        activeObj.set({
          currentPage: targetPage,
          width,
          height,
          cropX: 0,
          cropY: 0,
        });
        activeObj.setCoords();
        fc.renderAll();
        setSelectedPdfInfo({
          currentPage: targetPage,
          numPages: activeObj.numPages,
          isLocked: !!activeObj.isPdfLocked,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Page render failed:', err);
      }
    }
  }, []);

  const handleOpenDocumentMode = useCallback(async () => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const activeObj = (fc.getActiveObject() as any) || fc.getObjects().find((o: any) => o.isPdf);
    if (activeObj && activeObj.isPdf && activeObj.id) {
      const key = activeObj.id;
      let buffer = getPdfArrayBuffer(key);

      if (!buffer && activeObj.pdfBase64) {
        try {
          buffer = base64ToArrayBuffer(activeObj.pdfBase64);
          await registerPdf(key, buffer);
        } catch (err) {
          console.error('Failed to decode embedded PDF Base64:', err);
        }
      }

      if (!buffer) {
        const reLinkInput = document.createElement('input');
        reLinkInput.type = 'file';
        reLinkInput.accept = '.pdf';
        reLinkInput.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              const newBuffer = await file.arrayBuffer();
              const newBase64 = arrayBufferToBase64(newBuffer);
              activeObj.pdfBase64 = newBase64;
              await registerPdf(key, newBuffer);
              openDocumentMode({
                id: key,
                name: activeObj.name || file.name,
                arrayBuffer: newBuffer,
                numPages: activeObj.numPages || 1,
                currentPage: activeObj.currentPage || 1,
                pageAnnotations: activeObj.pageAnnotations || {},
                zoom: activeObj.pdfZoom || 1.0,
                isLocked: activeObj.isPdfLocked || false,
              });
            } catch (err) {
              console.error('Failed to re-link PDF:', err);
            }
          }
        };
        reLinkInput.click();
        return;
      }

      const pdfData = {
        id: key,
        name: activeObj.name || 'PDF Document',
        arrayBuffer: buffer,
        numPages: activeObj.numPages || 1,
        currentPage: activeObj.currentPage || 1,
        pageAnnotations: activeObj.pageAnnotations || {},
        zoom: activeObj.pdfZoom || 1.0,
        isLocked: activeObj.isPdfLocked || false,
      };

      openDocumentMode(pdfData);
    }
  }, [openDocumentMode]);



  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const pdfObj = (fc.getActiveObject() as any) || fc.getObjects().find((o: any) => o.isPdf);

        if (pdfObj && pdfObj.isPdf && pdfObj.id) {
          e.preventDefault();
          const curPage = pdfObj.currentPage || 1;
          const totalPages = pdfObj.numPages || 1;

          if (e.key === 'ArrowLeft' && curPage > 1) {
            handlePdfPageChange(curPage - 1);
          } else if (e.key === 'ArrowRight' && curPage < totalPages) {
            handlePdfPageChange(curPage + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePdfPageChange]);

  const handleAcceptShapeSuggestion = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (fc && shapeSuggestion?.path) {
      fc.remove(shapeSuggestion.path);
      const newGroup = createRoughShape({
        shapeType: shapeSuggestion.recognition.shapeType!,
        layerId: activeLayerIdRef.current,
        left: shapeSuggestion.recognition.bounds.left,
        top: shapeSuggestion.recognition.bounds.top,
        width: shapeSuggestion.recognition.bounds.width,
        height: shapeSuggestion.recognition.bounds.height,
        stroke: strokeColorRef.current,
        fill: fillColorRef.current,
        strokeColor: strokeColorRef.current,
        fillColor: fillColorRef.current,
        strokeWidth: strokeWidthRef.current,
        opacity: opacityRef.current,
        drawingStyle: drawingStyleRef.current,
        roughness: roughnessRef.current,
        bowing: bowingRef.current,
        fillStyle: fillStyleRef.current,
        strokeStyle: strokeStyleRef.current,
        edges: edgesRef.current,
      });
      fc.add(newGroup);
      fc.setActiveObject(newGroup);
      fc.requestRenderAll();
      saveHistoryState();
    }
    setShapeSuggestion(null);
  }, [shapeSuggestion, saveHistoryState]);

  const handlePinchZoom = useCallback((zoomFactor: number, centerX: number, centerY: number) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    let newZoom = fc.getZoom() * zoomFactor;
    newZoom = Math.max(0.1, Math.min(10, newZoom));
    
    fc.zoomToPoint(new fabric.Point(centerX, centerY), newZoom);
    setZoom(newZoom);
  }, [setZoom]);

  usePinchZoom(containerRef, handlePinchZoom);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      className="relative h-full w-full overflow-hidden select-none"
    >
      <BlankCanvasOverlay 
        fabricCanvasRef={fabricCanvasRef}
        onOpen={() => document.getElementById('main-menu-json-input')?.click()}
        onHelp={() => window.dispatchEvent(new CustomEvent('app:open-help'))}
      />

      {/* Startup restoration veil — covers the blank canvas while IndexedDB data
          is being loaded. Uses bg-background so it matches the active theme.
          pointer-events-none so it never blocks interaction if it somehow lingers. */}
      {!isCanvasReady && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 bg-background"
        />
      )}
      {/* 1. Grid Layer */}
      <GridLayer
        gridOverlayRef={gridOverlayRef}
        grid={grid}
        zoom={zoom}
        panX={panX}
        panY={panY}
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {/* 2. Drawing Layer (Fabric.js Permanent Objects) */}
      <canvas ref={canvasElementRef} className="relative z-0" />

      {/* 3 & 4. Interaction Overlay Layer */}
      <InteractionLayer
        hoverRect={hoverRect}
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {/* 5. Guide Layer */}
      <GuideLayer
        guides={guideLines}
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {/* 6. Effects Layer */}
      <EffectsLayer
        isLaserActive={activeTool === 'laser'}
        rotationBadge={rotationBadge}
        shapeSuggestion={shapeSuggestion}
        canvasSize={canvasSize}
        onAcceptShapeSuggestion={handleAcceptShapeSuggestion}
        onRejectShapeSuggestion={() => setShapeSuggestion(null)}
      />

      {/* 7. Live Visual Eraser Cursor Ring Overlay */}
      {(activeTool === 'eraser' || isRightClickEraserState) && (() => {
        return (
          <div
            ref={eraserRingRef}
            className="pointer-events-none fixed z-50 rounded-full will-change-transform"
            style={{
              width: `${eraserRadius * 2}px`,
              height: `${eraserRadius * 2}px`,
              left: 0,
              top: 0,
              transform: cursorScreenPos
                ? `translate3d(${cursorScreenPos.x}px, ${cursorScreenPos.y}px, 0) translate(-50%, -50%)`
                : 'translate3d(-9999px, -9999px, 0)',
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 0 8px 4px rgba(150, 150, 150, 0.25)',
            }}
          />
        );
      })()}
    </div>
  );
};
