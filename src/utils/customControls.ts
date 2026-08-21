import * as fabric from 'fabric';

const getAccentColor = () => {
  const root = document.documentElement;
  const computed = getComputedStyle(root).getPropertyValue('--selection-border').trim();
  return computed || '#525252';
};

const getAccentShadow = () => {
  const root = document.documentElement;
  const computed = getComputedStyle(root).getPropertyValue('--selection').trim();
  return computed || 'rgba(82, 82, 82, 0.25)';
};

const getCornerFill = () => {
  const root = document.documentElement;
  const computed = getComputedStyle(root).getPropertyValue('--selection-handle').trim();
  return computed || '#FFFFFF';
};

/**
 * Modern circular handle renderer with white fill, accent stroke, and subtle drop shadow.
 */
export function renderCircleControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  _fabricObject: fabric.Object
) {
  const size = 10;
  const radius = size / 2;

  ctx.save();
  ctx.translate(left, top);

  // Drop shadow for crisp contrast in light and dark themes
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
  ctx.fillStyle = getCornerFill();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = getAccentColor();
  ctx.stroke();

  ctx.restore();
}

/**
 * Floating rotation control renderer above top edge with a connector line down to the selection bounding box.
 */
export function renderRotationControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: any,
  _fabricObject: fabric.Object
) {
  const size = 10;
  const radius = size / 2;
  const connectorLength = 26;

  ctx.save();
  ctx.translate(left, top);

  // Connector line down to selection top border (0, connectorLength)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, connectorLength);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = getAccentColor();
  ctx.stroke();

  // Floating circular rotation handle
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
  ctx.fillStyle = getCornerFill();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = getAccentColor();
  ctx.stroke();

  // Inner accent dot inside rotation handle
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2, false);
  ctx.fillStyle = getAccentColor();
  ctx.fill();

  ctx.restore();
}

/**
 * Global setup for fabric object selection visual properties & 8 circular resize handles + rotation handle.
 */
export function setupCustomControls() {
  if (!fabric.Object) return;

  const proto = fabric.Object.prototype as any;

  // We can't use getters directly on proto properties if fabric reads them statically,
  // but we can set them to be updated whenever customBorders draws them.
  // Wait, setupCustomControls is called once. We should expose a function to update these dynamically.
  // Actually, we can define getters on the prototype!
  Object.defineProperty(proto, 'borderColor', { get: getAccentColor, set() {}, configurable: true });
  Object.defineProperty(proto, 'cornerColor', { get: getCornerFill, set() {}, configurable: true });
  Object.defineProperty(proto, 'cornerStrokeColor', { get: getAccentColor, set() {}, configurable: true });

  proto.borderScaleFactor = 1.5;
  proto.borderOpacityWhenMoving = 1;
  proto.cornerStyle = 'circle';
  proto.cornerSize = 10;
  proto.transparentCorners = false;
  proto.padding = 8; // 8px padding keeps border outside sketch bounds
  proto.uniformScaling = false;
  proto.lockUniScaling = false;

  if (fabric.Canvas) {
    (fabric.Canvas.prototype as any).uniformScaling = false;
  }

  const controlsUtils = (fabric as any).controlsUtils;
  if (!controlsUtils) return;

  // Let's create the default object controls!
  const defaultControls = controlsUtils.createObjectDefaultControls();
  
  // Now loop over the keys and replace the render function for our custom visual style
  Object.keys(defaultControls).forEach((key) => {
    const control = defaultControls[key];
    if (key === 'mtr') {
      control.render = renderRotationControl;
      control.offsetY = -30;
    } else {
      control.render = renderCircleControl;
    }
  });

  proto.controls = defaultControls;

  // Also apply to Textbox if it exists (Textbox uses different controls like changeWidth)
  if (fabric.Textbox) {
    const tbControls = controlsUtils.createTextboxDefaultControls();
    Object.keys(tbControls).forEach((key) => {
      const control = tbControls[key];
      if (key === 'mtr') {
        control.render = renderRotationControl;
        control.offsetY = -30;
      } else {
        control.render = renderCircleControl;
      }
    });
    (fabric.Textbox.prototype as any).controls = tbControls;
  }

  // Also apply controls & padding to Group & ActiveSelection
  if (fabric.Group) {
    (fabric.Group.prototype as any).controls = defaultControls;
    (fabric.Group.prototype as any).uniformScaling = false;
    (fabric.Group.prototype as any).lockUniScaling = false;
  }

  if (fabric.ActiveSelection) {
    (fabric.ActiveSelection.prototype as any).controls = defaultControls;
    Object.defineProperty((fabric.ActiveSelection.prototype as any), 'borderColor', { get: getAccentColor, set() {}, configurable: true });
    (fabric.ActiveSelection.prototype as any).borderScaleFactor = 1.5;
    (fabric.ActiveSelection.prototype as any).padding = 8;
    (fabric.ActiveSelection.prototype as any).uniformScaling = false;
    (fabric.ActiveSelection.prototype as any).lockUniScaling = false;
  }
}

/**
 * Custom rounded selection border & elevation shadow override for fabric objects.
 */
export function setupCustomBorders() {
  if (!fabric.Object) return;

  fabric.Object.prototype.drawBorders = function (ctx: CanvasRenderingContext2D, styleOverride?: any) {
    if (this.hasBorders === false) return this;

    const strokeWidth = (styleOverride?.borderScaleFactor || this.borderScaleFactor || 1.5) / (this.canvas?.getZoom() || 1);
    const padding = (this.padding || 8) / (this.canvas?.getZoom() || 1);
    const size = this._getTransformedDimensions();

    const width = size.x + padding * 2;
    const height = size.y + padding * 2;
    const rx = Math.min(6, width / 4, height / 4);

    ctx.save();
    ctx.strokeStyle = styleOverride?.borderColor || this.borderColor || getAccentColor();
    ctx.lineWidth = strokeWidth;

    // Elevation glow shadow effect on selection bounding rectangle
    ctx.shadowColor = getAccentShadow();
    ctx.shadowBlur = 8;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-width / 2, -height / 2, width, height, rx);
    } else {
      ctx.rect(-width / 2, -height / 2, width, height);
    }
    ctx.stroke();
    ctx.restore();

    return this;
  };
}

/**
 * Configure Canvas rubberband multi-selection box visuals with semi-transparent fill and rounded corners.
 */
export function setupRubberbandSelection(canvas: fabric.Canvas) {
  // Use getters during draw time instead of statically setting canvas properties
  canvas.selectionLineWidth = 1.5;
  canvas.selectionDashArray = [];

  const customDrawSelection = function (this: any, ctx: CanvasRenderingContext2D) {
    if (!this._groupSelector) return;
    const { x, y, deltaX, deltaY } = this._groupSelector;
    
    const start = new fabric.Point(x, y).transform(this.viewportTransform);
    const extent = new fabric.Point(x + deltaX, y + deltaY).transform(this.viewportTransform);
    
    const minX = Math.min(start.x, extent.x);
    const minY = Math.min(start.y, extent.y);
    const maxX = Math.max(start.x, extent.x);
    const maxY = Math.max(start.y, extent.y);

    const width = maxX - minX;
    const height = maxY - minY;

    ctx.save();
    ctx.fillStyle = getAccentShadow();
    ctx.strokeStyle = getAccentColor();
    ctx.lineWidth = this.selectionLineWidth;

    const rx = Math.min(6, Math.abs(width) / 4, Math.abs(height) / 4);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(minX, minY, width, height, rx);
    } else {
      ctx.rect(minX, minY, width, height);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  (canvas as any)._drawSelection = customDrawSelection;
}
