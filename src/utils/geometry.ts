import type { Point } from '../types/canvas';

/**
 * Snap a coordinate value to the nearest grid step.
 */
export function snapToGridValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a point (x, y) to the nearest grid step.
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGridValue(point.x, gridSize),
    y: snapToGridValue(point.y, gridSize),
  };
}

/**
 * Generate relative points for a star bounded inside (width, height).
 */
export function createStarPointsRelative(
  widthOrSpikes: number = 80,
  heightOrOuter: number = 80,
  innerRadius?: number
): { x: number; y: number }[] {
  let width = 80;
  let height = 80;
  let spikes = 5;

  if (innerRadius !== undefined) {
    spikes = widthOrSpikes;
    const outer = heightOrOuter;
    const inner = innerRadius;
    width = outer * 2;
    height = outer * 2;
    const cx = width / 2;
    const cy = height / 2;
    const points: { x: number; y: number }[] = [];
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes; i++) {
      points.push({ x: cx + Math.cos(rot) * outer, y: cy + Math.sin(rot) * outer });
      rot += step;
      points.push({ x: cx + Math.cos(rot) * inner, y: cy + Math.sin(rot) * inner });
      rot += step;
    }
    return points;
  } else {
    width = widthOrSpikes;
    height = heightOrOuter;
    const cx = width / 2;
    const cy = height / 2;
    const rxOuter = width / 2;
    const ryOuter = height / 2;
    const rxInner = width / 4;
    const ryInner = height / 4;
    const points: { x: number; y: number }[] = [];
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes; i++) {
      points.push({ x: cx + Math.cos(rot) * rxOuter, y: cy + Math.sin(rot) * ryOuter });
      rot += step;
      points.push({ x: cx + Math.cos(rot) * rxInner, y: cy + Math.sin(rot) * ryInner });
      rot += step;
    }
    return points;
  }
}

/**
 * Generate relative points for a polygon bounded inside (width, height).
 */
export function createPolygonPointsRelative(
  widthOrSides: number = 80,
  heightOrRadius?: number
): { x: number; y: number }[] {
  let sides = 6;
  let width = 80;
  let height = 80;

  if (heightOrRadius !== undefined && widthOrSides <= 12 && heightOrRadius > 12) {
    sides = widthOrSides;
    const radius = heightOrRadius;
    width = radius * 2;
    height = radius * 2;
    const cx = width / 2;
    const cy = height / 2;
    const points: { x: number; y: number }[] = [];
    const angleStep = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return points;
  } else {
    width = widthOrSpikesOrWidth(widthOrSides);
    height = heightOrRadius ?? width;
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const points: { x: number; y: number }[] = [];
    const angleStep = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
    }
    return points;
  }
}

function widthOrSpikesOrWidth(val: number): number {
  return val;
}

/**
 * Generate relative points for a diamond bounded inside (width, height).
 */
export function createDiamondPointsRelative(
  width: number = 80,
  height: number = 80
): { x: number; y: number }[] {
  return [
    { x: width / 2, y: 0 },
    { x: width, y: height / 2 },
    { x: width / 2, y: height },
    { x: 0, y: height / 2 },
  ];
}

/**
 * Snap angle to nearest 45-degree increment for lines/arrows when holding Shift.
 */
export function snapAngle45(
  start: { x: number; y: number },
  current: { x: number; y: number }
): { x: number; y: number } {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return current;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + dist * Math.cos(snappedAngle),
    y: start.y + dist * Math.sin(snappedAngle),
  };
}

/**
 * Generate SVG Path string for a vector Arrow with an arrowhead tip at (x2, y2).
 */
export function createArrowPathData(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number = 2
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headlen = Math.max(12, strokeWidth * 3.5);

  const leftX = x2 - headlen * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headlen * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headlen * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headlen * Math.sin(angle + Math.PI / 6);

  return `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${leftX} ${leftY} M ${x2} ${y2} L ${rightX} ${rightY}`;
}

export interface BezierSegment {
  p0: Point;
  cp1: Point;
  cp2: Point;
  p1: Point;
}

export interface PathGeometryBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PathGeometryResult {
  svgPath: string;
  segments: BezierSegment[];
  finalTangentAngle: number;
  bounds: PathGeometryBounds;
}

