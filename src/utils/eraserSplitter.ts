import * as fabric from 'fabric';

export interface ErasedCircle {
  cx: number;
  cy: number;
  r: number;
  strength?: number;
}

/**
 * Converts a sequence of 2D points into a smooth SVG Path string (Quadratic Bezier curve fit)
 */
function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${(points[0].x + 0.1).toFixed(2)} ${(points[0].y + 0.1).toFixed(2)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return d;
}

/**
 * Checks whether a 2D local point lies inside any of the erased circles
 */
function isPointInCircles(x: number, y: number, circles: ErasedCircle[]): boolean {
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const dx = x - c.cx;
    const dy = y - c.cy;
    if (dx * dx + dy * dy <= c.r * c.r) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates perpendicular distance from point (px, py) to line segment (x1, y1)-(x2, y2)
 */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Tests whether a 2D point is inside a polygon
 */
function isPointInPolygon(px: number, py: number, points: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Transforms a world/scene coordinate point into an object's center-relative local coordinates (0,0 at center).
 * Correctly accounts for originX/originY, rotation, scaling, skew, and transformations.
 */
export function getObjectCenterLocalPoint(obj: fabric.Object, worldPt: { x: number; y: number }): { x: number; y: number } {
  const matrix = obj.calcTransformMatrix();
  const inverted = fabric.util.invertTransform(matrix);
  const pt = fabric.util.transformPoint(new fabric.Point(worldPt.x, worldPt.y), inverted);
  
  // In Fabric, calcTransformMatrix() calculates the absolute transform to the visual center of the bounding box
  // regardless of originX/originY. Therefore, the inverted point is ALWAYS relative to the bounding box center!
  return { x: pt.x, y: pt.y };
}

/**
 * Accurate Geometry-Based Hit Detection for any Fabric object.
 * Tests actual stroke paths, rough vertices, polygon points, and transformed geometry.
 */
export function hitTestObjectGeometry(
  obj: fabric.Object,
  worldPt: { x: number; y: number },
  worldRadius: number
): boolean {
  if (!obj || !isErasableObject(obj)) return false;

  // 1. Broadphase bounding box check
  const bbox = obj.getBoundingRect ? obj.getBoundingRect() : null;
  if (bbox) {
    if (
      worldPt.x + worldRadius < bbox.left ||
      worldPt.x - worldRadius > bbox.left + bbox.width ||
      worldPt.y + worldRadius < bbox.top ||
      worldPt.y - worldRadius > bbox.top + bbox.height
    ) {
      return false;
    }
  }

  // 2. Narrowphase: Transform point into object center-relative coordinates
  const localPt = getObjectCenterLocalPoint(obj, worldPt);

  const scaleX = Math.max(0.0001, Math.abs(obj.scaleX || 1));
  const scaleY = Math.max(0.0001, Math.abs(obj.scaleY || 1));
  const avgScale = (scaleX + scaleY) / 2;
  const localRadius = worldRadius / avgScale;
  const strokeMargin = ((obj.strokeWidth || 1) / 2) + localRadius;

  // Check 1: Fabric Path (freehand strokes, pens, pencils, markers)
  if (obj.type === 'path' && (obj as any).path) {
    const pathCmds = (obj as any).path as any[];
    const pathOffset = (obj as any).pathOffset || { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    for (let i = 0; i < pathCmds.length; i++) {
      const cmd = pathCmds[i];
      const type = cmd[0];

      if (type === 'M') {
        current = { x: cmd[1] - pathOffset.x, y: cmd[2] - pathOffset.y };
        if (Math.hypot(localPt.x - current.x, localPt.y - current.y) <= strokeMargin) {
          return true;
        }
      } else if (type === 'L') {
        const next = { x: cmd[1] - pathOffset.x, y: cmd[2] - pathOffset.y };
        if (distToSegment(localPt.x, localPt.y, current.x, current.y, next.x, next.y) <= strokeMargin) {
          return true;
        }
        current = next;
      } else if (type === 'Q') {
        const cp = { x: cmd[1] - pathOffset.x, y: cmd[2] - pathOffset.y };
        const end = { x: cmd[3] - pathOffset.x, y: cmd[4] - pathOffset.y };
        // Approximate quadratic bezier with 4 sampled segments
        let prevPt = current;
        for (let s = 1; s <= 4; s++) {
          const t = s / 4;
          const invT = 1 - t;
          const sx = invT * invT * current.x + 2 * invT * t * cp.x + t * t * end.x;
          const sy = invT * invT * current.y + 2 * invT * t * cp.y + t * t * end.y;
          const segPt = { x: sx, y: sy };
          if (distToSegment(localPt.x, localPt.y, prevPt.x, prevPt.y, segPt.x, segPt.y) <= strokeMargin) {
            return true;
          }
          prevPt = segPt;
        }
        current = end;
      } else if (type === 'C') {
        const cp1 = { x: cmd[1] - pathOffset.x, y: cmd[2] - pathOffset.y };
        const cp2 = { x: cmd[3] - pathOffset.x, y: cmd[4] - pathOffset.y };
        const end = { x: cmd[5] - pathOffset.x, y: cmd[6] - pathOffset.y };
        // Approximate cubic bezier with 6 sampled segments
        let prevPt = current;
        for (let s = 1; s <= 6; s++) {
          const t = s / 6;
          const invT = 1 - t;
          const sx = invT * invT * invT * current.x + 3 * invT * invT * t * cp1.x + 3 * invT * t * t * cp2.x + t * t * t * end.x;
          const sy = invT * invT * invT * current.y + 3 * invT * invT * t * cp1.y + 3 * invT * t * t * cp2.y + t * t * t * end.y;
          const segPt = { x: sx, y: sy };
          if (distToSegment(localPt.x, localPt.y, prevPt.x, prevPt.y, segPt.x, segPt.y) <= strokeMargin) {
            return true;
          }
          prevPt = segPt;
        }
        current = end;
      }
    }
    return false;
  }

  // Check 2: Rough Shapes & Groups (stars, diamonds, polygons, rects, circles, arrows)
  if (obj.type === 'group' || (obj as any).isRoughObject) {
    const rawPoints = (obj as any).points as { x: number; y: number }[] | undefined;
    const w = (obj.width || 100);
    const h = (obj.height || 100);

    // If explicit relative vertices exist (star, polygon, diamond)
    if (rawPoints && rawPoints.length > 2) {
      // Points in rough shapes are defined relative to top-left [0..w, 0..h]
      const centerRelativePoints = rawPoints.map(p => ({ x: p.x - w / 2, y: p.y - h / 2 }));
      if (isPointInPolygon(localPt.x, localPt.y, centerRelativePoints)) {
        return true;
      }
      for (let i = 0; i < centerRelativePoints.length; i++) {
        const p1 = centerRelativePoints[i];
        const p2 = centerRelativePoints[(i + 1) % centerRelativePoints.length];
        if (distToSegment(localPt.x, localPt.y, p1.x, p1.y, p2.x, p2.y) <= strokeMargin) {
          return true;
        }
      }
    }

    // Check child objects in group
    const children = (obj as any)._objects as fabric.Object[] | undefined;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === 'path' && (child as any).path) {
          const childPath = (child as any).path as any[];
          const childOffset = (child as any).pathOffset || { x: 0, y: 0 };
          let prev = { x: 0, y: 0 };
          for (let c = 0; c < childPath.length; c++) {
            const cmd = childPath[c];
            if (cmd[0] === 'M') {
              prev = { x: cmd[1] - childOffset.x, y: cmd[2] - childOffset.y };
            } else if (cmd[0] === 'L') {
              const cur = { x: cmd[1] - childOffset.x, y: cmd[2] - childOffset.y };
              if (distToSegment(localPt.x, localPt.y, prev.x, prev.y, cur.x, cur.y) <= strokeMargin) {
                return true;
              }
              prev = cur;
            }
          }
        }
      }
    }

    // Standard bounding box check within group local space
    const halfW = w / 2;
    const halfH = h / 2;
    return (
      localPt.x >= -halfW - localRadius &&
      localPt.x <= halfW + localRadius &&
      localPt.y >= -halfH - localRadius &&
      localPt.y <= halfH + localRadius
    );
  }

  // Check 3: Standard Shapes, Text, Images & Fragments
  const halfW = ((obj.width || 0) / 2);
  const halfH = ((obj.height || 0) / 2);
  return (
    localPt.x >= -halfW - strokeMargin &&
    localPt.x <= halfW + strokeMargin &&
    localPt.y >= -halfH - strokeMargin &&
    localPt.y <= halfH + strokeMargin
  );
}

