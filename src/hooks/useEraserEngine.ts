import { useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { hitTestObjectGeometry, getObjectCenterLocalPoint } from '../utils/eraserSplitter';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ErasedCircle {
  cx: number;
  cy: number;
  r: number;
  strength: number;
}

interface UseEraserEngineOptions {
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  eraserRadiusRef: React.RefObject<number>;
  eraserPressureRef: React.RefObject<number>;
  /** Consumer-provided predicate. Return true if obj should be erased.
   *  DrawingCanvas injects layer visibility/lock checks here.
   *  DocumentModeView passes isErasableObject directly. */
  isObjectErasable: (obj: fabric.Object) => boolean;
}

interface UseEraserEngineReturn {
  /** Queue a pointer position for erasing. Call on every pointermove. */
  performContinuousErase: (pointer: { x: number; y: number }) => void;
  /** Flush pending queue synchronously and clean up transient state.
   *  Returns the set of objects that were touched during this session. */
  flushEraserQueue: () => Set<fabric.Object>;
  /** Dispose engine resources (no Fabric mutations). Call on unmount. */
  disposeEraserEngine: () => void;
  resetPointerTracking: () => void;
}

// ─── Standalone: Eraser Lifecycle Management ─────────────────────────────────

/**
 * Idempotent cleanup of eraser runtime resources from a Fabric object.
 * Safe to call multiple times. Does NOT mutate `_erasedCircles` (history).
 */
export function cleanupEraserResources(obj: any): void {
  if (!obj) return;
  if (obj._eraseMaskCanvas) {
    obj._eraseMaskCanvas.width = 0;
    obj._eraseMaskCanvas.height = 0;
    obj._eraseMaskCanvas = undefined;
  }
  obj._eraseMaskCtx = undefined;
  obj._lastErasedLocalPt = undefined;
  
  uninstallEraserDrawHook(obj);
}

/**
 * Safely installs the custom drawObject hook for erasing.
 * Will not double-wrap if already installed.
 */
export function installEraserDrawHook(obj: any): void {
  if (!obj || obj._customEraserHooked) return;
  
  obj._customEraserHooked = true;
  obj._originalDrawObjectForEraser = obj.drawObject;
  
  obj.drawObject = function (ctx: CanvasRenderingContext2D, ...args: unknown[]) {
    if (this._originalDrawObjectForEraser) {
      this._originalDrawObjectForEraser.apply(this, [ctx, ...args]);
    } else {
      // Fallback if prototype method was somehow lost, though Fabric always has it.
      Object.getPrototypeOf(this).drawObject?.apply(this, [ctx, ...args]);
    }
    
    if (this._eraseMaskCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(
        this._eraseMaskCanvas,
        -this._eraseMaskCanvas.width / 2,
        -this._eraseMaskCanvas.height / 2,
      );
      ctx.restore();
    }
  };
}

/**
 * Restores the original drawObject method and removes the hook.
 */
export function uninstallEraserDrawHook(obj: any): void {
  if (!obj || !obj._customEraserHooked) return;
  
  if (obj._originalDrawObjectForEraser) {
    obj.drawObject = obj._originalDrawObjectForEraser;
  } else {
    // Attempt prototype fallback if original wasn't stored properly
    const protoDraw = Object.getPrototypeOf(obj).drawObject;
    if (protoDraw) {
      obj.drawObject = protoDraw;
    } else {
      delete obj.drawObject; // fallback to prototype
    }
  }
  
  obj._customEraserHooked = undefined;
  obj._originalDrawObjectForEraser = undefined;
}

// ─── Standalone: Rebuild Erase Masks ─────────────────────────────────────────

/**
 * Reconstruct `_eraseMaskCanvas` + `drawObject` hook from serialized
 * `_erasedCircles` after `loadFromJSON`. Call this in undo/redo/restore
 * after the canvas has finished loading objects.
 */
export function rebuildEraseMasks(fc: fabric.Canvas): void {
  fc.getObjects().forEach((obj: any) => {
    if (!obj._erasedCircles || obj._erasedCircles.length === 0) return;
    
    cleanupEraserResources(obj);

    const strokeMargin = Math.max(64, ((obj.strokeWidth || 1) * 2) + 64);
    const objW = Math.max(32, Math.ceil((obj.width || 100) + strokeMargin));
    const objH = Math.max(32, Math.ceil((obj.height || 100) + strokeMargin));
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = objW;
    maskCanvas.height = objH;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    obj._erasedCircles.forEach((circle: ErasedCircle) => {
      const cx = circle.cx + maskCanvas.width / 2;
      const cy = circle.cy + maskCanvas.height / 2;
      const r = circle.r;
      const strength = circle.strength || 1;
      const coreRatio = Math.max(0, (strength - 0.2) / 0.8) * 0.85;

      const grad = maskCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      if (coreRatio > 0.05) {
        grad.addColorStop(coreRatio, `rgba(0, 0, 0, ${(strength * 0.98).toFixed(3)})`);
      }
      const mid1 = coreRatio + (1 - coreRatio) * 0.35;
      const mid2 = coreRatio + (1 - coreRatio) * 0.7;
      grad.addColorStop(mid1, `rgba(0, 0, 0, ${(strength * 0.65).toFixed(3)})`);
      grad.addColorStop(mid2, `rgba(0, 0, 0, ${(strength * 0.22).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      maskCtx.save();
      maskCtx.fillStyle = grad;
      maskCtx.beginPath();
      maskCtx.arc(cx, cy, r, 0, Math.PI * 2);
      maskCtx.fill();
      maskCtx.restore();
    });

    obj._eraseMaskCanvas = maskCanvas;
    obj._eraseMaskCtx = maskCtx;

    installEraserDrawHook(obj);
  });
}

/** Custom properties that must be included in toJSON / clone for erase
 *  mask preservation across serialization, duplication, and history. */
export const ERASER_CUSTOM_PROPS = ['_erasedCircles'] as const;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEraserEngine({
  fabricCanvasRef,
  eraserRadiusRef,
  eraserPressureRef,
  isObjectErasable,
}: UseEraserEngineOptions): UseEraserEngineReturn {
  const pendingPointerQueueRef = useRef<{ x: number; y: number }[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastErasePointerRef = useRef<{ x: number; y: number } | null>(null);
  const touchedObjectsRef = useRef<Set<fabric.Object>>(new Set());

  // ── Core: Apply erase dab to a single object ────────────────────────────

  const eraseObjectAtPointer = useCallback(
    (
      targetObj: fabric.Object,
      pointer: { x: number; y: number },
      eraserRadius: number,
      eraserPressure: number,
    ) => {
      // 1. Transform pointer into object's LOCAL coordinate system
      const localPt = getObjectCenterLocalPoint(targetObj, pointer);

      const scaleX = Math.max(0.0001, Math.abs(targetObj.scaleX || 1));
      const scaleY = Math.max(0.0001, Math.abs(targetObj.scaleY || 1));
      const avgScale = (scaleX + scaleY) / 2;
      const localRadius = eraserRadius / avgScale;

      // Rate-limit duplicate points
      const lastLocalPt = (targetObj as any)._lastErasedLocalPt;
      if (lastLocalPt) {
        const dist = Math.hypot(localPt.x - lastLocalPt.x, localPt.y - lastLocalPt.y);
        if (dist < Math.max(1.5, localRadius * 0.25)) return;
      }
      (targetObj as any)._lastErasedLocalPt = { x: localPt.x, y: localPt.y };

      // 2. Initialize or retrieve the offscreen alpha erase mask canvas
      const strokeMargin = Math.max(64, ((targetObj.strokeWidth || 1) * 2) + 64);
      const objW = Math.max(32, Math.ceil((targetObj.width || 100) + strokeMargin));
      const objH = Math.max(32, Math.ceil((targetObj.height || 100) + strokeMargin));

      let maskCanvas = (targetObj as any)._eraseMaskCanvas as HTMLCanvasElement | undefined;
      let maskCtx = (targetObj as any)._eraseMaskCtx as CanvasRenderingContext2D | undefined;

      if (!maskCanvas || maskCanvas.width < objW || maskCanvas.height < objH || !maskCtx) {
        const newW = Math.max(objW, maskCanvas ? maskCanvas.width : objW);
        const newH = Math.max(objH, maskCanvas ? maskCanvas.height : objH);
        const newCanvas = document.createElement('canvas');
        newCanvas.width = newW;
        newCanvas.height = newH;
        const newCtx = newCanvas.getContext('2d');
        if (!newCtx) return;

        if (maskCanvas && maskCtx) {
          newCtx.drawImage(
            maskCanvas,
            (newW - maskCanvas.width) / 2,
            (newH - maskCanvas.height) / 2,
          );
          maskCanvas.width = 0;
          maskCanvas.height = 0;
        }
        maskCanvas = newCanvas;
        maskCtx = newCtx;
        (targetObj as any)._eraseMaskCanvas = maskCanvas;
        (targetObj as any)._eraseMaskCtx = maskCtx;
      }

      if (!maskCanvas || !maskCtx) return;

      const cx = localPt.x + maskCanvas.width / 2;
      const cy = localPt.y + maskCanvas.height / 2;
      const r = localRadius;

      // 3. Gaussian-like radial feathered erase dab
      const strength = Math.max(0.1, Math.min(1, eraserPressure / 100));
      const coreRatio = Math.max(0, (strength - 0.2) / 0.8) * 0.85;

      const grad = maskCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      if (coreRatio > 0.05) {
        grad.addColorStop(coreRatio, `rgba(0, 0, 0, ${(strength * 0.98).toFixed(3)})`);
      }
      const mid1 = coreRatio + (1 - coreRatio) * 0.35;
      const mid2 = coreRatio + (1 - coreRatio) * 0.7;
      grad.addColorStop(mid1, `rgba(0, 0, 0, ${(strength * 0.65).toFixed(3)})`);
      grad.addColorStop(mid2, `rgba(0, 0, 0, ${(strength * 0.22).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      maskCtx.save();
      maskCtx.fillStyle = grad;
      maskCtx.beginPath();
      maskCtx.arc(cx, cy, r, 0, Math.PI * 2);
      maskCtx.fill();
      maskCtx.restore();

      // 4. Record circle for vector stroke splitting
      if (!(targetObj as any)._erasedCircles) {
        (targetObj as any)._erasedCircles = [];
      }
      (targetObj as any)._erasedCircles.push({ cx: localPt.x, cy: localPt.y, r, strength });
      touchedObjectsRef.current.add(targetObj);

      // 5. Hook into Fabric's drawObject to apply mask via destination-out
      targetObj.objectCaching = true;
      (targetObj as any).dirty = true;
      (targetObj as any)._eraseMaskCanvas = maskCanvas;

      installEraserDrawHook(targetObj);
    },
    [],
  );

  // ── RAF-driven batch processor ──────────────────────────────────────────

  const processEraserQueue = useCallback(() => {
    rafIdRef.current = null;
    const fc = fabricCanvasRef.current;
    if (!fc || pendingPointerQueueRef.current.length === 0) return;

    const rawQueue = [...pendingPointerQueueRef.current];
    pendingPointerQueueRef.current = [];

    const zoom = fc.getZoom();
    const radius = eraserRadiusRef.current / zoom;
    const pressure = eraserPressureRef.current;

    // Interpolate pointer trajectory
    const interpolatedPoints: { x: number; y: number }[] = [];
    let prev = lastErasePointerRef.current;

    for (let i = 0; i < rawQueue.length; i++) {
      const curr = rawQueue[i];
      if (prev) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.hypot(dx, dy);
        const stepSize = Math.max(2.5 / zoom, radius / 3.5);

        if (dist > stepSize) {
          const steps = Math.ceil(dist / stepSize);
          for (let s = 1; s <= steps; s++) {
            const ratio = s / steps;
            interpolatedPoints.push({
              x: prev.x + dx * ratio,
              y: prev.y + dy * ratio,
            });
          }
        } else {
          interpolatedPoints.push(curr);
        }
      } else {
        interpolatedPoints.push(curr);
      }
      prev = curr;
    }

    if (rawQueue.length > 0) {
      lastErasePointerRef.current = rawQueue[rawQueue.length - 1];
    }

    if (interpolatedPoints.length === 0) return;

    // Broad-phase bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of interpolatedPoints) {
      if (pt.x - radius < minX) minX = pt.x - radius;
      if (pt.y - radius < minY) minY = pt.y - radius;
      if (pt.x + radius > maxX) maxX = pt.x + radius;
      if (pt.y + radius > maxY) maxY = pt.y + radius;
    }

    // Filter candidates via consumer predicate
    const objects = fc.getObjects();
    const candidates: { obj: fabric.Object; bbox: { left: number; top: number; width: number; height: number } }[] = [];

    for (const obj of objects) {
      if (!isObjectErasable(obj)) continue;

      const bbox = obj.getBoundingRect ? obj.getBoundingRect() : null;
      if (bbox) {
        if (
          bbox.left > maxX ||
          bbox.left + bbox.width < minX ||
          bbox.top > maxY ||
          bbox.top + bbox.height < minY
        ) continue;
        candidates.push({ obj, bbox });
      }
    }

    if (candidates.length === 0) return;

    let modified = false;

    for (const { obj } of candidates) {
      for (const pt of interpolatedPoints) {
        if (hitTestObjectGeometry(obj, pt, radius)) {
          eraseObjectAtPointer(obj, pt, radius, pressure);
          modified = true;
        }
      }
    }

    if (modified) {
      fc.requestRenderAll();
    }
  }, [fabricCanvasRef, eraserRadiusRef, eraserPressureRef, isObjectErasable, eraseObjectAtPointer]);

  // ── Scheduling ──────────────────────────────────────────────────────────

  const scheduleEraserProcess = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(processEraserQueue);
    }
  }, [processEraserQueue]);

  // ── Public API ──────────────────────────────────────────────────────────

  const performContinuousErase = useCallback(
    (pointer: { x: number; y: number }) => {
      pendingPointerQueueRef.current.push(pointer);
      scheduleEraserProcess();
    },
    [scheduleEraserProcess],
  );

  const flushEraserQueue = useCallback((): Set<fabric.Object> => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    processEraserQueue();

    const fc = fabricCanvasRef.current;
    if (fc) {
      fc.getObjects().forEach((o: any) => {
        o._lastErasedLocalPt = null;
      });
    }

    const touched = new Set(touchedObjectsRef.current);
    touchedObjectsRef.current.clear();

    if (touched.size > 0 && fc) {
      fc.requestRenderAll();
    }

    return touched;
  }, [fabricCanvasRef, processEraserQueue]);

  const resetPointerTracking = useCallback(() => {
    lastErasePointerRef.current = null;
  }, []);

  const disposeEraserEngine = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingPointerQueueRef.current = [];
    touchedObjectsRef.current.clear();
    lastErasePointerRef.current = null;
  }, []);

  return {
    performContinuousErase,
    flushEraserQueue,
    resetPointerTracking,
    disposeEraserEngine,
  };
}
