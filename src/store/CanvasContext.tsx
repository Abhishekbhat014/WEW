import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { ToolType, GridConfig, Layer, ObjectProperties, DrawingStyle, FillStyle, StrokeStyle, EdgesType } from '../types/canvas';
import { DEFAULT_INITIAL_STATE, type CanvasState } from './canvasStore';
import { useTheme } from '../hooks/useTheme';
import { getDefaultColorForTheme, type ColorSource } from '../utils/themeColors';

interface CanvasContextType extends CanvasState {
  setActiveTool: (tool: ToolType) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string, source?: ColorSource) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontWeight: (weight: string) => void;
  setFontStyle: (style: string) => void;
  setUnderline: (underline: boolean) => void;
  setLinethrough: (linethrough: boolean) => void;
  setTextAlign: (align: string) => void;
  setLetterSpacing: (spacing: number) => void;
  setLineHeight: (height: number) => void;
  setTextBgColor: (color: string) => void;
  setIsDrawToShapeMode: (enabled: boolean) => void;
  setDrawingStyle: (style: DrawingStyle) => void;
  setRoughness: (roughness: number) => void;
  setBowing: (bowing: number) => void;
  setFillStyle: (fillStyle: FillStyle) => void;
  setHachureGap: (gap: number) => void;
  setStrokeStyle: (strokeStyle: StrokeStyle) => void;
  setEdges: (edges: EdgesType) => void;
  isRightClickErasing: boolean;
  setIsRightClickErasing: (val: boolean) => void;
  setEraserRadius: (radius: number) => void;
  setEraserPressure: (pressure: number) => void;
  setGridConfig: (grid: Partial<GridConfig>) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (panX: number, panY: number) => void;
  setCursorPos: (x: number, y: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setSelectedObject: (obj: ObjectProperties | null) => void;
  setSelectedCount: (count: number) => void;
  setLayers: (layers: Layer[]) => void;
  setActiveLayerId: (id: string) => void;
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  renameLayer: (id: string, newName: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  setHistoryStatus: (canUndo: boolean, canRedo: boolean) => void;
  setProjectName: (name: string) => void;
  setProjectId: (id: string | null) => void;
  setLastSavedAt: (timestamp: string | null) => void;
  openDocumentMode: (pdfData: any) => void;
  exitDocumentMode: (updatedPdfData?: any) => void;
  setIsZenMode: (isZenMode: boolean) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setIsToolLocked: (locked: boolean | ((prev: boolean) => boolean)) => void;
  toggleToolLock: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { resolvedTheme } = useTheme();

  const [state, setState] = useState<CanvasState>(() => ({
    ...DEFAULT_INITIAL_STATE,
    strokeColor: getDefaultColorForTheme(resolvedTheme),
    strokeColorSource: 'theme-default',
  }));

  useEffect(() => {
    setState((prev) => {
      if (prev.strokeColorSource === 'theme-default') {
        return {
          ...prev,
          strokeColor: getDefaultColorForTheme(resolvedTheme),
        };
      }
      return prev;
    });
  }, [resolvedTheme]);

  const setActiveTool = useCallback((tool: ToolType) => {
    setState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  const setFillColor = useCallback((fillColor: string) => {
    setState((prev) => ({ ...prev, fillColor }));
  }, []);

  const setStrokeColor = useCallback((strokeColor: string, source: ColorSource = 'custom') => {
    setState((prev) => ({ ...prev, strokeColor, strokeColorSource: source }));
  }, []);

  const setStrokeWidth = useCallback((strokeWidth: number) => {
    setState((prev) => ({ ...prev, strokeWidth }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setState((prev) => ({ ...prev, opacity }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setState((prev) => ({ ...prev, fontSize }));
  }, []);

  const setFontFamily = useCallback((fontFamily: string) => {
    setState((prev) => ({ ...prev, fontFamily }));
  }, []);

  const setFontWeight = useCallback((fontWeight: string) => {
    setState((prev) => ({ ...prev, fontWeight }));
  }, []);

  const setFontStyle = useCallback((fontStyle: string) => {
    setState((prev) => ({ ...prev, fontStyle }));
  }, []);

  const setUnderline = useCallback((underline: boolean) => {
    setState((prev) => ({ ...prev, underline }));
  }, []);

  const [isRightClickErasing, setIsRightClickErasing] = useState<boolean>(false);


  const setLinethrough = useCallback((linethrough: boolean) => {
    setState((prev) => ({ ...prev, linethrough }));
  }, []);

  const setTextAlign = useCallback((textAlign: string) => {
    setState((prev) => ({ ...prev, textAlign }));
  }, []);

  const setLetterSpacing = useCallback((letterSpacing: number) => {
    setState((prev) => ({ ...prev, letterSpacing }));
  }, []);

  const setLineHeight = useCallback((lineHeight: number) => {
    setState((prev) => ({ ...prev, lineHeight }));
  }, []);

  const setTextBgColor = useCallback((textBgColor: string) => {
    setState((prev) => ({ ...prev, textBgColor }));
  }, []);

  const setIsDrawToShapeMode = useCallback((isDrawToShapeMode: boolean) => {
    setState((prev) => ({ ...prev, isDrawToShapeMode }));
  }, []);

  const setDrawingStyle = useCallback((drawingStyle: DrawingStyle) => {
    setState((prev) => {
      let roughness = prev.roughness;
      let bowing = prev.bowing;

      switch (drawingStyle) {
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
        case 'pencil':
          roughness = 2.8;
          bowing = 2.0;
          break;
        case 'ink':
          roughness = 0.8;
          bowing = 0.5;
          break;
      }

      return {
        ...prev,
        drawingStyle,
        roughness,
        bowing,
      };
    });
  }, []);

  const setRoughness = useCallback((roughness: number) => {
    setState((prev) => ({ ...prev, roughness }));
  }, []);

  const setBowing = useCallback((bowing: number) => {
    setState((prev) => ({ ...prev, bowing }));
  }, []);

  const setFillStyle = useCallback((fillStyle: FillStyle) => {
    setState((prev) => ({ ...prev, fillStyle }));
  }, []);

  const setHachureGap = useCallback((hachureGap: number) => {
    setState((prev) => ({ ...prev, hachureGap }));
  }, []);

  const setStrokeStyle = useCallback((strokeStyle: StrokeStyle) => {
    setState((prev) => ({ ...prev, strokeStyle }));
  }, []);

  const setEdges = useCallback((edges: EdgesType) => {
    setState((prev) => ({ ...prev, edges }));
  }, []);

  const setEraserRadius = useCallback((eraserRadius: number) => {
    setState((prev) => ({ ...prev, eraserRadius }));
  }, []);

  const setEraserPressure = useCallback((eraserPressure: number) => {
    setState((prev) => ({ ...prev, eraserPressure }));
  }, []);

  const setGridConfig = useCallback((gridPartial: Partial<GridConfig>) => {
    setState((prev) => ({
      ...prev,
      grid: { ...prev.grid, ...gridPartial },
    }));
  }, []);

  const setZoom = useCallback((zoomInput: number | ((prev: number) => number)) => {
    setState((prev) => {
      const newZoom = typeof zoomInput === 'function' ? zoomInput(prev.zoom) : zoomInput;
      const clamped = Math.max(0.1, Math.min(10, newZoom));
      return { ...prev, zoom: Number(clamped.toFixed(2)) };
    });
  }, []);

  const setPan = useCallback((panX: number, panY: number) => {
    setState((prev) => ({ ...prev, panX, panY }));
  }, []);

  const lastCursorRef = useRef({ x: 0, y: 0 });
  const setCursorPos = useCallback((x: number, y: number) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (Math.abs(rx - lastCursorRef.current.x) >= 2 || Math.abs(ry - lastCursorRef.current.y) >= 2) {
      lastCursorRef.current = { x: rx, y: ry };
      window.dispatchEvent(new CustomEvent('app:cursor-pos', { detail: { x: rx, y: ry } }));
    }
  }, []);

  const setCanvasSize = useCallback((width: number, height: number) => {
    setState((prev) => ({ ...prev, canvasSize: { width, height } }));
  }, []);

  const setSelectedObject = useCallback((obj: ObjectProperties | null) => {
    setState((prev) => ({ ...prev, selectedObject: obj }));
  }, []);

  const setSelectedCount = useCallback((count: number) => {
    setState((prev) => ({ ...prev, selectedCount: count }));
  }, []);

  const setLayers = useCallback((layers: Layer[]) => {
    setState((prev) => ({ ...prev, layers }));
  }, []);

  const setActiveLayerId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeLayerId: id }));
  }, []);

  const addLayer = useCallback((name?: string) => {
    setState((prev) => {
      const newId = `layer-${Date.now()}`;
      const newName = name || `Layer ${prev.layers.length + 1}`;
      const newLayer: Layer = {
        id: newId,
        name: newName,
        visible: true,
        locked: false,
        zIndex: prev.layers.length,
      };
      return {
        ...prev,
        layers: [newLayer, ...prev.layers],
        activeLayerId: newId,
      };
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setState((prev) => {
      if (prev.layers.length <= 1) return prev;
      const newLayers = prev.layers.filter((l) => l.id !== id);
      const newActiveId = prev.activeLayerId === id ? newLayers[0].id : prev.activeLayerId;
      return {
        ...prev,
        layers: newLayers,
        activeLayerId: newActiveId,
      };
    });
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  }, []);

  const toggleLayerLock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    }));
  }, []);

  const renameLayer = useCallback((id: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, name: newName } : l)),
    }));
  }, []);

  const reorderLayers = useCallback((startIndex: number, endIndex: number) => {
    setState((prev) => {
      const result = Array.from(prev.layers);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, layers: result };
    });
  }, []);

  const setHistoryStatus = useCallback((canUndo: boolean, canRedo: boolean) => {
    setState((prev) => ({ ...prev, canUndo, canRedo }));
  }, []);

  const setProjectName = useCallback((projectName: string) => {
    setState((prev) => ({ ...prev, projectName }));
  }, []);

  const setProjectId = useCallback((projectId: string | null) => {
    setState((prev) => ({ ...prev, projectId }));
  }, []);

  const setLastSavedAt = useCallback((timestamp: string | null) => {
    setState((prev) => ({ ...prev, lastSavedAt: timestamp }));
  }, []);



  const openDocumentMode = useCallback((pdfData: any) => {
    setState((prev) => ({
      ...prev,
      documentMode: {
        isActive: true,
        pdfData,
      },
    }));
  }, []);

  const exitDocumentMode = useCallback((updatedPdfData?: any) => {
    setState((prev) => ({
      ...prev,
      documentMode: {
        isActive: false,
        pdfData: updatedPdfData || prev.documentMode.pdfData,
      },
    }));
  }, []);

  const setIsZenMode = useCallback((isZenMode: boolean) => {
    setState((prev) => ({ ...prev, isZenMode }));
  }, []);

  const setIsFullscreen = useCallback((isFullscreen: boolean) => {
    setState((prev) => ({ ...prev, isFullscreen }));
  }, []);

  const setIsToolLocked = useCallback((locked: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isToolLocked: typeof locked === 'function' ? locked(prev.isToolLocked) : locked,
    }));
  }, []);

  const toggleToolLock = useCallback(() => {
    setState((prev) => ({ ...prev, isToolLocked: !prev.isToolLocked }));
  }, []);

  const value = {
    ...state,
    isRightClickErasing,
    setIsRightClickErasing,
    setActiveTool,
    setFillColor,
    setStrokeColor,
    setStrokeWidth,
    setOpacity,
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
    setIsDrawToShapeMode,
    setDrawingStyle,
    setRoughness,
    setBowing,
    setFillStyle,
    setHachureGap,
    setStrokeStyle,
    setEdges,
    setEraserRadius,
    setEraserPressure,
    setGridConfig,
    setZoom,
    setPan,
    setCursorPos,
    setCanvasSize,
    setSelectedObject,
    setSelectedCount,
    setLayers,
    setActiveLayerId,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    reorderLayers,
    setHistoryStatus,
    setProjectName,
    setProjectId,
    setLastSavedAt,
    openDocumentMode,
    exitDocumentMode,
    setIsZenMode,
    setIsFullscreen,
    setIsToolLocked,
    toggleToolLock,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};
