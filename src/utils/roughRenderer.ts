import * as fabric from 'fabric';
import rough from 'roughjs';
import type { DrawingStyle, FillStyle, StrokeStyle, EdgesType, DiagramDirection, AnchorSide } from '../types/canvas';
import { createStarPointsRelative, createPolygonPointsRelative, createDiamondPointsRelative, buildPathGeometry } from './geometry';

function getRoughRenderPadding(config: Partial<RoughShapeConfig>): number {
  const strokeWidth = config.strokeWidth ?? 2;
  const roughness = config.roughness ?? 0;
  return (strokeWidth / 2) + (roughness * 2.5) + 2;
}

export { createStarPointsRelative, createPolygonPointsRelative, createDiamondPointsRelative };

export interface RoughShapeConfig {
  shapeType: string;
  left: number;
  top: number;
  width: number;
  height: number;
  stroke: string;
  fill: string;
  strokeColor?: string;
  fillColor?: string;
  colorSource?: 'theme-default' | 'custom';
  scaleX?: number;
  scaleY?: number;
  strokeWidth: number;
  opacity: number;
  drawingStyle: DrawingStyle;
  roughness: number;
  bowing: number;
  fillStyle: FillStyle;
  hachureGap?: number;
  strokeStyle?: StrokeStyle;
  edges?: EdgesType;
  layerId?: string;
  angle?: number;
  points?: { x: number; y: number }[]; // For polygons, stars, diamonds, freehand
  worldPoints?: { x: number; y: number }[]; // Canonical world space geometry for lines/arrows
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  seed?: number;
  isConnector?: boolean;
  sourceNodeId?: string;
  targetNodeId?: string;
  direction?: DiagramDirection;
  sourceAnchor?: AnchorSide;
  targetAnchor?: AnchorSide;
}

const generator = rough.generator();

export function getRoughOptions(config: Partial<RoughShapeConfig>): any {
  let roughness = config.roughness ?? 1.5;
  let bowing = config.bowing ?? 1.5;

  const stroke = config.stroke || config.strokeColor || '#1E293B';
  const strokeWidth = Math.max(1, config.strokeWidth ?? 2);
  const rawFill = config.fill !== undefined ? config.fill : config.fillColor;
  const isFillActive = !!rawFill && rawFill !== 'transparent' && rawFill !== 'none';
  const fill = isFillActive ? rawFill : undefined;
  // If fill is transparent or none, bypass pattern path generation completely to save memory
  const userFillStyle = isFillActive ? (config.fillStyle || 'hachure') : 'solid';
  const hachureGap = Math.max(1, config.hachureGap ?? 5);
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);

  let strokeLineDash: number[] | undefined = undefined;
  if (config.strokeStyle === 'dashed') {
    strokeLineDash = [8, 8];
  } else if (config.strokeStyle === 'dotted') {
    strokeLineDash = [3, 6];
  }

  // Rough.js fill style mapping & specific parameters for distinct patterns
  let fillStyle: string = userFillStyle;
  let zigzagOffset: number | undefined = undefined;
  let effectiveHachureGap = hachureGap;
  let hachureAngle = 60;
  let fillWeight = 1.5;
  let effectiveStrokeWidth = strokeWidth;

  // Drawing Style preset overrides (affects BOTH Border outline & Inner fill pattern)
  const dStyle = config.drawingStyle;
  if (dStyle === 'pencil') {
    effectiveStrokeWidth = strokeWidth;
    roughness = Math.max(2.2, roughness);
    bowing = Math.max(2.0, bowing);
    fillWeight = 1.0;
  } else if (dStyle === 'marker') {
    effectiveStrokeWidth = strokeWidth;
    roughness = 0.8;
    bowing = 0.5;
    fillWeight = Math.max(2, strokeWidth * 1.2);
  } else if (dStyle === 'ink') {
    effectiveStrokeWidth = strokeWidth;
    roughness = 0.3;
    bowing = 0.2;
    fillWeight = 1.6;
  } else if (dStyle === 'precise') {
    effectiveStrokeWidth = strokeWidth;
    roughness = 0;
    bowing = 0;
    fillWeight = 1.5;
  } else if (dStyle === 'sketch') {
    effectiveStrokeWidth = strokeWidth;
    roughness = Math.max(1.8, roughness);
    bowing = Math.max(1.5, bowing);
  }

  if (userFillStyle === 'zigzag') {
    fillStyle = 'zigzag';
    // Zigzag requires wider row gap and pronounced offset amplitude for distinct waves
    effectiveHachureGap = Math.max(12, hachureGap * 2.2);
    zigzagOffset = Math.max(10, hachureGap * 1.8);
    hachureAngle = 0; // Horizontal zigzag wave lines
  } else if (userFillStyle === 'dots') {
    fillStyle = 'dots';
    fillWeight = Math.max(fillWeight, 2.5);
  } else if (userFillStyle === 'dashed') {
    fillStyle = 'dashed';
    hachureAngle = 45;
  } else if (userFillStyle === 'cross-hatch') {
    fillStyle = 'cross-hatch';
    hachureAngle = 60;
  } else if (userFillStyle === 'hachure') {
    fillStyle = 'hachure';
    hachureAngle = 60;
  }

  const isPrecise = roughness === 0;

  return {
    seed,
    roughness,
    bowing,
    stroke,
    strokeWidth: effectiveStrokeWidth,
    fill,
    fillStyle,
    hachureGap: effectiveHachureGap,
    hachureAngle,
    zigzagOffset,
    fillWeight,
    curveFitting: 0.95,
    disableMultiStroke: isPrecise,
    disableMultiStrokeFill: isPrecise,
    strokeLineDash,
    fillLineDash: undefined, // Fill pattern lines are always solid, never dashed/dotted
  };
}