/**
 * Finds roots of a quadratic equation a*t^2 + b*t + c = 0 in the range 0 < t < 1
 */
function findQuadraticRoots(a: number, b: number, c: number): number[] {
  const roots: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) >= 1e-12) {
      const t = -c / b;
      if (t > 0 && t < 1) roots.push(t);
    }
    return roots;
  }
  const det = b * b - 4 * a * c;
  if (det < 0) return roots;
  const sqrtDet = Math.sqrt(det);
  const t1 = (-b + sqrtDet) / (2 * a);
  const t2 = (-b - sqrtDet) / (2 * a);
  if (t1 > 0 && t1 < 1) roots.push(t1);
  if (t2 > 0 && t2 < 1) roots.push(t2);
  return roots;
}

/**
 * Computes exact extrema of a 1D cubic Bezier curve
 */
function compute1DBezierExtrema(p0: number, p1: number, p2: number, p3: number): { min: number, max: number } {
  let min = Math.min(p0, p3);
  let max = Math.max(p0, p3);

  const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
  const b = 6 * (p0 - 2 * p1 + p2);
  const c = 3 * (p1 - p0);

  const roots = findQuadraticRoots(a, b, c);
  for (const t of roots) {
    const val = (1 - t) * (1 - t) * (1 - t) * p0
              + 3 * (1 - t) * (1 - t) * t * p1
              + 3 * (1 - t) * t * t * p2
              + t * t * t * p3;
    min = Math.min(min, val);
    max = Math.max(max, val);
  }
  return { min, max };
}

/**
 * Computes exact bounding box of a cubic Bezier segment
 */
export function computeBezierSegmentBounds(seg: BezierSegment): PathGeometryBounds {
  const extX = compute1DBezierExtrema(seg.p0.x, seg.cp1.x, seg.cp2.x, seg.p1.x);
  const extY = compute1DBezierExtrema(seg.p0.y, seg.cp1.y, seg.cp2.y, seg.p1.y);
  return {
    minX: extX.min,
    maxX: extX.max,
    minY: extY.min,
    maxY: extY.max
  };
}

/**
 * Builds smooth Catmull-Rom cubic Bezier path geometry from a list of world/canonical path points.
 * For 2 points, produces a straight line.
 * For >= 3 points, computes Catmull-Rom spline segments converted to cubic Beziers.
 * Also calculates the exact tangent angle at the final endpoint (t = 1) for arrowheads.
 */