/**
 * Splits a freehand `fabric.Path` into multiple independent `fabric.Path` objects
 * when an eraser cut creates disconnected segments.
 */
function splitStrokePath(
  fc: fabric.Canvas,
  targetPath: fabric.Path,
  circles: ErasedCircle[]
): fabric.Object[] {
  const pathCommands = (targetPath as any).path as any[];
  if (!pathCommands || pathCommands.length === 0) {
    fc.remove(targetPath);
    return [];
  }

  const pathOffset = targetPath.pathOffset || { x: 0, y: 0 };

  // 1. Sample points densely along the path commands
  const sampledPoints: { x: number; y: number }[] = [];
  let currentPos = { x: 0, y: 0 };

  for (let i = 0; i < pathCommands.length; i++) {
    const cmd = pathCommands[i];
    const type = cmd[0];

    if (type === 'M') {
      currentPos = { x: cmd[1], y: cmd[2] };
      sampledPoints.push({ ...currentPos });
    } else if (type === 'L') {
      const target = { x: cmd[1], y: cmd[2] };
      const dist = Math.hypot(target.x - currentPos.x, target.y - currentPos.y);
      const steps = Math.max(1, Math.ceil(dist / 2));
      for (let s = 1; s <= steps; s++) {
        const ratio = s / steps;
        sampledPoints.push({
          x: currentPos.x + (target.x - currentPos.x) * ratio,
          y: currentPos.y + (target.y - currentPos.y) * ratio,
        });
      }
      currentPos = target;
    } else if (type === 'Q') {
      const cp = { x: cmd[1], y: cmd[2] };
      const target = { x: cmd[3], y: cmd[4] };
      const approxDist = Math.hypot(cp.x - currentPos.x, cp.y - currentPos.y) + Math.hypot(target.x - cp.x, target.y - cp.y);
      const steps = Math.max(2, Math.ceil(approxDist / 2));

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const invT = 1 - t;
        const x = invT * invT * currentPos.x + 2 * invT * t * cp.x + t * t * target.x;
        const y = invT * invT * currentPos.y + 2 * invT * t * cp.y + t * t * target.y;
        sampledPoints.push({ x, y });
      }
      currentPos = target;
    } else if (type === 'C') {
      const cp1 = { x: cmd[1], y: cmd[2] };
      const cp2 = { x: cmd[3], y: cmd[4] };
      const target = { x: cmd[5], y: cmd[6] };
      const approxDist = Math.hypot(cp1.x - currentPos.x, cp1.y - currentPos.y) + Math.hypot(cp2.x - cp1.x, cp2.y - cp1.y) + Math.hypot(target.x - cp2.x, target.y - cp2.y);
      const steps = Math.max(3, Math.ceil(approxDist / 2));

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const invT = 1 - t;
        const x = invT * invT * invT * currentPos.x + 3 * invT * invT * t * cp1.x + 3 * invT * t * t * cp2.x + t * t * t * target.x;
        const y = invT * invT * invT * currentPos.y + 3 * invT * invT * t * cp1.y + 3 * invT * t * t * cp2.y + t * t * t * target.y;
        sampledPoints.push({ x, y });
      }
      currentPos = target;
    }
  }

  if (sampledPoints.length === 0) {
    fc.remove(targetPath);
    return [];
  }

  // 2. Identify surviving point runs
  const runs: { x: number; y: number }[][] = [];
  let currentRun: { x: number; y: number }[] = [];
  let hadAnyErasedPoint = false;

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    const localPt = { x: pt.x - pathOffset.x, y: pt.y - pathOffset.y };

    if (isPointInCircles(localPt.x, localPt.y, circles)) {
      hadAnyErasedPoint = true;
      if (currentRun.length >= 2) {
        runs.push(currentRun);
      }
      currentRun = [];
    } else {
      currentRun.push(pt);
    }
  }

  if (currentRun.length >= 2) {
    runs.push(currentRun);
  }

  // If nothing was erased along the stroke points, return original
  if (!hadAnyErasedPoint || (runs.length === 1 && runs[0].length === sampledPoints.length)) {
    return [targetPath];
  }

  // If entire stroke was erased
  if (runs.length === 0) {
    fc.remove(targetPath);
    return [];
  }

  // 3. Create independent `fabric.Path` objects for each disconnected run
  const originalMatrix = targetPath.calcTransformMatrix();
  const createdObjects: fabric.Path[] = [];

  for (let r = 0; r < runs.length; r++) {
    const runPts = runs[r];
    if (runPts.length < 2) continue;

    const svgD = pointsToSvgPath(runPts);
    if (!svgD) continue;

    const newPath = new fabric.Path(svgD, {
      stroke: targetPath.stroke,
      strokeWidth: targetPath.strokeWidth,
      strokeLineCap: targetPath.strokeLineCap || 'round',
      strokeLineJoin: targetPath.strokeLineJoin || 'round',
      strokeDashArray: targetPath.strokeDashArray,
      fill: targetPath.fill,
      opacity: targetPath.opacity ?? 1,
      angle: targetPath.angle || 0,
      scaleX: targetPath.scaleX || 1,
      scaleY: targetPath.scaleY || 1,
      flipX: targetPath.flipX || false,
      flipY: targetPath.flipY || false,
      selectable: true,
      layerId: (targetPath as any).layerId || 'layer-default',
    } as any);

    // Compute exact world coordinate placement
    const newPathOffset = newPath.pathOffset || { x: 0, y: 0 };
    const localDelta = {
      x: newPathOffset.x - pathOffset.x,
      y: newPathOffset.y - pathOffset.y,
    };
    const worldCenter = fabric.util.transformPoint(
      new fabric.Point(localDelta.x, localDelta.y),
      originalMatrix
    );

    newPath.setPositionByOrigin(worldCenter, 'center', 'center');
    newPath.setCoords();

    fc.add(newPath);
    createdObjects.push(newPath);
  }

  fc.remove(targetPath);
  return createdObjects;
}

