import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import type { PdfDocumentData, PdfAnnotationTool } from '../../types/pdf';
import { DocumentModeToolbar } from './DocumentModeToolbar';
import { LaserOverlay } from '../canvas/LaserOverlay';
import {
  registerPdf,
  renderPdfPageToCanvas,
  preloadAdjacentPages,
} from '../../utils/pdfDocumentManager';
import { useCanvasContext } from '../../store/CanvasContext';
import { useTheme } from '../../hooks/useTheme';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useEraserEngine, rebuildEraseMasks } from '../../hooks/useEraserEngine';
import { CANVAS_CUSTOM_PROPS, canvasReviver, serializeCanvas } from '../../utils/canvasPersistence';
import { isErasableObject } from '../../utils/eraserSplitter';
import { usePinchZoom } from '../../hooks/usePinchZoom';

interface DocumentModeViewProps {
  pdfData: PdfDocumentData;
  onExit: (updatedPdfData?: PdfDocumentData) => void;
}

export const DocumentModeView: React.FC<DocumentModeViewProps> = ({
  pdfData,
  onExit,
}) => {
  const { resolvedTheme } = useTheme();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [currentPage, setCurrentPage] = useState<number>(pdfData.currentPage || 1);
  const [zoom, setZoom] = useState<number>(pdfData.zoom || 1.0);
  const [activeTool, setActiveTool] = useState<PdfAnnotationTool>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [, setPageAnnotations] = useState<Record<number, string>>(
    pdfData.pageAnnotations || {}
  );

  const pageAnnotationsRef = useRef<Record<number, string>>(pdfData.pageAnnotations || {});
  const currentPageRef = useRef<number>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const pageHistoriesRef = useRef<Record<number, { history: string[]; index: number }>>({});

  const [pageDataUrl, setPageDataUrl] = useState<string>('');
  const pageObjectUrlRef = useRef<string | null>(null);

  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [loadingPage, setLoadingPage] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);
  const annotationCanvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelectedObject, setHasSelectedObject] = useState(false);

  const isHistoryRestoringRef = useRef<boolean>(false);
  const isRightErasingRef = useRef<boolean>(false);
  const renderControllerRef = useRef<AbortController | null>(null);

  const [fitMode, setFitMode] = useState<'page' | 'width' | 'manual'>('page');
  const [viewportDimensions, setViewportDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight - 56 : 700,
  });

  const { eraserRadius, eraserPressure } = useCanvasContext();
  const eraserRadiusRef = useRef(eraserRadius);
  const eraserPressureRef = useRef(eraserPressure);

  useEffect(() => {
    eraserRadiusRef.current = eraserRadius;
    eraserPressureRef.current = eraserPressure;
  }, [eraserRadius, eraserPressure]);

  const handlePinchZoom = useCallback((zoomFactor: number) => {
    setFitMode('manual');
    setZoom((prevZoom) => {
      let newZoom = prevZoom * zoomFactor;
      return Math.max(0.25, Math.min(3.0, newZoom));
    });
  }, []);

  usePinchZoom(mainScrollRef, handlePinchZoom);

  const eraserRingRef = useRef<HTMLDivElement>(null);
  const [cursorScreenPos, setCursorScreenPos] = useState<{ x: number; y: number } | null>(null);

  const { performContinuousErase, flushEraserQueue, resetPointerTracking } = useEraserEngine({
    fabricCanvasRef,
    eraserRadiusRef,
    eraserPressureRef,
    isObjectErasable: isErasableObject,
  });

  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  // ResizeObserver on the top-level STABLE container (NEVER on scrollable main to avoid feedback loops)
  useEffect(() => {
    const rootElem = containerRef.current;
    if (!rootElem) return;

    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            const stableViewportH = height - 56;
            setViewportDimensions((prev) => {
              if (prev.width === width && prev.height === stableViewportH) return prev;
              return { width, height: stableViewportH };
            });
          });
        }
      }
    });

    observer.observe(rootElem);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  // Calculate zoom dynamically based on stable viewport dimensions and current fitMode
  const calculateFitZoom = useCallback(
    (mode: 'page' | 'width', vpW: number, vpH: number, pageW: number, pageH: number) => {
      if (pageW <= 0 || pageH <= 0 || vpW <= 0 || vpH <= 0) return;

      if (mode === 'page') {
        const paddingY = 24; // Safe padding so page height fits inside viewport without triggering scrollbar feedback
        const availableH = Math.max(100, vpH - paddingY);
        const availableW = Math.max(100, vpW - 24);
        const fitHZoom = availableH / pageH;
        const fitWZoom = availableW / pageW;
        const scale = Math.max(0.25, Math.min(3.0, Math.min(fitHZoom, fitWZoom)));
        const stableScale = Math.round(scale * 1000) / 1000;
        setZoom(stableScale);
      } else if (mode === 'width') {
        const availableW = Math.max(100, vpW - 24);
        const fitWZoom = Math.max(0.25, Math.min(3.0, availableW / pageW));
        const stableScale = Math.round(fitWZoom * 1000) / 1000;
        setZoom(stableScale);
      }
    },
    []
  );

  useEffect(() => {
    if (fitMode !== 'manual') {
      calculateFitZoom(
        fitMode,
        viewportDimensions.width,
        viewportDimensions.height,
        pageDimensions.width,
        pageDimensions.height
      );
    }
  }, [fitMode, viewportDimensions, pageDimensions, calculateFitZoom]);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    
    pageHistoriesRef.current[currentPage] = {
      history: [...historyRef.current],
      index: historyIndexRef.current
    };
  }, [currentPage]);

  const saveCanvasState = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || isHistoryRestoringRef.current) return;
    const json = JSON.stringify((fc as any).toJSON(CANVAS_CUSTOM_PROPS));

    if (historyRef.current[historyIndexRef.current] === json) return;

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(json);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  // 1. Render base PDF page when page changes or zoom updates
  const loadPage = useCallback(
    async (pageNum: number, isPageSwitch = false) => {
      if (isPageSwitch) setLoadingPage(true);
      try {
        const controller = new AbortController();
        renderControllerRef.current = controller;
        await registerPdf(pdfData.id, pdfData.arrayBuffer!);
        const { canvas: sourceCanvas, width, height, cached } = await renderPdfPageToCanvas(pdfData.id, pageNum, zoom, controller.signal);
        
        // Convert to Blob URL to eliminate Base64 Data URL string memory leaks
        sourceCanvas.toBlob((blob) => {
          if (!blob) return;
          const newUrl = URL.createObjectURL(blob);
          if (pageObjectUrlRef.current) {
            URL.revokeObjectURL(pageObjectUrlRef.current);
          }
          pageObjectUrlRef.current = newUrl;
          setPageDataUrl(newUrl);
        }, 'image/png');

        setPageDimensions({ width, height });
        
        if (!cached) {
          sourceCanvas.width = 0;
          sourceCanvas.height = 0;
        }

        // Preload adjacent pages in background
        preloadAdjacentPages(pdfData.arrayBuffer!, pageNum, pdfData.numPages, zoom, pdfData.id);
      } catch (err) {
        console.error('DocumentModeView page render error:', err);
      } finally {
        if (isPageSwitch) setLoadingPage(false);
      }
    },
    [pdfData, zoom]
  );

  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    const isPageSwitch = isInitialLoadRef.current;
    if (isInitialLoadRef.current) isInitialLoadRef.current = false;

    const timer = setTimeout(() => {
      loadPage(currentPage, isPageSwitch);
    }, 150);
    return () => clearTimeout(timer);
  }, [currentPage, zoom, loadPage]);

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (pageObjectUrlRef.current) {
        URL.revokeObjectURL(pageObjectUrlRef.current);
        pageObjectUrlRef.current = null;
      }
    };
  }, []);

  // PDF Page Card & Full-bleed Annotation Container Dimensions
  const displayWidth = Math.round(pageDimensions.width * zoom);
  const displayHeight = Math.round(pageDimensions.height * zoom);

  const marginX = Math.max(120, Math.round((viewportDimensions.width - displayWidth) / 2));
  const marginY = fitMode === 'page' ? 8 : 20;

  const containerWidth = Math.max(viewportDimensions.width, displayWidth + marginX * 2);
  const containerHeight = Math.max(viewportDimensions.height, displayHeight + marginY * 2);

  const pdfLeft = Math.max(0, Math.round((containerWidth - displayWidth) / 2));
  const pdfTop = fitMode === 'page'
    ? Math.max(0, Math.round((containerHeight - displayHeight) / 2))
    : marginY;

  // 2. Initialize Full-bleed Fabric Overlay Canvas ONCE on component mount (spans page AND surrounding margins)
  useEffect(() => {
    if (!annotationCanvasElementRef.current) return;

    const fc = new fabric.Canvas(annotationCanvasElementRef.current, {
      width: containerWidth,
      height: containerHeight,
      selection: activeTool === 'select',
      isDrawingMode: false,
    });
    fc.setViewportTransform([zoom, 0, 0, zoom, pdfLeft, pdfTop]);

    fabricCanvasRef.current = fc;

    const handleObjectChange = () => {
      saveCanvasState();
      if (!isHistoryRestoringRef.current) {
        const objs = fc.getObjects();
        const curPage = currentPageRef.current;
        if (objs.length > 0) {
          const json = JSON.stringify(serializeCanvas(fc));
          pageAnnotationsRef.current[curPage] = json;
          setPageAnnotations((prev) => ({ ...prev, [curPage]: json }));
        } else {
          delete pageAnnotationsRef.current[curPage];
          setPageAnnotations((prev) => {
            const copy = { ...prev };
            delete copy[curPage];
            return copy;
          });
        }
      }
    };

    fc.on('path:created', (e: any) => {
      if (e.path) {
        e.path.set({
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        });
      }
      handleObjectChange();
    });
    fc.on('object:added', handleObjectChange);
    fc.on('object:modified', handleObjectChange);
    fc.on('object:removed', handleObjectChange);

    const handleSelectionChange = () => {
      const activeObjs = fc.getActiveObjects();
      setHasSelectedObject(activeObjs.length > 0);
    };

    fc.on('selection:created', handleSelectionChange);
    fc.on('selection:updated', handleSelectionChange);
    fc.on('selection:cleared', () => {
      setHasSelectedObject(false);
    });

    return () => {
      fc.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Sync Fabric Canvas dimensions and viewport transform matrix [zoom, 0, 0, zoom, pdfLeft, pdfTop]
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    fc.setDimensions({
      width: containerWidth,
      height: containerHeight,
    });
    fc.setViewportTransform([zoom, 0, 0, zoom, pdfLeft, pdfTop]);
    fc.renderAll();
  }, [containerWidth, containerHeight, zoom, pdfLeft, pdfTop]);

  // 3. Save annotations of current page before switching, and load annotations for new page
  const saveCurrentPageAnnotations = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const objects = fc.getObjects();
    const curPage = currentPageRef.current;
    if (objects.length > 0) {
      const annotationJson = JSON.stringify(serializeCanvas(fc));
      pageAnnotationsRef.current[curPage] = annotationJson;
      setPageAnnotations((prev) => ({
        ...prev,
        [curPage]: annotationJson,
      }));
    } else {
      delete pageAnnotationsRef.current[curPage];
      setPageAnnotations((prev) => {
        const copy = { ...prev };
        delete copy[curPage];
        return copy;
      });
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    saveCurrentPageAnnotations();
    setCurrentPage(newPage);
    loadPage(newPage, true);
  };

  // Restore page annotations overlay ONLY when currentPage changes
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    fc.clear();
    const initialJson = JSON.stringify((fc as any).toJSON(CANVAS_CUSTOM_PROPS));
    
    const savedHistory = pageHistoriesRef.current[currentPage];
    if (savedHistory) {
      historyRef.current = [...savedHistory.history];
      historyIndexRef.current = savedHistory.index;
    } else {
      historyRef.current = [initialJson];
      historyIndexRef.current = 0;
    }
    updateUndoRedoState();

    const existingAnnotationJson = pageAnnotationsRef.current[currentPage];
    if (existingAnnotationJson && existingAnnotationJson.includes('{"version"')) {
      fc.loadFromJSON(existingAnnotationJson, canvasReviver).then(() => {
        try {
          const parsedData = typeof existingAnnotationJson === 'string' ? JSON.parse(existingAnnotationJson) : existingAnnotationJson;
          const parsedObjects = parsedData.objects || [];
          const fabricObjects = fc.getObjects();
          for (let i = 0; i < Math.min(parsedObjects.length, fabricObjects.length); i++) {
            const o = parsedObjects[i];
            const obj = fabricObjects[i];
            if (o && obj) {
              CANVAS_CUSTOM_PROPS.forEach(prop => {
                if (o[prop] !== undefined) {
                  (obj as any)[prop] = o[prop];
                }
              });
              if (o.isRoughObject && !o.shapeType) {
                (obj as any).shapeType = (o.points && o.points.length > 2) ? 'freehand' : 'rectangle';
              }
            }
          }
        } catch (e) {
          console.warn("Failed to set custom props on loaded annotations:", e);
        }
        rebuildEraseMasks(fc);
        fc.renderAll();
      });
    }
  }, [currentPage, updateUndoRedoState]);

  // 4. Update Fabric Brush properties when tool, color, or width change
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    if (activeTool === 'select') {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else {
      fc.selection = false;
      fc.discardActiveObject();
      setHasSelectedObject(false);
      fc.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });

      if (activeTool === 'pen') {
        fc.isDrawingMode = true;
        const pencil = new fabric.PencilBrush(fc);
        pencil.color = strokeColor;
        pencil.width = strokeWidth;

        pencil.decimate = 1.5;
        (pencil as any).shadow = new fabric.Shadow({
          blur: 0,
          offsetX: 0,
          offsetY: 0,
          color: strokeColor
        });

        fc.freeDrawingBrush = pencil;
      } else if (activeTool === 'highlighter') {
        fc.isDrawingMode = true;
        const pencil = new fabric.PencilBrush(fc);
        pencil.color = strokeColor.startsWith('#')
          ? `${strokeColor}66`
          : strokeColor;
        pencil.width = strokeWidth * 6;

        (pencil as any).strokeLineCap = 'round';
        (pencil as any).strokeLineJoin = 'round';

        fc.freeDrawingBrush = pencil;
      } else {
        fc.isDrawingMode = false;
      }
    }

    fc.renderAll();
  }, [activeTool, strokeColor, strokeWidth]);

  // Handle Text creation on canvas click when activeTool is 'text'
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    if (activeTool === 'text') {
      fc.defaultCursor = 'text';
      fc.hoverCursor = 'text';

      const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
        if (opt.target && opt.target.type === 'i-text') return;

        const pt = fc.getScenePoint(opt.e);
        const iText = new fabric.IText('Type text...', {
          left: pt.x,
          top: pt.y,
          fill: strokeColor,
          fontSize: Math.max(16, strokeWidth * 6),
          fontFamily: 'Inter, sans-serif',
          editable: true,
        });

        fc.add(iText);
        fc.setActiveObject(iText);
        iText.enterEditing();
        iText.selectAll();
        fc.renderAll();
        saveCanvasState();
        setActiveTool('select');
      };

      fc.on('mouse:down', handleMouseDown);
      return () => {
        fc.off('mouse:down', handleMouseDown);
        fc.defaultCursor = 'default';
        fc.hoverCursor = 'move';
      };
    }
  }, [activeTool, strokeColor, strokeWidth, saveCanvasState]);

  // 5. Undo / Redo Actions
  const handleUndo = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || historyIndexRef.current <= 0) return;

    isHistoryRestoringRef.current = true;
    historyIndexRef.current -= 1;
    const targetState = historyRef.current[historyIndexRef.current];
    fc.loadFromJSON(targetState, canvasReviver).then(() => {
      rebuildEraseMasks(fc);
      fc.requestRenderAll();
      isHistoryRestoringRef.current = false;
      updateUndoRedoState();
    });
  }, [updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || historyIndexRef.current >= historyRef.current.length - 1) return;

    isHistoryRestoringRef.current = true;
    historyIndexRef.current += 1;
    const targetState = historyRef.current[historyIndexRef.current];
    fc.loadFromJSON(targetState, canvasReviver).then(() => {
      rebuildEraseMasks(fc);
      fc.requestRenderAll();
      isHistoryRestoringRef.current = false;
      updateUndoRedoState();
    });
  }, [updateUndoRedoState]);

  const handleDeleteSelected = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const activeObjs = fc.getActiveObjects();
    if (activeObjs.length > 0) {
      fc.discardActiveObject();
      activeObjs.forEach((obj) => fc.remove(obj));
      fc.requestRenderAll();
      saveCanvasState();
      setHasSelectedObject(false);
    }
  }, [saveCanvasState]);

  // 6. Keyboard Shortcuts & Mouse Wheel Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow delete/backspace inside text inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Also check if user is editing Fabric text box inline
      const fc = fabricCanvasRef.current;
      if (fc) {
        const activeObj = fc.getActiveObject();
        if (activeObj && activeObj.type === 'i-text' && (activeObj as fabric.IText).isEditing) {
          return;
        }
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleDeleteSelected();
      } else if (isCtrlOrCmd && keyLower === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrCmd && keyLower === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handlePageChange(Math.min(pdfData.numPages, currentPage + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePageChange(Math.max(1, currentPage - 1));
      } else if (e.key === 'Home') {
        handlePageChange(1);
      } else if (e.key === 'End') {
        handlePageChange(pdfData.numPages);
      } else if (e.key === 'Escape') {
        handleExit();
      }
    };

    // Use capture phase (true) so Delete/Backspace keydown is captured reliably
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [currentPage, pdfData.numPages, handleUndo, handleRedo, handlePageChange, saveCanvasState, handleDeleteSelected]);

  // Window-level Ctrl + Mouse Wheel listener for PDF Focus Mode zooming
  useEffect(() => {
    const handleNativeWheel = (e: WheelEvent) => {
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const scrollContainer = mainScrollRef.current;
        const delta = e.deltaY < 0 ? 0.08 : -0.08;

        setFitMode('manual');
        setZoom((prev) => {
          const newZoom = Math.max(0.25, Math.min(3.0, Math.round((prev + delta) * 1000) / 1000));
          
          if (scrollContainer && prev > 0) {
            const scaleFactor = newZoom / prev;
            const rect = scrollContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            requestAnimationFrame(() => {
              scrollContainer.scrollLeft = (scrollContainer.scrollLeft + mouseX) * scaleFactor - mouseX;
              scrollContainer.scrollTop = (scrollContainer.scrollTop + mouseY) * scaleFactor - mouseY;
            });
          }
          
          return newZoom;
        });
      }
    };

    window.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleNativeWheel);
  }, []);

  const handleWheel = (_e: React.WheelEvent) => {
    // Handled in native listener above
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setCursorScreenPos({ x: e.clientX, y: e.clientY });

    const fc = fabricCanvasRef.current;
    if (activeTool === 'eraser' && fc && (e.buttons & 1 || isRightErasingRef.current)) {
      const pt = fc.getScenePoint(e.nativeEvent);
      performContinuousErase(pt);
    } else if (activeTool === 'laser') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else if (laserPos) {
      setLaserPos(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button === 0 && activeTool === 'eraser' && !isRightErasingRef.current) {
      resetPointerTracking();
      const touched = flushEraserQueue();
      if (touched.size > 0) saveCanvasState();
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setFitMode('manual');
    setZoom(Math.round(newZoom * 1000) / 1000);
  };

  const handleToggleFit = useCallback(() => {
    if (fitMode === 'page') {
      setFitMode('width');
    } else {
      setFitMode('page');
    }
  }, [fitMode]);

  // 8. Exit Handler
  const handleExit = () => {
    saveCurrentPageAnnotations();
    const updatedPdf: PdfDocumentData = {
      ...pdfData,
      currentPage,
      zoom,
      pageAnnotations: pageAnnotationsRef.current,
    };
    onExit(updatedPdf);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={(e) => {
        if (e.button === 0 && activeTool === 'eraser' && fabricCanvasRef.current) {
          const pt = fabricCanvasRef.current.getScenePoint(e.nativeEvent);
          performContinuousErase(pt);
        }
      }}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden select-none animate-in fade-in duration-200 transition-colors ${
        resolvedTheme === 'dark' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-900'
      }`}
    >
      {/* Top Docked Header Toolbar */}
      <DocumentModeToolbar
        currentPage={currentPage}
        numPages={pdfData.numPages}
        zoom={zoom}
        activeTool={activeTool}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelectedObject={hasSelectedObject}
        fitMode={fitMode}
        isFullscreen={isFullscreen}
        onToolSelect={setActiveTool}
        onColorChange={setStrokeColor}
        onStrokeWidthChange={setStrokeWidth}
        onPageChange={handlePageChange}
        onZoomChange={handleZoomChange}
        onToggleFit={handleToggleFit}
        onToggleFullscreen={toggleFullscreen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={handleDeleteSelected}
        onExit={handleExit}
      />

      {/* Main Centered Document Viewport */}
      <main
        ref={mainScrollRef}
        className="w-full flex-1 overflow-auto flex flex-col items-center justify-start custom-scrollbar relative scrollbar-gutter-stable"
      >
        <div
          className="relative my-auto shrink-0"
          style={{
            width: containerWidth,
            height: containerHeight,
          }}
        >
          {/* Centered White PDF Page Card */}
          <div
            className="absolute shadow-2xl rounded-lg bg-white border border-neutral-200"
            style={{
              left: pdfLeft,
              top: pdfTop,
              width: displayWidth,
              height: displayHeight,
            }}
          >
            {loadingPage && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-xs">
                <div className="flex items-center gap-2 font-bold text-neutral-700 text-sm animate-pulse">
                  <span className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  Loading Page {currentPage}...
                </div>
              </div>
            )}

            {/* Base Rendered PDF Page Background */}
            {pageDataUrl && (
              <img
                ref={bgImgRef}
                src={pageDataUrl}
                alt={`PDF Page ${currentPage}`}
                className="w-full h-full object-contain pointer-events-none"
              />
            )}
          </div>

          {/* Full-bleed Fabric Annotation Overlay Canvas (Spans PDF page AND margins) */}
          <div className="absolute inset-0 z-20 pointer-events-auto">
            <canvas ref={annotationCanvasElementRef} />
          </div>
        </div>
      </main>

      {/* Laser Pointer Trail Overlay */}
      <LaserOverlay
        active={activeTool === 'laser'}
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {/* Eraser Cursor Overlay */}
      {(activeTool === 'eraser' || isRightErasingRef.current) && (() => {
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