export function buildPathGeometry(points: Point[]): PathGeometryResult {
  if (!points || points.length < 2) {
    const defaultPt = points && points.length > 0 ? points[0] : { x: 0, y: 0 };
    return {
      svgPath: `M ${defaultPt.x} ${defaultPt.y} L ${defaultPt.x} ${defaultPt.y}`,
      segments: [],
      finalTangentAngle: 0,
      bounds: { minX: defaultPt.x, minY: defaultPt.y, maxX: defaultPt.x, maxY: defaultPt.y }
    };
  }

  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const seg = { p0, cp1: p0, cp2: p1, p1 };
    return {
      svgPath: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
      segments: [seg],
      finalTangentAngle: angle,
      bounds: computeBezierSegmentBounds(seg)
    };
  }

  // Generate virtual end control points for natural open-curve end behavior without overshoot
  const n = points.length - 1;
  const pMinus1 = {
    x: 2 * points[0].x - points[1].x,
    y: 2 * points[0].y - points[1].y,
  };
  const pPlus1 = {
    x: 2 * points[n].x - points[n - 1].x,
    y: 2 * points[n].y - points[n - 1].y,
  };

  const virtualPoints = [pMinus1, ...points, pPlus1];
  const segments: BezierSegment[] = [];
  let svgPath = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < n; i++) {
    const p0 = virtualPoints[i + 1];
    const p1 = virtualPoints[i + 2];
    const pPrev = virtualPoints[i];
    const pNext = virtualPoints[i + 3];

    // Catmull-Rom control point conversion (tension = 0.5)
    const cp1 = {
      x: p0.x + (p1.x - pPrev.x) / 6,
      y: p0.y + (p1.y - pPrev.y) / 6,
    };
    const cp2 = {
      x: p1.x - (pNext.x - p0.x) / 6,
      y: p1.y - (pNext.y - p0.y) / 6,
    };

    segments.push({ p0, cp1, cp2, p1 });
    svgPath += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p1.x} ${p1.y}`;
  }

  // Calculate tangent angle at final endpoint Pn (derived from last control point cp2)
  const lastSeg = segments[segments.length - 1];
  let dx = lastSeg.p1.x - lastSeg.cp2.x;
  let dy = lastSeg.p1.y - lastSeg.cp2.y;
  if (Math.hypot(dx, dy) < 1e-5) {
    dx = lastSeg.p1.x - lastSeg.p0.x;
    dy = lastSeg.p1.y - lastSeg.p0.y;
  }
  const finalTangentAngle = Math.atan2(dy, dx);

  // Calculate exact cubic bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const seg of segments) {
    const segBounds = computeBezierSegmentBounds(seg);
    minX = Math.min(minX, segBounds.minX);
    minY = Math.min(minY, segBounds.minY);
    maxX = Math.max(maxX, segBounds.maxX);
    maxY = Math.max(maxY, segBounds.maxY);
  }

  return {
    svgPath,
    segments,
    finalTangentAngle,
    bounds: { minX, minY, maxX, maxY }
  };
}

export interface ClosestPathResult {
  point: Point;
  segmentIndex: number;
  t: number;
  distanceScreen: number;
}

/**
 * Samples Catmull-Rom path segments to find the closest point on the path to a given cursor position.
 * Returns distance in screen pixels based on canvas zoom level.
 */
export function getClosestPointOnCatmullPath(
  points: Point[],
  cursorWorld: Point,
  zoom: number = 1
): ClosestPathResult | null {
  const geo = buildPathGeometry(points);
  if (!geo.segments || geo.segments.length === 0) return null;

  let minDistanceScreen = Infinity;
  let bestPoint: Point = { x: cursorWorld.x, y: cursorWorld.y };
  let bestSegIndex = 0;
  let bestT = 0;

  const SAMPLES_PER_SEGMENT = 20;

  geo.segments.forEach((seg, segIdx) => {
    let prevPoint: Point | null = null;
    let prevT: number = 0;

    for (let i = 0; i <= SAMPLES_PER_SEGMENT; i++) {
      const t = i / SAMPLES_PER_SEGMENT;
      const oneMinusT = 1 - t;

      // Cubic Bezier interpolation
      const x =
        oneMinusT * oneMinusT * oneMinusT * seg.p0.x +
        3 * oneMinusT * oneMinusT * t * seg.cp1.x +
        3 * oneMinusT * t * t * seg.cp2.x +
        t * t * t * seg.p1.x;

      const y =
        oneMinusT * oneMinusT * oneMinusT * seg.p0.y +
        3 * oneMinusT * oneMinusT * t * seg.cp1.y +
        3 * oneMinusT * t * t * seg.cp2.y +
        t * t * t * seg.p1.y;

      const currentPoint = { x, y };

      if (prevPoint) {
        // Find closest point on the line segment between prevPoint and currentPoint
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const lengthSq = dx * dx + dy * dy;

        let segT = 0;
        if (lengthSq > 0) {
          segT = ((cursorWorld.x - prevPoint.x) * dx + (cursorWorld.y - prevPoint.y) * dy) / lengthSq;
          segT = Math.max(0, Math.min(1, segT));
        }

        const projX = prevPoint.x + segT * dx;
        const projY = prevPoint.y + segT * dy;

        const distWorld = Math.hypot(projX - cursorWorld.x, projY - cursorWorld.y);
        const distScreen = distWorld * zoom;

        if (distScreen < minDistanceScreen) {
          minDistanceScreen = distScreen;
          bestPoint = { x: projX, y: projY };
          bestSegIndex = segIdx;
          bestT = prevT + segT * (t - prevT);
        }
      } else {
        const distWorld = Math.hypot(x - cursorWorld.x, y - cursorWorld.y);
        const distScreen = distWorld * zoom;
        if (distScreen < minDistanceScreen) {
          minDistanceScreen = distScreen;
          bestPoint = currentPoint;
          bestSegIndex = segIdx;
          bestT = t;
        }
      }

      prevPoint = currentPoint;
      prevT = t;
    }
  });

  return {
    point: bestPoint,
    segmentIndex: bestSegIndex,
    t: bestT,
    distanceScreen: minDistanceScreen,
  };
}