/**
 * Splits a 2D closed/filled shape, rough object, group, or image into independent
 * disconnected objects via 8-connected component pixel analysis.
 */
function splitShapeByConnectedComponents(
  fc: fabric.Canvas,
  targetObj: fabric.Object
): fabric.Object[] {
  const renderedCanvas = (targetObj as any).toCanvasElement
    ? (targetObj as any).toCanvasElement({ withoutTransform: true, enableRetinaScaling: false })
    : null;

  if (!renderedCanvas) return [targetObj];

  const w = renderedCanvas.width;
  const h = renderedCanvas.height;
  if (w <= 0 || h <= 0) return [targetObj];

  const ctx = renderedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [targetObj];

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const visited = new Uint8Array(w * h);

  // Connected component labeling (BFS flood fill)
  interface Component {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    pixelCount: number;
    pixels: number[];
  }

  const components: Component[] = [];
  const minAlphaThreshold = 15;
  const minPixelArea = 25; // Filter tiny 5x5 noise specks

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const alpha = data[idx * 4 + 3];

      if (alpha > minAlphaThreshold && !visited[idx]) {
        visited[idx] = 1;
        const comp: Component = {
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
          pixelCount: 0,
          pixels: [],
        };

        const queue: number[] = [idx];
        let qHead = 0;

        while (qHead < queue.length) {
          const curr = queue[qHead++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          comp.pixelCount++;
          comp.pixels.push(curr);
          if (cx < comp.minX) comp.minX = cx;
          if (cx > comp.maxX) comp.maxX = cx;
          if (cy < comp.minY) comp.minY = cy;
          if (cy > comp.maxY) comp.maxY = cy;

          // 8-connected neighbor expansion
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (!visited[nIdx] && data[nIdx * 4 + 3] > minAlphaThreshold) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        if (comp.pixelCount >= minPixelArea) {
          components.push(comp);
        }
      }
    }
  }

  // 1. Entire object was erased
  if (components.length === 0) {
    fc.remove(targetObj);
    return [];
  }

  // 2. Object remains a single connected piece
  if (components.length === 1) {
    return [targetObj];
  }

  // 3. Object was disconnected into K >= 2 separate independent objects!
  const originalMatrix = targetObj.calcTransformMatrix();
  const createdObjects: fabric.FabricImage[] = [];

  for (let c = 0; c < components.length; c++) {
    const comp = components[c];
    const compW = comp.maxX - comp.minX + 1;
    const compH = comp.maxY - comp.minY + 1;

    const compCanvas = document.createElement('canvas');
    compCanvas.width = compW;
    compCanvas.height = compH;
    const compCtx = compCanvas.getContext('2d');
    if (!compCtx) continue;

    const compImgData = compCtx.createImageData(compW, compH);
    const destData = compImgData.data;

    // Copy only pixels belonging to this component
    for (let p = 0; p < comp.pixels.length; p++) {
      const srcIdx = comp.pixels[p];
      const sx = srcIdx % w;
      const sy = Math.floor(srcIdx / w);
      const dx = sx - comp.minX;
      const dy = sy - comp.minY;
      const destIdx = (dy * compW + dx) * 4;
      const s4 = srcIdx * 4;

      destData[destIdx] = data[s4];
      destData[destIdx + 1] = data[s4 + 1];
      destData[destIdx + 2] = data[s4 + 2];
      destData[destIdx + 3] = data[s4 + 3];
    }

    compCtx.putImageData(compImgData, 0, 0);

    // Compute component center in object's local coordinate space
    const compLocalCenterX = (comp.minX + comp.maxX) / 2 - w / 2;
    const compLocalCenterY = (comp.minY + comp.maxY) / 2 - h / 2;

    // Transform local center to world coordinate space
    const worldCenter = fabric.util.transformPoint(
      new fabric.Point(compLocalCenterX, compLocalCenterY),
      originalMatrix
    );

    const fragImg = new fabric.FabricImage(compCanvas, {
      originX: 'center',
      originY: 'center',
      left: worldCenter.x,
      top: worldCenter.y,
      angle: targetObj.angle || 0,
      scaleX: targetObj.scaleX || 1,
      scaleY: targetObj.scaleY || 1,
      flipX: targetObj.flipX || false,
      flipY: targetObj.flipY || false,
      opacity: targetObj.opacity ?? 1,
      selectable: true,
      layerId: (targetObj as any).layerId || 'layer-default',
    } as any);

    (fragImg as any).isFragment = true;
    fragImg.setCoords();
    fc.add(fragImg);
    createdObjects.push(fragImg);
  }

  fc.remove(targetObj);
  return createdObjects;
}