/**
 * Creates a Fabric.Group containing Rough.js path elements for a hand-drawn appearance.
 */
export function createRoughShape(config: RoughShapeConfig): fabric.Group {
  const options = getRoughOptions(config);
  const w = Math.max(2, config.width);
  const h = Math.max(2, config.height);

  let drawable: any = null;

  switch (config.shapeType) {
    case 'rectangle':
    case 'rounded-rect': {
      const isRounded = config.edges ? config.edges === 'rounded' : config.shapeType === 'rounded-rect';
      if (isRounded) {
        const rx = Math.min(config.rx !== undefined ? config.rx : 16, w / 2);
        const ry = Math.min(config.ry !== undefined ? config.ry : 16, h / 2);
        const pathD = `M ${rx} 0 H ${w - rx} A ${rx} ${ry} 0 0 1 ${w} ${ry} V ${h - ry} A ${rx} ${ry} 0 0 1 ${w - rx} ${h} H ${rx} A ${rx} ${ry} 0 0 1 0 ${h - ry} V ${ry} A ${rx} ${ry} 0 0 1 ${rx} 0 Z`;
        drawable = generator.path(pathD, options);
      } else {
        drawable = generator.rectangle(0, 0, w, h, options);
      }
      break;
    }

    case 'circle':
    case 'ellipse': {
      drawable = generator.ellipse(w / 2, h / 2, w, h, options);
      break;
    }

    case 'triangle': {
      drawable = generator.polygon(
        [
          [w / 2, 0],
          [w, h],
          [0, h],
        ],
        options
      );
      break;
    }

    case 'line': {
      const x1 = config.x1 ?? 0;
      const y1 = config.y1 ?? 0;
      const x2 = config.x2 ?? w;
      const y2 = config.y2 ?? h;
      const effectivePoints = config.points && config.points.length >= 2
        ? config.points
        : [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      config.points = effectivePoints;

      const geo = buildPathGeometry(effectivePoints);
      drawable = generator.path(geo.svgPath, options);
      break;
    }

    case 'arrow': {
      const x1 = config.x1 ?? 0;
      const y1 = config.y1 ?? 0;
      const x2 = config.x2 ?? w;
      const y2 = config.y2 ?? h;
      const effectivePoints = config.points && config.points.length >= 2
        ? config.points
        : [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      config.points = effectivePoints;

      const geo = buildPathGeometry(effectivePoints);
      const endPt = effectivePoints[effectivePoints.length - 1];
      const angle = geo.finalTangentAngle;
      const headLength = Math.max(12, config.strokeWidth * 4);
      const arrowP1 = [
        endPt.x - headLength * Math.cos(angle - Math.PI / 6),
        endPt.y - headLength * Math.sin(angle - Math.PI / 6),
      ];
      const arrowP2 = [
        endPt.x - headLength * Math.cos(angle + Math.PI / 6),
        endPt.y - headLength * Math.sin(angle + Math.PI / 6),
      ];

      const lineDraw = generator.path(geo.svgPath, options);
      const headDraw = generator.polygon([[endPt.x, endPt.y], arrowP1 as [number, number], arrowP2 as [number, number]], {
        ...options,
        fill: options.stroke,
        fillStyle: 'solid',
      });

      const paths = [...generator.toPaths(lineDraw), ...generator.toPaths(headDraw)];
      return buildFabricGroupFromPaths(paths, config);
    }

    case 'polygon':
    case 'star':
    case 'diamond': {
      let pts: [number, number][] = [];
      if (config.points && config.points.length > 0) {
        pts = config.points.map((p) => [p.x, p.y] as [number, number]);
      } else {
        let genPoints: { x: number; y: number }[] = [];
        if (config.shapeType === 'star') {
          genPoints = createStarPointsRelative(w, h);
        } else if (config.shapeType === 'polygon') {
          genPoints = createPolygonPointsRelative(w, h);
        } else if (config.shapeType === 'diamond') {
          genPoints = createDiamondPointsRelative(w, h);
        }
        pts = genPoints.map((p) => [p.x, p.y] as [number, number]);
      }
      if (pts.length > 0) {
        drawable = generator.polygon(pts, options);
      } else {
        drawable = generator.rectangle(0, 0, w, h, options);
      }
      break;
    }

    case 'freehand': {
      if (config.points && config.points.length > 1) {
        const pts = config.points.map((p) => [p.x, p.y] as [number, number]);
        drawable = generator.linearPath(pts, options);
      }
      break;
    }
  }

  const paths = drawable ? generator.toPaths(drawable) : [];
  return buildFabricGroupFromPaths(paths, config);
}

function buildFabricGroupFromPaths(paths: any[], config: RoughShapeConfig): fabric.Group {
  let strokeDashArray: number[] | undefined = undefined;
  if (config.strokeStyle === 'dashed') {
    strokeDashArray = [8, 8];
  } else if (config.strokeStyle === 'dotted') {
    strokeDashArray = [3, 6];
  }

  // Normalize fill color for comparison (detect fill pattern paths)
  const shapeFillColor = config.fill && config.fill !== 'transparent' ? config.fill.toLowerCase() : null;
  const shapeBorderColor = (config.stroke || '#1e293b').toLowerCase();

  // Buckets for combining SVG path `d` strings into single Fabric.Path instances.
  // This reduces the Fabric object count from hundreds per shape down to 1-3,
  // preventing massive memory bloat (from hundreds of MBs down to a few KBs).
  const fillDList: string[] = [];
  let fillColor = 'transparent';

  const patternDList: string[] = [];
  let patternStroke = shapeFillColor || config.fill || '#6366F1';
  let patternStrokeWidth = 1.5;

  const borderDList: string[] = [];
  const borderStroke = config.stroke || '#1e293b';
  const borderStrokeWidth = config.strokeWidth ?? 2;

  paths.forEach((p, idx) => {
    if (!p || !p.d) return;

    const rawFill = p.fill && p.fill !== 'none' && p.fill !== 'transparent' ? p.fill : null;
    const rawStroke = p.stroke && p.stroke !== 'none' && p.stroke !== 'transparent' ? p.stroke : null;

    if (rawFill) {
      fillDList.push(p.d);
      fillColor = rawFill;
      return;
    }

    const isFillPatternPath = !!rawFill || (
      !!rawStroke &&
      !!shapeFillColor &&
      rawStroke.toLowerCase() === shapeFillColor &&
      (shapeFillColor !== shapeBorderColor || (config.fillStyle !== 'solid' && idx < paths.length - 1))
    );

    if (isFillPatternPath) {
      patternDList.push(p.d);
      if (rawStroke) patternStroke = rawStroke;
      if (p.strokeWidth !== undefined && p.strokeWidth > 0) patternStrokeWidth = p.strokeWidth;
    } else {
      borderDList.push(p.d);
    }
  });

  const fabricPaths: fabric.Path[] = [];

  // 1. Solid / Shape fill path
  if (fillDList.length > 0) {
    fabricPaths.push(
      new fabric.Path(fillDList.join(' '), {
        fill: fillColor,
        stroke: 'transparent',
        strokeWidth: 0,
        selectable: false,
        evented: false,
      })
    );
  }

  // 2. Combined Fill Pattern strokes (hachure, cross-hatch, zigzag, dots, etc.)
  if (patternDList.length > 0) {
    fabricPaths.push(
      new fabric.Path(patternDList.join(' '), {
        stroke: patternStroke,
        strokeWidth: patternStrokeWidth,
        fill: 'transparent',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: false,
        evented: false,
      })
    );
  }

  const isLineOrArrow = config.shapeType === 'line' || config.shapeType === 'arrow';

  // 3. Combined Border outline strokes
  if (borderDList.length > 0) {
    fabricPaths.push(
      new fabric.Path(borderDList.join(' '), {
        stroke: borderStroke,
        strokeWidth: borderStrokeWidth,
        strokeDashArray,
        fill: 'transparent',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        strokeUniform: true,
        objectCaching: !isLineOrArrow,
        selectable: false,
        evented: false,
      })
    );
  }

  const group = new fabric.Group(fabricPaths, {
    left: config.left,
    top: config.top,
    angle: config.angle || 0,
    opacity: config.opacity,
    originX: 'left',
    originY: 'top',
    lockUniScaling: false,
    uniformScaling: false,
    selectable: true,
    subTargetCheck: false,
    objectCaching: !isLineOrArrow,
    strokeUniform: true,
  } as any);

  group.setCoords();

  // Store metadata directly on the Fabric group for state restoration & live updates
  (group as any).isRoughObject = true;
  (group as any).shapeType = config.shapeType;
  (group as any).targetWidth = config.width;
  (group as any).targetHeight = config.height;
  (group as any).drawingStyle = config.drawingStyle || 'precise';
  (group as any).roughness = config.roughness ?? 0;
  (group as any).bowing = config.bowing ?? 0;
  (group as any).fillStyle = config.fillStyle || 'solid';
  (group as any).hachureGap = config.hachureGap ?? 5;
  (group as any).strokeStyle = config.strokeStyle || 'solid';
  (group as any).edges = config.edges || 'rounded';
  (group as any).seed = config.seed || Math.floor(Math.random() * 2147483647);
  (group as any).fill = config.fill;
  (group as any).stroke = config.stroke;
  (group as any).strokeWidth = config.strokeWidth;
  (group as any).opacity = config.opacity;
  (group as any).colorSource = config.colorSource || 'theme-default';
  (group as any).layerId = config.layerId || 'layer-default';
  (group as any).points = config.points;
  (group as any).rx = config.rx;
  (group as any).ry = config.ry;
  (group as any).x1 = config.x1;
  (group as any).y1 = config.y1;
  (group as any).x2 = config.x2;
  (group as any).y2 = config.y2;
  if ((config as any).worldPoints) {
    (group as any).worldPoints = (config as any).worldPoints;
  }

  return group;
}

/**
 * Helper to construct and align Line/Arrow Fabric geometry safely using center-based
 * coordinate space, preventing drift.
 */
function buildLineArrowFabricGeometry(
  existingObj: fabric.Group,
  newProps: Partial<RoughShapeConfig>
): fabric.Group {
  // 1. worldPoints resolution (single source of truth)
  let worldPoints = (newProps as any).worldPoints || (existingObj as any).worldPoints;

  if (!worldPoints) {
    // Migration: push legacy local points through current transform
    let pts = newProps.points || (existingObj as any).points;
    if (!pts || pts.length < 2) {
      const origW = (existingObj as any).targetWidth || existingObj.width || 1;
      const origH = (existingObj as any).targetHeight || existingObj.height || 1;
      const x1 = (existingObj as any).x1 ?? 0;
      const y1 = (existingObj as any).y1 ?? 0;
      const x2 = (existingObj as any).x2 ?? origW;
      const y2 = (existingObj as any).y2 ?? origH;
      pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }
    const oldT = existingObj.calcTransformMatrix();
    worldPoints = pts.map((p: any) => fabric.util.transformPoint(p, oldT));
  }

  // 2. Map back to object-local space using current transform
  const T = existingObj.calcTransformMatrix();
  const T_inv = fabric.util.invertTransform(T);
  const localPoints = worldPoints.map((p: any) => fabric.util.transformPoint(p, T_inv));

  // 3. Compute accurate bezier bounds and center
  const geo = buildPathGeometry(localPoints);
  let minX = geo.bounds.minX;
  let minY = geo.bounds.minY;
  let maxX = geo.bounds.maxX;
  let maxY = geo.bounds.maxY;

  const shapeType = (existingObj as any).shapeType || 'line';
  const strokeWidth = newProps.strokeWidth ?? existingObj.strokeWidth ?? (existingObj as any).strokeWidth ?? 1;
  const roughness = newProps.roughness ?? (existingObj as any).roughness ?? 0;

  if (shapeType === 'arrow' && localPoints.length >= 2) {
    const endPt = localPoints[localPoints.length - 1];
    const angle = geo.finalTangentAngle;
    const headLength = Math.max(12, strokeWidth * 4);
    const arrowP1X = endPt.x - headLength * Math.cos(angle - Math.PI / 6);
    const arrowP1Y = endPt.y - headLength * Math.sin(angle - Math.PI / 6);
    const arrowP2X = endPt.x - headLength * Math.cos(angle + Math.PI / 6);
    const arrowP2Y = endPt.y - headLength * Math.sin(angle + Math.PI / 6);

    minX = Math.min(minX, arrowP1X, arrowP2X);
    minY = Math.min(minY, arrowP1Y, arrowP2Y);
    maxX = Math.max(maxX, arrowP1X, arrowP2X);
    maxY = Math.max(maxY, arrowP1Y, arrowP2Y);
  }

  const padding = getRoughRenderPadding({ strokeWidth, roughness });
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  if (maxX === minX) { maxX += 2; minX -= 2; }
  if (maxY === minY) { maxY += 2; minY -= 2; }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // 4. Center local points for Fabric Group Child Space
  const centeredPoints = localPoints.map((p: any) => ({
    x: p.x - centerX,
    y: p.y - centerY
  }));

  // 5. Generate RoughJS SVGs via createRoughShape
  const currentProps: RoughShapeConfig = {
    shapeType: (existingObj as any).shapeType || 'line',
    left: 0,
    top: 0,
    width,
    height,
    angle: 0, // Children generated unrotated
    stroke: typeof existingObj.stroke === 'string' ? existingObj.stroke : (existingObj as any).stroke || '#1E293B',
    fill: typeof existingObj.fill === 'string' ? existingObj.fill : (existingObj as any).fill || '#6366F1',
    strokeWidth: existingObj.strokeWidth ?? (existingObj as any).strokeWidth ?? 1,
    opacity: existingObj.opacity ?? 1,
    drawingStyle: (existingObj as any).drawingStyle || 'precise',
    roughness: (existingObj as any).roughness ?? 0,
    bowing: (existingObj as any).bowing ?? 0,
    fillStyle: (existingObj as any).fillStyle || 'solid',
    hachureGap: (existingObj as any).hachureGap ?? 5,
    strokeStyle: (existingObj as any).strokeStyle || 'solid',
    edges: (existingObj as any).edges || 'rounded',
    seed: (existingObj as any).seed || Math.floor(Math.random() * 2147483647),
    layerId: (existingObj as any).layerId || 'layer-default',
    points: centeredPoints,
    colorSource: (existingObj as any).colorSource || 'theme-default',
    ...newProps,
  };

  const newGroup = createRoughShape(currentProps);

  // 6. Swap children without destroying the group
  const oldObjects = [...existingObj.getObjects()];
  if (typeof (existingObj as any).removeAll === 'function') {
    (existingObj as any).removeAll();
  } else {
    existingObj.remove(...oldObjects);
  }
  
  const newObjects = [...newGroup.getObjects()];
  newObjects.forEach(obj => {
    obj.group = existingObj;
  });
  (existingObj as any)._objects = newObjects;
  existingObj.dirty = true;

  // 7. Update dimensions natively
  existingObj.set({
    width,
    height,
  });
  (existingObj as any).targetWidth = width;
  (existingObj as any).targetHeight = height;

  // 8. Re-position around exact transformed center
  const worldCenter = fabric.util.transformPoint({ x: centerX, y: centerY }, T);
  existingObj.setPositionByOrigin(worldCenter, 'center', 'center');

  // 9. Store canonical state
  (existingObj as any).worldPoints = worldPoints;
  (existingObj as any).points = centeredPoints;
  (existingObj as any).x1 = centeredPoints[0].x;
  (existingObj as any).y1 = centeredPoints[0].y;
  (existingObj as any).x2 = centeredPoints[centeredPoints.length - 1].x;
  (existingObj as any).y2 = centeredPoints[centeredPoints.length - 1].y;

  (existingObj as any).drawingStyle = currentProps.drawingStyle;
  (existingObj as any).roughness = currentProps.roughness;
  (existingObj as any).bowing = currentProps.bowing;
  (existingObj as any).fillStyle = currentProps.fillStyle;
  (existingObj as any).strokeStyle = currentProps.strokeStyle;
  (existingObj as any).edges = currentProps.edges;
  (existingObj as any).strokeWidth = currentProps.strokeWidth;
  (existingObj as any).opacity = currentProps.opacity;
  (existingObj as any).stroke = currentProps.stroke;
  (existingObj as any).fill = currentProps.fill;

  existingObj.setCoords();
  return existingObj as fabric.Group;
}

/**
 * Re-renders an existing Rough object with new properties while preserving position, scale, rotation, and ID.
 */
export function updateRoughObject(
  fabricCanvas: fabric.Canvas,
  existingObj: fabric.Object,
  newProps: Partial<RoughShapeConfig>
): fabric.Object | null {
  if (!existingObj) return null;

  // FAST PATH FOR OPACITY: Opacity changes layer transparency only, without destroying/recreating shape paths
  const oldOpacity = (existingObj as any).opacity ?? existingObj.opacity ?? 1;
  const isOnlyOpacityChanged =
    newProps.opacity !== undefined &&
    Math.abs(newProps.opacity - oldOpacity) > 0.001 &&
    (newProps.stroke === undefined || newProps.stroke === (existingObj as any).stroke) &&
    (newProps.fill === undefined || newProps.fill === (existingObj as any).fill) &&
    (newProps.strokeWidth === undefined || newProps.strokeWidth === (existingObj as any).strokeWidth) &&
    (newProps.drawingStyle === undefined || newProps.drawingStyle === (existingObj as any).drawingStyle) &&
    (newProps.roughness === undefined || newProps.roughness === (existingObj as any).roughness) &&
    (newProps.bowing === undefined || newProps.bowing === (existingObj as any).bowing) &&
    (newProps.fillStyle === undefined || newProps.fillStyle === (existingObj as any).fillStyle) &&
    (newProps.hachureGap === undefined || newProps.hachureGap === (existingObj as any).hachureGap) &&
    (newProps.strokeStyle === undefined || newProps.strokeStyle === (existingObj as any).strokeStyle) &&
    (newProps.edges === undefined || newProps.edges === (existingObj as any).edges);

  if (isOnlyOpacityChanged) {
    existingObj.set({ opacity: newProps.opacity });
    (existingObj as any).opacity = newProps.opacity;
    fabricCanvas.renderAll();
    return existingObj;
  }

  const currentScaleX = existingObj.scaleX || 1;
  const currentScaleY = existingObj.scaleY || 1;

  const oldWidth = ((existingObj as any).targetWidth ?? existingObj.width ?? 0) * currentScaleX;
  const oldHeight = ((existingObj as any).targetHeight ?? existingObj.height ?? 0) * currentScaleY;
  const oldStroke = (existingObj as any).stroke ?? existingObj.stroke;
  const oldFill = (existingObj as any).fill ?? existingObj.fill;
  const oldStrokeWidth = (existingObj as any).strokeWidth ?? existingObj.strokeWidth;
  const oldDrawingStyle = (existingObj as any).drawingStyle;
  const oldRoughness = (existingObj as any).roughness;
  const oldBowing = (existingObj as any).bowing;
  const oldFillStyle = (existingObj as any).fillStyle;
  const oldHachureGap = (existingObj as any).hachureGap;
  const oldStrokeStyle = (existingObj as any).strokeStyle;
  const oldEdges = (existingObj as any).edges;
  const oldRx = (existingObj as any).rx;
  const oldRy = (existingObj as any).ry;

  const normColor = (c: any) => (typeof c === 'string' ? c.trim().toLowerCase() : c);
  const newStroke = normColor(newProps.stroke !== undefined ? newProps.stroke : newProps.strokeColor);
  const newFill = normColor(newProps.fill !== undefined ? newProps.fill : newProps.fillColor);

  const hasScaleChange = Math.abs(currentScaleX - 1) > 0.001 || Math.abs(currentScaleY - 1) > 0.001;
  const hasWidthChange = newProps.width !== undefined && Math.abs(newProps.width - oldWidth) > 0.5;
  const hasHeightChange = newProps.height !== undefined && Math.abs(newProps.height - oldHeight) > 0.5;
  const hasStrokeChange = newStroke !== undefined && newStroke !== normColor(oldStroke);
  const hasFillChange = newFill !== undefined && newFill !== normColor(oldFill);
  const hasStrokeWidthChange = newProps.strokeWidth !== undefined && newProps.strokeWidth !== oldStrokeWidth;
  const hasDrawingStyleChange = newProps.drawingStyle !== undefined && newProps.drawingStyle !== oldDrawingStyle;
  const hasRoughnessChange = newProps.roughness !== undefined && newProps.roughness !== oldRoughness;
  const hasBowingChange = newProps.bowing !== undefined && newProps.bowing !== oldBowing;
  const hasFillStyleChange = newProps.fillStyle !== undefined && newProps.fillStyle !== oldFillStyle;
  const hasHachureGapChange = newProps.hachureGap !== undefined && newProps.hachureGap !== oldHachureGap;
  const hasStrokeStyleChange = newProps.strokeStyle !== undefined && newProps.strokeStyle !== oldStrokeStyle;
  const hasEdgesChange = newProps.edges !== undefined && newProps.edges !== oldEdges;
  const hasRxChange = newProps.rx !== undefined && newProps.rx !== oldRx;
  const hasRyChange = newProps.ry !== undefined && newProps.ry !== oldRy;
  const hasPointsChange = newProps.points !== undefined;
  const hasX1Change = newProps.x1 !== undefined && Math.abs(newProps.x1 - ((existingObj as any).x1 ?? 0)) > 0.5;
  const hasY1Change = newProps.y1 !== undefined && Math.abs(newProps.y1 - ((existingObj as any).y1 ?? 0)) > 0.5;
  const hasX2Change = newProps.x2 !== undefined && Math.abs(newProps.x2 - ((existingObj as any).x2 ?? (existingObj.width || 0))) > 0.5;
  const hasY2Change = newProps.y2 !== undefined && Math.abs(newProps.y2 - ((existingObj as any).y2 ?? (existingObj.height || 0))) > 0.5;
  const hasWorldPointsChange = (newProps as any).worldPoints !== undefined;

  const hasAnyVisualShapeChange =
    hasScaleChange ||
    hasWidthChange ||
    hasHeightChange ||
    hasStrokeChange ||
    hasFillChange ||
    hasStrokeWidthChange ||
    hasDrawingStyleChange ||
    hasRoughnessChange ||
    hasBowingChange ||
    hasFillStyleChange ||
    hasHachureGapChange ||
    hasStrokeStyleChange ||
    hasEdgesChange ||
    hasRxChange ||
    hasRyChange ||
    hasPointsChange ||
    hasX1Change ||
    hasY1Change ||
    hasX2Change ||
    hasY2Change ||
    hasWorldPointsChange;

  if (!hasAnyVisualShapeChange) {
    let needsRender = false;
    if (newProps.left !== undefined && Math.abs(newProps.left - existingObj.left) > 0.01) {
      existingObj.set('left', newProps.left);
      needsRender = true;
    }
    if (newProps.top !== undefined && Math.abs(newProps.top - existingObj.top) > 0.01) {
      existingObj.set('top', newProps.top);
      needsRender = true;
    }
    if (newProps.angle !== undefined && Math.abs(newProps.angle - (existingObj.angle || 0)) > 0.01) {
      existingObj.set('angle', newProps.angle);
      needsRender = true;
    }
    if (newProps.opacity !== undefined && Math.abs(newProps.opacity - (existingObj.opacity ?? 1)) > 0.001) {
      existingObj.set('opacity', newProps.opacity);
      (existingObj as any).opacity = newProps.opacity;
      needsRender = true;
    }
    if (needsRender) {
      existingObj.setCoords();
      fabricCanvas.requestRenderAll();
    }
    return existingObj;
  }

  const width = newProps.width !== undefined
    ? newProps.width
    : (existingObj as any).targetWidth !== undefined
      ? (existingObj as any).targetWidth * currentScaleX
      : (existingObj.width || 1) * currentScaleX;

  const height = newProps.height !== undefined
    ? newProps.height
    : (existingObj as any).targetHeight !== undefined
      ? (existingObj as any).targetHeight * currentScaleY
      : (existingObj.height || 1) * currentScaleY;

  const seed = (existingObj as any).seed || Math.floor(Math.random() * 2147483647);

  let shapeType = (existingObj as any).shapeType || 'rectangle';
  if (newProps.edges && (shapeType === 'rectangle' || shapeType === 'rounded-rect')) {
    shapeType = newProps.edges === 'rounded' ? 'rounded-rect' : 'rectangle';
  }

  // --- LINE & ARROW DELEGATION ---
  if (shapeType === 'line' || shapeType === 'arrow') {
    return buildLineArrowFabricGeometry(existingObj as fabric.Group, newProps);
  }

  // Always regenerate vertices for dynamic relative shapes (star, polygon, diamond) to match new width and height
  let points = newProps.points;
  if (shapeType === 'star') {
    points = createStarPointsRelative(width, height);
  } else if (shapeType === 'polygon') {
    points = createPolygonPointsRelative(width, height);
  } else if (shapeType === 'diamond') {
    points = createDiamondPointsRelative(width, height);
  } else if (!points) {
    points = (existingObj as any).points;
  }

  let x1 = newProps.x1;
  let y1 = newProps.y1;
  let x2 = newProps.x2;
  let y2 = newProps.y2;

  const currentProps: RoughShapeConfig = {
    shapeType,
    left: newProps.left !== undefined ? newProps.left : existingObj.left || 0,
    top: newProps.top !== undefined ? newProps.top : existingObj.top || 0,
    width,
    height,
    angle: newProps.angle !== undefined ? newProps.angle : existingObj.angle || 0,
    stroke: typeof existingObj.stroke === 'string' ? existingObj.stroke : (existingObj as any).stroke || '#1E293B',
    fill: typeof existingObj.fill === 'string' ? existingObj.fill : (existingObj as any).fill || '#6366F1',
    strokeWidth: existingObj.strokeWidth ?? (existingObj as any).strokeWidth ?? 2,
    opacity: existingObj.opacity ?? 1,
    drawingStyle: (existingObj as any).drawingStyle || 'precise',
    roughness: (existingObj as any).roughness ?? 0,
    bowing: (existingObj as any).bowing ?? 0,
    fillStyle: (existingObj as any).fillStyle || 'solid',
    hachureGap: (existingObj as any).hachureGap ?? 5,
    strokeStyle: (existingObj as any).strokeStyle || 'solid',
    edges: (existingObj as any).edges || 'rounded',
    seed,
    layerId: (existingObj as any).layerId || 'layer-default',
    points,
    rx: (existingObj as any).rx,
    ry: (existingObj as any).ry,
    x1,
    y1,
    x2,
    y2,
    ...newProps,
  };

  const id = (existingObj as any).id;
  const isActive = fabricCanvas.getActiveObject() === existingObj;

  const newGroup = createRoughShape(currentProps);
  (newGroup as any).id = id;

  // Preserve graph and custom properties across re-generation
  if ((existingObj as any).isConnector !== undefined) (newGroup as any).isConnector = (existingObj as any).isConnector;
  if ((existingObj as any).sourceNodeId !== undefined) (newGroup as any).sourceNodeId = (existingObj as any).sourceNodeId;
  if ((existingObj as any).targetNodeId !== undefined) (newGroup as any).targetNodeId = (existingObj as any).targetNodeId;
  if ((existingObj as any).direction !== undefined) (newGroup as any).direction = (existingObj as any).direction;
  if ((existingObj as any).sourceAnchor !== undefined) (newGroup as any).sourceAnchor = (existingObj as any).sourceAnchor;
  if ((existingObj as any).targetAnchor !== undefined) (newGroup as any).targetAnchor = (existingObj as any).targetAnchor;
  if ((existingObj as any).graphParents !== undefined) (newGroup as any).graphParents = (existingObj as any).graphParents;
  if ((existingObj as any).graphChildren !== undefined) (newGroup as any).graphChildren = (existingObj as any).graphChildren;
  if ((existingObj as any).colorSource !== undefined) (newGroup as any).colorSource = (existingObj as any).colorSource;
  if ((existingObj as any).graphArrows !== undefined) (newGroup as any).graphArrows = (existingObj as any).graphArrows;
  if ((existingObj as any).graphNeighbors !== undefined) (newGroup as any).graphNeighbors = (existingObj as any).graphNeighbors;
  if ((existingObj as any)._clipPathSvg !== undefined) (newGroup as any)._clipPathSvg = (existingObj as any)._clipPathSvg;

  // Apply any explicit custom props passed in newProps
  if (newProps.isConnector !== undefined) (newGroup as any).isConnector = newProps.isConnector;
  if (newProps.sourceNodeId !== undefined) (newGroup as any).sourceNodeId = newProps.sourceNodeId;
  if (newProps.targetNodeId !== undefined) (newGroup as any).targetNodeId = newProps.targetNodeId;
  if (newProps.direction !== undefined) (newGroup as any).direction = newProps.direction;
  if (newProps.sourceAnchor !== undefined) (newGroup as any).sourceAnchor = newProps.sourceAnchor;
  if (newProps.targetAnchor !== undefined) (newGroup as any).targetAnchor = newProps.targetAnchor;

  const index = fabricCanvas.getObjects().indexOf(existingObj);
  fabricCanvas.remove(existingObj);

  if (index >= 0) {
    fabricCanvas.insertAt(index, newGroup);
  } else {
    fabricCanvas.add(newGroup);
  }

  if (isActive) {
    fabricCanvas.setActiveObject(newGroup);
  }

  (fabricCanvas as any)._currentTransform = null;
  finalizeShapeRendering(newGroup, fabricCanvas);

  return newGroup;
}

/**
 * Updates a Rough.js Fabric.Group in-place without removing it from the canvas.
 * This is crucial for high-performance updates during dragging (like live connectors)
 * to avoid z-index flickering and layout thrashing.
 */
export function updateRoughObjectInPlace(
  existingObj: fabric.Object,
  newProps: Partial<RoughShapeConfig>
): fabric.Object {
  if (!(existingObj instanceof fabric.Group)) return existingObj;

  const currentScaleX = Math.abs(existingObj.scaleX || 1);
  const currentScaleY = Math.abs(existingObj.scaleY || 1);

  const width = newProps.width !== undefined
    ? newProps.width
    : (existingObj as any).targetWidth !== undefined
      ? (existingObj as any).targetWidth * currentScaleX
      : (existingObj.width || 1) * currentScaleX;

  const height = newProps.height !== undefined
    ? newProps.height
    : (existingObj as any).targetHeight !== undefined
      ? (existingObj as any).targetHeight * currentScaleY
      : (existingObj.height || 1) * currentScaleY;

  const seed = (existingObj as any).seed || Math.floor(Math.random() * 2147483647);
  let shapeType = (existingObj as any).shapeType || 'rectangle';

  // --- LINE & ARROW DELEGATION ---
  if (shapeType === 'line' || shapeType === 'arrow') {
    return buildLineArrowFabricGeometry(existingObj as fabric.Group, newProps);
  }

  let x1 = newProps.x1 ?? (existingObj as any).x1;
  let y1 = newProps.y1 ?? (existingObj as any).y1;
  let x2 = newProps.x2 ?? (existingObj as any).x2;
  let y2 = newProps.y2 ?? (existingObj as any).y2;
  let points = newProps.points || (existingObj as any).points;

  const currentProps: RoughShapeConfig = {
    shapeType,
    left: newProps.left !== undefined ? newProps.left : existingObj.left || 0,
    top: newProps.top !== undefined ? newProps.top : existingObj.top || 0,
    width,
    height,
    angle: newProps.angle !== undefined ? newProps.angle : existingObj.angle || 0,
    stroke: typeof existingObj.stroke === 'string' ? existingObj.stroke : (existingObj as any).stroke || '#1E293B',
    fill: typeof existingObj.fill === 'string' ? existingObj.fill : (existingObj as any).fill || '#6366F1',
    strokeWidth: existingObj.strokeWidth ?? (existingObj as any).strokeWidth ?? 2,
    opacity: existingObj.opacity ?? 1,
    drawingStyle: (existingObj as any).drawingStyle || 'precise',
    roughness: (existingObj as any).roughness ?? 0,
    bowing: (existingObj as any).bowing ?? 0,
    fillStyle: (existingObj as any).fillStyle || 'solid',
    hachureGap: (existingObj as any).hachureGap ?? 5,
    strokeStyle: (existingObj as any).strokeStyle || 'solid',
    edges: (existingObj as any).edges || 'rounded',
    seed,
    layerId: (existingObj as any).layerId || 'layer-default',
    points,
    rx: (existingObj as any).rx,
    ry: (existingObj as any).ry,
    x1,
    y1,
    x2,
    y2,
    ...newProps,
  };

  // Generate the new shapes for the group
  const newGroup = createRoughShape(currentProps);

  // Replace existing paths with new paths
  const oldObjects = [...existingObj.getObjects()];
  if (typeof (existingObj as any).removeAll === 'function') {
    (existingObj as any).removeAll();
  } else {
    existingObj.remove(...oldObjects);
  }
  
  const newObjects = [...newGroup.getObjects()];
  const isCachingDisabled = existingObj.objectCaching === false;
  newObjects.forEach(obj => {
    obj.group = existingObj;
    if (isCachingDisabled) {
      obj.set('objectCaching', false);
    }
  });
  (existingObj as any)._objects = newObjects;
  existingObj.dirty = true;

  // Update outer group boundaries using the actual computed bounds from the new group
  existingObj.set({
    left: newGroup.left,
    top: newGroup.top,
    width: newGroup.width,
    height: newGroup.height,
    scaleX: 1,
    scaleY: 1,
  });

  (existingObj as any).targetWidth = currentProps.width;
  (existingObj as any).targetHeight = currentProps.height;

  // Update custom properties that might have changed
  if (newProps.x1 !== undefined) (existingObj as any).x1 = newProps.x1;
  if (newProps.y1 !== undefined) (existingObj as any).y1 = newProps.y1;
  if (newProps.x2 !== undefined) (existingObj as any).x2 = newProps.x2;
  if (newProps.y2 !== undefined) (existingObj as any).y2 = newProps.y2;
  if (currentProps.points !== undefined) (existingObj as any).points = currentProps.points;
  
  if (newProps.sourceAnchor !== undefined) (existingObj as any).sourceAnchor = newProps.sourceAnchor;
  if (newProps.targetAnchor !== undefined) (existingObj as any).targetAnchor = newProps.targetAnchor;
  if (newProps.direction !== undefined) (existingObj as any).direction = newProps.direction;

  if (existingObj.canvas) {
    finalizeShapeRendering(existingObj, existingObj.canvas as fabric.Canvas);
  } else {
    existingObj.setCoords();
    existingObj.dirty = true;
  }
  return existingObj;
}

/**
 * Ensures a shape is fully initialized and its rendering cache is properly built
 * for its final position, scale, and the canvas's retina scaling.
 * This fixes the issue where newly inserted shapes appear blurry until modified.
 */
export function finalizeShapeRendering(shape: fabric.Object, canvas: fabric.Canvas) {
  shape.setCoords();
  shape.dirty = true;
  
  const isLineOrArrow = (shape as any).shapeType === 'line' || (shape as any).shapeType === 'arrow';
  if (isLineOrArrow) {
    shape.set('objectCaching', false);
  }

  if ((shape as any)._cacheCanvas) {
    (shape as any)._cacheCanvas = null;
  }
  if (typeof (shape as any)._removeCacheCanvas === 'function') {
    (shape as any)._removeCacheCanvas();
  }
  
  if (shape instanceof fabric.Group) {
    shape.getObjects().forEach(child => {
      child.dirty = true;
      if (isLineOrArrow) {
        child.set('objectCaching', false);
      }
    });
  }

  canvas.requestRenderAll();
}

