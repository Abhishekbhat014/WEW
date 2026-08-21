import type { ToolType } from '../types/canvas';

export interface Point {
  x: number;
  y: number;
}

export interface RecognitionResult {
  shapeType: ToolType | null;
  confidence: number; // 0 to 1
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  suggestedName: string;
}

/**
 * Calculates Euclidean distance between two points.
 */
function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates total path perimeter length.
 */
function getPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

/**
 * Calculates polygon area using Shoelace formula.
 */
function getPolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Ramer-Douglas-Peucker algorithm for stroke point simplification.
 */
function perpendicularDistance(p: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) return distance(p, lineStart);
  const num = Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  const den = Math.hypot(dx, dy);
  return num / den;
}

function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const rec1 = simplifyPoints(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyPoints(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Detect corners by angle changes, filtering out subtle bends.
 */
function getCorners(points: Point[], angleThresholdDeg = 35): Point[] {
  if (points.length < 3) return points;
  const corners: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const v1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (len1 < 4 || len2 < 4) continue;

    const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleRad = Math.acos(clampedDot);
    const angleDeg = (angleRad * 180) / Math.PI;

    if (angleDeg >= angleThresholdDeg) {
      corners.push(pCurr);
    }
  }

  corners.push(points[points.length - 1]);
  return corners;
}

/**
 * Cluster adjacent corners that are too close together to avoid double-counting.
 */
function clusterCorners(corners: Point[], minDist: number): Point[] {
  if (corners.length <= 1) return corners;

  const clustered: Point[] = [corners[0]];
  for (let i = 1; i < corners.length; i++) {
    const prev = clustered[clustered.length - 1];
    const curr = corners[i];
    if (distance(prev, curr) >= minDist) {
      clustered.push(curr);
    }
  }

  // If closed loop, check distance between first and last corner
  if (clustered.length > 2 && distance(clustered[0], clustered[clustered.length - 1]) < minDist) {
    clustered.pop();
  }

  return clustered;
}

/**
 * Count peaks and troughs in distance from centroid to detect stars.
 */
function isStarPattern(points: Point[], centroid: Point): boolean {
  if (points.length < 10) return false;
  const dists = points.map((p) => distance(p, centroid));

  let transitions = 0;
  let increasing = dists[1] > dists[0];

  for (let i = 2; i < dists.length; i++) {
    const isNowIncreasing = dists[i] > dists[i - 1];
    if (isNowIncreasing !== increasing) {
      transitions++;
      increasing = isNowIncreasing;
    }
  }

  // A 5-point star typically has ~10 peaks & valleys (transitions >= 8)
  return transitions >= 7;
}

/**
 * Main Shape Recognition Function.
 */
export function recognizeShapeFromStroke(points: Point[]): RecognitionResult {
  const minResult: RecognitionResult = {
    shapeType: null,
    confidence: 0,
    bounds: { left: 0, top: 0, width: 0, height: 0 },
    suggestedName: '',
  };

  if (!points || points.length < 5) return minResult;

  // Calculate Bounding Box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const bounds = { left: minX, top: minY, width, height };

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const endDistance = distance(startPt, endPt);
  const diagonal = Math.hypot(width, height);
  const isClosed = endDistance < Math.max(30, diagonal * 0.30);

  const totalLength = getPathLength(points);
  const simplified = simplifyPoints(points, Math.max(3, diagonal * 0.025));
  const rawCorners = getCorners(simplified, 35);
  const clusterDist = Math.max(12, diagonal * 0.10);
  const clusteredCorners = clusterCorners(rawCorners, clusterDist);
  const numCorners = clusteredCorners.length;

  // 1. OPEN PATH: Check for Line or Arrow
  if (!isClosed) {
    const straightDist = distance(startPt, endPt);
    const lineRatio = straightDist / (totalLength || 1);

    const isArrow = rawCorners.length >= 3 && lineRatio > 0.72;
    if (isArrow) {
      return {
        shapeType: 'arrow',
        confidence: Math.min(0.95, lineRatio + 0.1),
        bounds,
        suggestedName: 'Arrow',
      };
    }

    if (lineRatio > 0.80) {
      return {
        shapeType: 'line',
        confidence: Math.min(0.98, lineRatio),
        bounds,
        suggestedName: 'Line',
      };
    }
  }

  // 2. CLOSED PATH: Circle / Ellipse / Rectangle / Triangle / Diamond / Star / Polygon
  if (isClosed || endDistance < diagonal * 0.40) {
    const area = getPolygonArea(points);
    const boundingArea = width * height;
    const boundingFillRatio = area / (boundingArea || 1);
    const circularity = (4 * Math.PI * area) / (totalLength * totalLength || 1);
    const aspectRatio = width / height;

    const centroid = {
      x: minX + width / 2,
      y: minY + height / 2,
    };

    // --- A. STAR CHECK ---
    const isStar = numCorners >= 8 || isStarPattern(points, centroid);
    if (isStar && circularity < 0.60 && boundingFillRatio < 0.65) {
      return {
        shapeType: 'star',
        confidence: 0.88,
        bounds,
        suggestedName: 'Star',
      };
    }

    // --- B. TRIANGLE CHECK (3 corners) ---
    if (numCorners === 3 || (numCorners <= 4 && boundingFillRatio < 0.62 && circularity < 0.60)) {
      return {
        shapeType: 'triangle',
        confidence: 0.90,
        bounds,
        suggestedName: 'Triangle',
      };
    }

    // --- C. RECTANGLE / DIAMOND CHECK (4 corners or high fill ratio) ---
    if (numCorners === 4 || (numCorners >= 4 && numCorners <= 6 && boundingFillRatio > 0.68)) {
      // Check for Diamond: top corner near top-mid, right corner near right-mid
      const topCornerNearMid = clusteredCorners.some(
        (c) => Math.abs(c.x - centroid.x) < width * 0.25 && Math.abs(c.y - minY) < height * 0.25
      );
      const leftCornerNearMid = clusteredCorners.some(
        (c) => Math.abs(c.x - minX) < width * 0.25 && Math.abs(c.y - centroid.y) < height * 0.25
      );

      if (topCornerNearMid && leftCornerNearMid && boundingFillRatio < 0.68 && Math.abs(aspectRatio - 1) < 0.35) {
        return {
          shapeType: 'diamond',
          confidence: 0.88,
          bounds,
          suggestedName: 'Diamond',
        };
      }

      const isRounded = circularity > 0.68;
      return {
        shapeType: isRounded ? 'rounded-rect' : 'rectangle',
        confidence: 0.92,
        bounds,
        suggestedName: isRounded ? 'Rounded Rectangle' : 'Rectangle',
      };
    }

    // --- D. POLYGON CHECK (5 to 7 corners) ---
    if (numCorners === 5) {
      return {
        shapeType: 'polygon',
        confidence: 0.85,
        bounds,
        suggestedName: 'Polygon (Pentagon)',
      };
    }

    if (numCorners >= 6 && numCorners <= 7) {
      return {
        shapeType: 'polygon',
        confidence: 0.85,
        bounds,
        suggestedName: 'Polygon (Hexagon)',
      };
    }

    // --- E. CIRCLE / ELLIPSE CHECK ---
    // Circles have few sharp corners (numCorners <= 2) and high circularity / fill ratio
    if (circularity > 0.60 || (numCorners <= 2 && boundingFillRatio > 0.65)) {
      const isPerfectCircle = Math.abs(aspectRatio - 1) < 0.25;
      return {
        shapeType: isPerfectCircle ? 'circle' : 'ellipse',
        confidence: Math.min(0.98, circularity + 0.15),
        bounds,
        suggestedName: isPerfectCircle ? 'Circle' : 'Ellipse',
      };
    }

    // Fallback for high fill ratio (if corners were rounded or imprecise)
    if (boundingFillRatio > 0.70) {
      return {
        shapeType: 'rectangle',
        confidence: 0.80,
        bounds,
        suggestedName: 'Rectangle',
      };
    }
  }

  return minResult;
}