/**
 * Master check to determine if an object is an erasable drawing object.
 * Returns false for PDFs, Images, Raster assets, Backgrounds, Grids, and Guides.
 */
export function isErasableObject(obj: fabric.Object | null | undefined): boolean {
  if (!obj) return false;

  // 1. Never erase if hidden or locked
  if (!obj.visible || (obj as any).locked) return false;

  // 2. Never erase PDF documents, pages, or annotations
  const isPdf =
    (obj as any).isPdf ||
    obj.type === 'pdf' ||
    (obj as any).isPdfLocked ||
    (obj as any).isPdfPage ||
    (obj as any).pdfArrayBuffer != null ||
    ((obj as any).id && String((obj as any).id).startsWith('pdf-')) ||
    ((obj as any).name && String((obj as any).name).toLowerCase().endsWith('.pdf'));
  if (isPdf) return false;

  // 3. Never erase user-uploaded Images, Photos, Bitmaps, or Raster Assets
  // Note: Canvas drawing fragments generated by eraser splitting (isFragment: true) remain erasable
  const isProtectedImage =
    !(obj as any).isFragment &&
    (
      (obj as any).isRaster ||
      (obj as any).isImage ||
      (obj as any).isUserImage ||
      ((obj as any).id && String((obj as any).id).startsWith('img-')) ||
      ((obj as any).id && String((obj as any).id).startsWith('image-')) ||
      ((obj as any).name && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String((obj as any).name)))
    );
  if (isProtectedImage) return false;

  // 4. Never erase Background, Grid, Guides, or Selection Visuals
  if (
    (obj as any).isBackground ||
    (obj as any).isGrid ||
    (obj as any).isGuide ||
    (obj as any).isLayerGuide ||
    (obj as any).isSelectionVisual
  ) {
    return false;
  }

  return true;
}

/**
 * Master Disconnected Object Splitter
 * Evaluates an erased target object and splits it into independent, editable objects
 * whenever disconnected regions or strokes have been formed.
 */
export function splitErasedObject(
  fc: fabric.Canvas,
  targetObj: fabric.Object
): fabric.Object[] {
  if (!fc || !targetObj || !isErasableObject(targetObj)) return [targetObj];

  const erasedCircles: ErasedCircle[] = (targetObj as any)._erasedCircles || [];

  // If it's a vector stroke path with open stroke commands and recorded erased circles
  if (
    targetObj.type === 'path' &&
    (targetObj as any).path &&
    targetObj.stroke &&
    targetObj.stroke !== 'transparent' &&
    erasedCircles.length > 0
  ) {
    return splitStrokePath(fc, targetObj as fabric.Path, erasedCircles);
  }

  // For 2D filled shapes, rough objects, groups, images, text, polygons with clipPath
  if ((targetObj as any)._eraseMaskCanvas || (targetObj as any)._clipPathSvg || (targetObj as any).clipPath) {
    return splitShapeByConnectedComponents(fc, targetObj);
  }

  return [targetObj];
}

