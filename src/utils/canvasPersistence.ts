import { ERASER_CUSTOM_PROPS } from '../hooks/useEraserEngine';

export const CANVAS_CUSTOM_PROPS = [
  'id',
  'layerId',
  'colorSource',
  'isPdf',
  'currentPage',
  'numPages',
  'isPdfLocked',
  'isGroup',
  'name',
  'isRoughObject',
  'isMarker',
  'shapeType',
  'drawingStyle',
  'roughness',
  'bowing',
  'fillStyle',
  'hachureGap',
  'strokeStyle',
  'edges',
  'pdfFileSize',
  'pdfBase64',
  'selectable',
  'points',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
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
  '_clipPathSvg',
  ...ERASER_CUSTOM_PROPS
];

/**
 * Reviver function for Fabric.js loadFromJSON.
 * Fabric 7 ignores properties from JSON that are not explicitly defined in the class state properties.
 * This reviver explicitly restores our semantic and state properties onto the reconstructed fabric.Object.
 */
export const canvasReviver = (o: any, obj: any) => {
  // Normalize legacy shapes that might not have shapeType but are rough objects
  if (o.isRoughObject && !o.shapeType) {
    if (o.points && o.points.length > 2) {
      o.shapeType = 'freehand'; // Just a fallback guess
    } else {
      o.shapeType = 'rectangle'; 
    }
  }

  // Iterate over our defined allowlist and apply available properties
  CANVAS_CUSTOM_PROPS.forEach(prop => {
    if (o[prop] !== undefined) {
      obj[prop] = o[prop];
    }
  });

  if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
    obj.editingEvent = 'dblclick';
  }
};

/**
 * Serializes the fabric canvas to JSON, guaranteeing that all custom properties are explicitly preserved
 * even on nested objects (like children of a Group). Fabric 7's toJSON often drops properties not defined
 * in the class schema.
 */
export const serializeCanvas = (fc: any): any => {
  if (!fc) return null;
  const json = fc.toJSON(CANVAS_CUSTOM_PROPS);
  
  const applyCustomProps = (jsonObjs: any[], fabricObjs: any[]) => {
    if (jsonObjs && fabricObjs && jsonObjs.length === fabricObjs.length) {
      jsonObjs.forEach((o: any, i: number) => {
        const obj = fabricObjs[i];
        if (obj) {
          CANVAS_CUSTOM_PROPS.forEach(prop => {
            if (obj[prop] !== undefined) {
              o[prop] = obj[prop];
            }
          });
          if ((o.type === 'group' || o.isGroup) && o.objects && obj._objects) {
            applyCustomProps(o.objects, obj._objects);
          }
        }
      });
    }
  };

  applyCustomProps(json.objects || [], fc.getObjects());
  return json;
};
