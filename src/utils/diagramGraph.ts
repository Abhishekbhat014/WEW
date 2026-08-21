import * as fabric from 'fabric';
import type { DiagramDirection, AnchorSide, GraphNeighbor } from '../types/canvas';
import { createRoughShape, updateRoughObject, updateRoughObjectInPlace } from './roughRenderer';
import {
  createStarPointsRelative,
  createPolygonPointsRelative,
  createDiamondPointsRelative,
} from './geometry';

export interface SubtreeGraphResult {
  descendantIds: Set<string>;
  affectedConnectorIds: Set<string>;
  objectMap: Map<string, fabric.Object>;
}

/**
 * Returns the inverse of a given diagram direction.
 */
export function getOppositeDirection(dir: DiagramDirection): DiagramDirection {
  switch (dir) {
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 * Check if a Fabric object is a diagram node (shape/text), excluding connectors, lines, lasers, PDFs.
 */
export function isGraphNode(obj: fabric.Object | null | undefined): boolean {
  if (!obj) return false;
  const anyObj = obj as any;

  if (anyObj.isConnector || anyObj.shapeType === 'arrow' || anyObj.shapeType === 'line' || anyObj.type === 'line') {
    return false;
  }
  if (anyObj.isPdf || anyObj.isLaser || anyObj.isEraserMask) {
    return false;
  }

  const shapeType = anyObj.shapeType || anyObj.type;
  const validShapes = [
    'rectangle',
    'rounded-rect',
    'circle',
    'ellipse',
    'triangle',
    'polygon',
    'star',
    'diamond',
    'rect',
    'group',
    'i-text',
    'text',
    'textbox',
  ];

  return anyObj.isRoughObject || validShapes.includes(shapeType);
}

/**
 * Check if a Fabric object is a smart diagram connector arrow.
 */
export function isGraphConnector(obj: fabric.Object | null | undefined): boolean {
  if (!obj) return false;
  const anyObj = obj as any;
  return !!anyObj.isConnector || (anyObj.shapeType === 'arrow' && (!!anyObj.sourceNodeId || !!anyObj.targetNodeId));
}

/**
 * Calculates a precise anchor point on the boundary of a node.
 */
export function getNodeAnchorPoint(
  node: fabric.Object,
  anchorSide: AnchorSide = 'auto',
  targetNode?: fabric.Object | null
): { x: number; y: number } {
  // Use absolute coordinates by calculating transform matrix
  const matrix = node.calcTransformMatrix();
  const options = fabric.util.qrDecompose(matrix);
  
  const nLeft = options.translateX - (node.width! * options.scaleX) / 2;
  const nTop = options.translateY - (node.height! * options.scaleY) / 2;
  const nWidth = node.width! * options.scaleX;
  const nHeight = node.height! * options.scaleY;

  const nodeCenter = {
    x: nLeft + nWidth / 2,
    y: nTop + nHeight / 2,
  };

  let resolvedSide: 'top' | 'bottom' | 'left' | 'right' = 'right';

  if (anchorSide === 'top' || anchorSide === 'bottom' || anchorSide === 'left' || anchorSide === 'right') {
    resolvedSide = anchorSide;
  } else if (targetNode) {
    const tMatrix = targetNode.calcTransformMatrix();
    const tOptions = fabric.util.qrDecompose(tMatrix);
    const tLeft = tOptions.translateX - (targetNode.width! * tOptions.scaleX) / 2;
    const tTop = tOptions.translateY - (targetNode.height! * tOptions.scaleY) / 2;
    const tWidth = (targetNode.width || 100) * (targetNode.scaleX || 1);
    const tHeight = (targetNode.height || 100) * (targetNode.scaleY || 1);
    const targetCenter = {
      x: tLeft + tWidth / 2,
      y: tTop + tHeight / 2,
    };

    const dx = targetCenter.x - nodeCenter.x;
    const dy = targetCenter.y - nodeCenter.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      resolvedSide = dx >= 0 ? 'right' : 'left';
    } else {
      resolvedSide = dy >= 0 ? 'bottom' : 'top';
    }
  }

  switch (resolvedSide) {
    case 'left':
      return { x: nLeft, y: nodeCenter.y };
    case 'right':
      return { x: nLeft + nWidth, y: nodeCenter.y };
    case 'top':
      return { x: nodeCenter.x, y: nTop };
    case 'bottom':
      return { x: nodeCenter.x, y: nTop + nHeight };
    default:
      return nodeCenter;
  }
}


/**
 * Recalculates and updates the geometry of a smart connector arrow connecting sourceNode to targetNode.
 */
export function updateConnectorGeometry(
  canvas: fabric.Canvas,
  connector: fabric.Object,
  sourceNode: fabric.Object,
  targetNode: fabric.Object,
  inPlace: boolean = false
): fabric.Object | null {
  if (!connector || !sourceNode || !targetNode) return null;

  const anyConn = connector as any;
  const direction: DiagramDirection | undefined = anyConn.direction;
  let sourceSide: AnchorSide = anyConn.sourceAnchor || 'auto';
  let targetSide: AnchorSide = anyConn.targetAnchor || 'auto';

  if (sourceSide === 'auto' || !sourceSide) {
    if (direction === 'right') {
      sourceSide = 'right';
      targetSide = 'left';
    } else if (direction === 'left') {
      sourceSide = 'left';
      targetSide = 'right';
    } else if (direction === 'down') {
      sourceSide = 'bottom';
      targetSide = 'top';
    } else if (direction === 'up') {
      sourceSide = 'top';
      targetSide = 'bottom';
    } else {
      sourceSide = 'auto';
      targetSide = 'auto';
    }
  }

  const p1 = getNodeAnchorPoint(sourceNode, sourceSide, targetNode);
  const p2 = getNodeAnchorPoint(targetNode, targetSide, sourceNode);

  const existingPoints: { x: number; y: number }[] | undefined = (connector as any).points;

  let left: number;
  let top: number;
  let width: number;
  let height: number;
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  let newPoints: { x: number; y: number }[];

  if (existingPoints && existingPoints.length > 2) {
    const oldLeft = connector.left || 0;
    const oldTop = connector.top || 0;
    const oldWorldPoints = existingPoints.map((pt) => ({
      x: oldLeft + pt.x,
      y: oldTop + pt.y,
    }));

    const oldP1 = oldWorldPoints[0];
    const oldP2 = oldWorldPoints[oldWorldPoints.length - 1];

    const delta1 = { x: p1.x - oldP1.x, y: p1.y - oldP1.y };
    const delta2 = { x: p2.x - oldP2.x, y: p2.y - oldP2.y };
    const n = oldWorldPoints.length - 1;

    const newWorldPoints = oldWorldPoints.map((pt, idx) => {
      if (idx === 0) return { x: p1.x, y: p1.y };
      if (idx === n) return { x: p2.x, y: p2.y };
      const factor = idx / n;
      return {
        x: pt.x + delta1.x * (1 - factor) + delta2.x * factor,
        y: pt.y + delta1.y * (1 - factor) + delta2.y * factor,
      };
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    newWorldPoints.forEach((pt) => {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    });

    left = minX;
    top = minY;
    width = Math.max(2, maxX - minX);
    height = Math.max(2, maxY - minY);

    newPoints = newWorldPoints.map((pt) => ({
      x: pt.x - minX,
      y: pt.y - minY,
    }));

    x1 = newPoints[0].x;
    y1 = newPoints[0].y;
    x2 = newPoints[newPoints.length - 1].x;
    y2 = newPoints[newPoints.length - 1].y;
  } else {
    left = Math.min(p1.x, p2.x);
    top = Math.min(p1.y, p2.y);
    width = Math.max(2, Math.abs(p2.x - p1.x));
    height = Math.max(2, Math.abs(p2.y - p1.y));

    x1 = p1.x <= p2.x ? 0 : width;
    y1 = p1.y <= p2.y ? 0 : height;
    x2 = p1.x <= p2.x ? width : 0;
    y2 = p1.y <= p2.y ? height : 0;
    newPoints = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  }

  const props = {
    left,
    top,
    width,
    height,
    x1,
    y1,
    x2,
    y2,
    points: newPoints,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    isConnector: true,
    sourceNodeId: (sourceNode as any).id,
    targetNodeId: (targetNode as any).id,
    direction,
    sourceAnchor: sourceSide,
    targetAnchor: targetSide,
  };

  if (inPlace) {
    return updateRoughObjectInPlace(connector, props);
  } else {
    return updateRoughObject(canvas, connector, props);
  }
}

/**
 * Builds an index of all objects by ID and extracts graph relationships.
 */
export function buildGraphObjectMap(canvas: fabric.Canvas): Map<string, fabric.Object> {
  const map = new Map<string, fabric.Object>();
  canvas.getObjects().forEach((obj) => {
    const id = (obj as any).id;
    if (id) {
      map.set(id, obj);
    }
  });
  return map;
}

/**
 * Performs recursive DFS/BFS traversal with cycle detection (visited set)
 * to retrieve all descendant node IDs and all affected connector IDs.
 */
export function getSubtreeData(rootId: string, canvas: fabric.Canvas): SubtreeGraphResult {
  const objectMap = buildGraphObjectMap(canvas);
  const descendantIds = new Set<string>();
  const affectedConnectorIds = new Set<string>();

  if (!rootId || !objectMap.has(rootId)) {
    return { descendantIds, affectedConnectorIds, objectMap };
  }

  // Find all connector objects on canvas
  const allConnectors: Array<{ obj: fabric.Object; id: string; sourceId: string; targetId: string }> = [];
  canvas.getObjects().forEach((obj) => {
    const anyObj = obj as any;
    if (isGraphConnector(obj) && anyObj.id) {
      allConnectors.push({
        obj,
        id: anyObj.id,
        sourceId: anyObj.sourceNodeId,
        targetId: anyObj.targetNodeId,
      });
    }
  });

  // Directed adjacency list: from parentId -> array of childIds
  const parentToChildren = new Map<string, Set<string>>();
  allConnectors.forEach(({ sourceId, targetId }) => {
    if (sourceId && targetId) {
      if (!parentToChildren.has(sourceId)) {
        parentToChildren.set(sourceId, new Set<string>());
      }
      parentToChildren.get(sourceId)!.add(targetId);
    }
  });

  // Also read node graphChildren property as single source of truth
  objectMap.forEach((obj, id) => {
    const anyObj = obj as any;
    if (Array.isArray(anyObj.graphChildren)) {
      if (!parentToChildren.has(id)) {
        parentToChildren.set(id, new Set<string>());
      }
      anyObj.graphChildren.forEach((childId: string) => {
        if (childId) parentToChildren.get(id)!.add(childId);
      });
    }
  });

  // BFS traversal with cycle protection
  const queue: string[] = [rootId];
  const visited = new Set<string>([rootId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = parentToChildren.get(currentId);
    if (children) {
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          visited.add(childId);
          if (objectMap.has(childId)) {
            descendantIds.add(childId);
            queue.push(childId);
          }
        }
      });
    }
  }

  // All nodes that move when rootId moves: rootId + all its descendants
  const movingNodeIds = new Set<string>([rootId, ...descendantIds]);

  // An affected connector is any connector whose source OR target is in movingNodeIds
  allConnectors.forEach(({ id, sourceId, targetId }) => {
    if (movingNodeIds.has(sourceId) || movingNodeIds.has(targetId)) {
      affectedConnectorIds.add(id);
    }
  });

  return { descendantIds, affectedConnectorIds, objectMap };
}

/**
 * Searches for an existing connected neighbor in the requested direction.
 */
export function findConnectedNeighbor(
  selectedObj: fabric.Object,
  direction: DiagramDirection,
  objectMap: Map<string, fabric.Object>,
  canvas: fabric.Canvas
): fabric.Object | null {
  const anyObj = selectedObj as any;
  const currentId = anyObj.id;
  if (!currentId) return null;

  // 1. Check graphNeighbors metadata stored on the node
  if (Array.isArray(anyObj.graphNeighbors)) {
    const match = anyObj.graphNeighbors.find(
      (n: GraphNeighbor) => n.direction === direction && objectMap.has(n.targetNodeId)
    );
    if (match) {
      return objectMap.get(match.targetNodeId) || null;
    }
  }

  // 2. Scan connectors on canvas
  const opposite = getOppositeDirection(direction);
  for (const obj of canvas.getObjects()) {
    const anyConn = obj as any;
    if (isGraphConnector(obj)) {
      // Outgoing arrow in the given direction
      if (anyConn.sourceNodeId === currentId && anyConn.direction === direction) {
        if (anyConn.targetNodeId && objectMap.has(anyConn.targetNodeId)) {
          return objectMap.get(anyConn.targetNodeId) || null;
        }
      }
      // Incoming arrow from opposite direction (so moving in requested direction navigates to parent)
      if (anyConn.targetNodeId === currentId && anyConn.direction === opposite) {
        if (anyConn.sourceNodeId && objectMap.has(anyConn.sourceNodeId)) {
          return objectMap.get(anyConn.sourceNodeId) || null;
        }
      }
    }
  }

  return null;
}

/**
 * Handles keyboard-first diagram creation & navigation using Alt + Arrow Keys.
 * Returns true if navigation or node creation succeeded.
 */
export function handleKeyboardGraphGrowth(
  canvas: fabric.Canvas,
  direction: DiagramDirection,
  options: {
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    activeLayerId: string;
    gap?: number;
  },
  saveHistory: () => void
): boolean {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length !== 1) return false;

  const selectedObj = activeObjects[0];
  if (!isGraphNode(selectedObj)) return false;

  const anySelected = selectedObj as any;
  if (!anySelected.id) {
    anySelected.id = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  const objectMap = buildGraphObjectMap(canvas);

  // Step 1: Check if a connected neighbor already exists in that direction
  const existingNeighbor = findConnectedNeighbor(selectedObj, direction, objectMap, canvas);
  if (existingNeighbor) {
    // Navigate to existing neighbor
    canvas.setActiveObject(existingNeighbor);
    existingNeighbor.setCoords();
    canvas.requestRenderAll();
    return true;
  }

  // Use canvas-space coordinates directly (not getBoundingRect which returns screen-space)
  const objLeft = selectedObj.left || 0;
  const objTop = selectedObj.top || 0;
  const objWidth = Math.max(10, (selectedObj.width || 100) * (selectedObj.scaleX || 1));
  const objHeight = Math.max(10, (selectedObj.height || 100) * (selectedObj.scaleY || 1));

  const gap = options.gap ?? 60;
  let newLeft = objLeft;
  let newTop = objTop;

  if (direction === 'right') {
    newLeft = objLeft + objWidth + gap;
    newTop = objTop;
  } else if (direction === 'left') {
    newLeft = objLeft - objWidth - gap;
    newTop = objTop;
  } else if (direction === 'down') {
    newLeft = objLeft;
    newTop = objTop + objHeight + gap;
  } else if (direction === 'up') {
    newLeft = objLeft;
    newTop = objTop - objHeight - gap;
  }

  const newNodeId = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const arrowId = `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const oppositeDir = getOppositeDirection(direction);

  const stroke = typeof anySelected.stroke === 'string' ? anySelected.stroke : options.strokeColor || '#1E293B';
  const fill = typeof anySelected.fill === 'string' ? anySelected.fill : options.fillColor || '#6366F1';
  const strokeWidth = anySelected.strokeWidth || options.strokeWidth || 2;
  const opacity = anySelected.opacity ?? 1;
  const drawingStyle = anySelected.drawingStyle || 'precise';
  const roughness = anySelected.roughness ?? 0;
  const bowing = anySelected.bowing ?? 0;
  const fillStyle = anySelected.fillStyle || 'solid';
  const hachureGap = anySelected.hachureGap ?? 5;
  const strokeStyle = anySelected.strokeStyle || 'solid';
  const edges = anySelected.edges || 'rounded';
  const layerId = anySelected.layerId || options.activeLayerId;

  let targetShapeType = anySelected.shapeType || anySelected.type || 'rectangle';
  if (targetShapeType === 'rect') targetShapeType = 'rectangle';

  let newShape: fabric.Object;

  if (targetShapeType === 'i-text' || targetShapeType === 'text' || targetShapeType === 'textbox') {
    newShape = new fabric.IText(anySelected.text || 'Node', {
      left: newLeft,
      top: newTop,
      fill: stroke,
      fontSize: anySelected.fontSize || 24,
      fontFamily: anySelected.fontFamily || 'Caveat, cursive',
      fontWeight: anySelected.fontWeight || 'normal',
      fontStyle: anySelected.fontStyle || 'normal',
      textAlign: anySelected.textAlign || 'left',
      opacity,
      layerId,
      shapeType: 'text',
    } as any);
  } else {
    let newPoints = anySelected.points;
    if (targetShapeType === 'star') {
      newPoints = createStarPointsRelative(objWidth, objHeight);
    } else if (targetShapeType === 'polygon') {
      newPoints = createPolygonPointsRelative(objWidth, objHeight);
    } else if (targetShapeType === 'diamond') {
      newPoints = createDiamondPointsRelative(objWidth, objHeight);
    }

    newShape = createRoughShape({
      shapeType: targetShapeType,
      layerId,
      left: newLeft,
      top: newTop,
      width: objWidth,
      height: objHeight,
      stroke,
      fill,
      strokeWidth,
      opacity,
      drawingStyle,
      roughness,
      bowing,
      fillStyle,
      hachureGap,
      strokeStyle,
      edges,
      points: newPoints,
      rx: anySelected.rx !== undefined ? anySelected.rx : 3,
      ry: anySelected.ry !== undefined ? anySelected.ry : 3,
    });
  }

  (newShape as any).id = newNodeId;
  (newShape as any).layerId = layerId;
  (newShape as any).graphParents = [anySelected.id];
  (newShape as any).graphChildren = [];
  (newShape as any).graphArrows = [arrowId];
  (newShape as any).graphNeighbors = [
    {
      direction: oppositeDir,
      targetNodeId: anySelected.id,
      arrowId,
      isChild: false,
    },
  ];

  // Update selected original node's graph properties
  anySelected.graphChildren = [...(anySelected.graphChildren || []).filter((id: string) => id !== newNodeId), newNodeId];
  anySelected.graphArrows = [...(anySelected.graphArrows || []).filter((id: string) => id !== arrowId), arrowId];
  const updatedNeighbors: GraphNeighbor[] = [
    ...(anySelected.graphNeighbors || []).filter((n: GraphNeighbor) => n.direction !== direction),
    {
      direction,
      targetNodeId: newNodeId,
      arrowId,
      isChild: true,
    },
  ];
  anySelected.graphNeighbors = updatedNeighbors;

  // Create connector arrow
  const sourceSide: AnchorSide = direction === 'right' ? 'right' : direction === 'left' ? 'left' : direction === 'down' ? 'bottom' : 'top';
  const targetSide: AnchorSide = direction === 'right' ? 'left' : direction === 'left' ? 'right' : direction === 'down' ? 'top' : 'bottom';

  const p1 = getNodeAnchorPoint(selectedObj, sourceSide, newShape);
  const p2 = getNodeAnchorPoint(newShape, targetSide, selectedObj);

  const arrowLeft = Math.min(p1.x, p2.x);
  const arrowTop = Math.min(p1.y, p2.y);
  const arrowW = Math.max(2, Math.abs(p2.x - p1.x));
  const arrowH = Math.max(2, Math.abs(p2.y - p1.y));

  const relX1 = p1.x <= p2.x ? 0 : arrowW;
  const relY1 = p1.y <= p2.y ? 0 : arrowH;
  const relX2 = p1.x <= p2.x ? arrowW : 0;
  const relY2 = p1.y <= p2.y ? arrowH : 0;

  const arrowShape = createRoughShape({
    shapeType: 'arrow',
    layerId,
    left: arrowLeft,
    top: arrowTop,
    width: arrowW,
    height: arrowH,
    x1: relX1,
    y1: relY1,
    x2: relX2,
    y2: relY2,
    stroke,
    fill: stroke,
    strokeWidth,
    opacity,
    drawingStyle,
    roughness,
    bowing,
    fillStyle: 'solid',
    hachureGap: 5,
    strokeStyle,
    edges,
  });

  const anyArrow = arrowShape as any;
  anyArrow.id = arrowId;
  anyArrow.isConnector = true;
  anyArrow.sourceNodeId = anySelected.id;
  anyArrow.targetNodeId = newNodeId;
  anyArrow.direction = direction;
  anyArrow.sourceAnchor = sourceSide;
  anyArrow.targetAnchor = targetSide;

  canvas.add(arrowShape);
  canvas.add(newShape);
  canvas.setActiveObject(newShape);
  newShape.setCoords();
  canvas.requestRenderAll();
  saveHistory();

  return true;
}

/**
 * Cleans up graph relationships and identifies connected arrows to delete when nodes/connectors are removed.
 */
export function cleanupGraphOnDelete(canvas: fabric.Canvas, deletedObjects: fabric.Object[]): fabric.Object[] {
  const deletedNodeIds = new Set<string>();
  const deletedArrowIds = new Set<string>();

  deletedObjects.forEach((obj) => {
    const id = (obj as any).id;
    if (!id) return;
    if (isGraphConnector(obj)) {
      deletedArrowIds.add(id);
    } else if (isGraphNode(obj)) {
      deletedNodeIds.add(id);
    }
  });

  const extraConnectorsToRemove: fabric.Object[] = [];

  // Remove any connectors connected to deleted nodes
  canvas.getObjects().forEach((obj) => {
    if (isGraphConnector(obj) && !deletedObjects.includes(obj)) {
      const anyConn = obj as any;
      if (deletedNodeIds.has(anyConn.sourceNodeId) || deletedNodeIds.has(anyConn.targetNodeId)) {
        extraConnectorsToRemove.push(obj);
        if (anyConn.id) deletedArrowIds.add(anyConn.id);
      }
    }
  });

  // Clean up references in remaining nodes
  canvas.getObjects().forEach((obj) => {
    if (isGraphNode(obj) && !deletedObjects.includes(obj)) {
      const anyObj = obj as any;
      if (Array.isArray(anyObj.graphParents)) {
        anyObj.graphParents = anyObj.graphParents.filter((id: string) => !deletedNodeIds.has(id));
      }
      if (Array.isArray(anyObj.graphChildren)) {
        anyObj.graphChildren = anyObj.graphChildren.filter((id: string) => !deletedNodeIds.has(id));
      }
      if (Array.isArray(anyObj.graphArrows)) {
        anyObj.graphArrows = anyObj.graphArrows.filter((id: string) => !deletedArrowIds.has(id));
      }
      if (Array.isArray(anyObj.graphNeighbors)) {
        anyObj.graphNeighbors = anyObj.graphNeighbors.filter(
          (n: GraphNeighbor) => !deletedNodeIds.has(n.targetNodeId) && !deletedArrowIds.has(n.arrowId)
        );
      }
    }
  });

  return extraConnectorsToRemove;
}

/**
 * Attempts to automatically attach a freshly drawn arrow as a smart connector if its start and end points
 * are on/near two different graph nodes.
 */
export function tryAutoConnectArrow(
  canvas: fabric.Canvas,
  arrowObj: fabric.Object,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
): boolean {
  if (!arrowObj || (arrowObj as any).shapeType !== 'arrow') return false;

  const SNAP_THRESHOLD = 36;
  let sourceNode: fabric.Object | null = null;
  let targetNode: fabric.Object | null = null;
  let minSourceDist = SNAP_THRESHOLD;
  let minTargetDist = SNAP_THRESHOLD;

  const graphNodes = canvas.getObjects().filter((obj) => obj !== arrowObj && isGraphNode(obj));

  for (const node of graphNodes) {
    const nLeft = node.left || 0;
    const nTop = node.top || 0;
    const nWidth = (node.width || 100) * (node.scaleX || 1);
    const nHeight = (node.height || 100) * (node.scaleY || 1);

    const containsStart =
      startPoint.x >= nLeft - 10 &&
      startPoint.x <= nLeft + nWidth + 10 &&
      startPoint.y >= nTop - 10 &&
      startPoint.y <= nTop + nHeight + 10;

    const containsEnd =
      endPoint.x >= nLeft - 10 &&
      endPoint.x <= nLeft + nWidth + 10 &&
      endPoint.y >= nTop - 10 &&
      endPoint.y <= nTop + nHeight + 10;

    if (containsStart) {
      sourceNode = node;
    }
    if (containsEnd) {
      targetNode = node;
    }

    // Also check anchor proximity
    const sides: AnchorSide[] = ['top', 'bottom', 'left', 'right'];
    for (const side of sides) {
      const anchor = getNodeAnchorPoint(node, side);
      const dStart = Math.hypot(anchor.x - startPoint.x, anchor.y - startPoint.y);
      const dEnd = Math.hypot(anchor.x - endPoint.x, anchor.y - endPoint.y);

      if (dStart < minSourceDist) {
        minSourceDist = dStart;
        sourceNode = node;
      }
      if (dEnd < minTargetDist) {
        minTargetDist = dEnd;
        targetNode = node;
      }
    }
  }

  if (sourceNode && targetNode && sourceNode !== targetNode) {
    const anySource = sourceNode as any;
    const anyTarget = targetNode as any;
    const anyArrow = arrowObj as any;

    if (!anySource.id) anySource.id = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (!anyTarget.id) anyTarget.id = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (!anyArrow.id) anyArrow.id = `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    anyArrow.isConnector = true;
    anyArrow.sourceNodeId = anySource.id;
    anyArrow.targetNodeId = anyTarget.id;
    anyArrow.sourceAnchor = 'auto';
    anyArrow.targetAnchor = 'auto';

    anySource.graphChildren = [...(anySource.graphChildren || []).filter((id: string) => id !== anyTarget.id), anyTarget.id];
    anySource.graphArrows = [...(anySource.graphArrows || []).filter((id: string) => id !== anyArrow.id), anyArrow.id];

    anyTarget.graphParents = [...(anyTarget.graphParents || []).filter((id: string) => id !== anySource.id), anySource.id];
    anyTarget.graphArrows = [...(anyTarget.graphArrows || []).filter((id: string) => id !== anyArrow.id), anyArrow.id];

    updateConnectorGeometry(canvas, arrowObj, sourceNode, targetNode);
    return true;
  }

  return false;
}
