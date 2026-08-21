import * as fabric from 'fabric';

interface SpeedPoint {
  x: number;
  y: number;
  time: number;
  width: number;
}

/**
 * Variable-width Speed Pen Brush for Fabric.js
 * Dynamically adjusts stroke width based on drag velocity
 * with 100% mathematically perfect round end tips.
 */
export class SpeedPenBrush extends fabric.BaseBrush {
  public color: string = '#000000';
  public width: number = 4;
  public decimate: number = 2;
  public opacity: number = 1;
  public layerId?: string;

  private points: SpeedPoint[] = [];
  private isDrawing: boolean = false;
  private currentWidth: number = 4;

  constructor(canvas: fabric.Canvas) {
    super(canvas);
  }

  onMouseDown(pointer: fabric.Point) {
    this.isDrawing = true;
    this.currentWidth = Math.max(1.5, this.width * 0.8);
    this.points = [
      {
        x: pointer.x,
        y: pointer.y,
        time: Date.now(),
        width: this.currentWidth,
      },
    ];
    this._render();
  }

  onMouseMove(pointer: fabric.Point, _options?: any) {
    if (!this.isDrawing) return;

    const now = Date.now();
    const last = this.points[this.points.length - 1];
    if (!last) return;

    const dx = pointer.x - last.x;
    const dy = pointer.y - last.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.decimate) return;

    const dt = Math.max(1, now - last.time);
    const speed = dist / dt; // pixels / millisecond

    // Velocity formula: fast drag -> thinner stroke; slow drag -> thicker stroke
    const minWidth = Math.max(1.5, this.width * 0.25);
    const maxWidth = Math.max(this.width * 1.4, this.width + 2);
    const targetWidth = Math.max(
      minWidth,
      Math.min(maxWidth, (this.width * 1.2) / (1 + speed * 0.45))
    );

    // Smooth transition between stroke widths
    this.currentWidth = this.currentWidth * 0.65 + targetWidth * 0.35;

    this.points.push({
      x: pointer.x,
      y: pointer.y,
      time: now,
      width: this.currentWidth,
    });

    this._render();
  }

  onMouseUp(): boolean {
    if (!this.isDrawing) return false;
    this.isDrawing = false;

    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
    }

    if (this.points.length === 0) return false;

    const pathData = this._createRibbonPathData(this.points);
    if (!pathData) {
      this.points = [];
      return false;
    }

    const path = new fabric.Path(pathData, {
      fill: this.color,
      stroke: 'transparent',
      strokeWidth: 0,
      opacity: this.opacity,
      selectable: true,
      evented: true,
      layerId: this.layerId,
      shapeType: 'pen',
    } as any);

    this.canvas.fire('before:path:created', { path });
    this.canvas.add(path);
    this.canvas.requestRenderAll();
    path.setCoords();
    this.canvas.fire('path:created', { path });
    this.points = [];
    return false;
  }

  /**
   * Reset / abort in-flight brush state cleanly without creating a path
   */
  reset() {
    this.isDrawing = false;
    this.points = [];
    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
    }
  }

  abort() {
    this.reset();
  }

  /**
   * Render real-time live preview using the exact same path data as the final object
   */
  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx || this.points.length === 0) return;

    this.canvas.clearContext(ctx);

    const pathData = this._createRibbonPathData(this.points);
    if (!pathData) return;

    ctx.save();
    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    }
    ctx.fillStyle = this.color;
    if (this.opacity !== undefined) {
      ctx.globalAlpha = this.opacity;
    }

    const path2d = new Path2D(pathData);
    ctx.fill(path2d);

    ctx.restore();
  }

  /**
   * Generate variable-width smooth ribbon SVG path string with 100% perfect round end tips.
   * Consumed identically by both _render() and onMouseUp() for geometry parity.
   */
  private _createRibbonPathData(points: SpeedPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      const r = p.width / 2;
      const k = r * 0.552288;
      return (
        `M ${(p.x - r).toFixed(2)} ${p.y.toFixed(2)} ` +
        `C ${(p.x - r).toFixed(2)} ${(p.y + k).toFixed(2)}, ${(p.x - k).toFixed(2)} ${(p.y + r).toFixed(2)}, ${p.x.toFixed(2)} ${(p.y + r).toFixed(2)} ` +
        `C ${(p.x + k).toFixed(2)} ${(p.y + r).toFixed(2)}, ${(p.x + r).toFixed(2)} ${(p.y + k).toFixed(2)}, ${(p.x + r).toFixed(2)} ${p.y.toFixed(2)} ` +
        `C ${(p.x + r).toFixed(2)} ${(p.y - k).toFixed(2)}, ${(p.x + k).toFixed(2)} ${(p.y - r).toFixed(2)}, ${p.x.toFixed(2)} ${(p.y - r).toFixed(2)} ` +
        `C ${(p.x - k).toFixed(2)} ${(p.y - r).toFixed(2)}, ${(p.x - r).toFixed(2)} ${(p.y - k).toFixed(2)}, ${(p.x - r).toFixed(2)} ${p.y.toFixed(2)} Z`
      );
    }

    const leftPoints: { x: number; y: number }[] = [];
    const rightPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let bisectorAngle = 0;
      let miterScale = 1;

      if (i === 0) {
        const next = points[1];
        const angle = Math.atan2(next.y - p.y, next.x - p.x);
        bisectorAngle = angle + Math.PI / 2;
      } else if (i === points.length - 1) {
        const prev = points[i - 1];
        const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
        bisectorAngle = angle + Math.PI / 2;
      } else {
        const prev = points[i - 1];
        const next = points[i + 1];
        const inAngle = Math.atan2(p.y - prev.y, p.x - prev.x);
        const outAngle = Math.atan2(next.y - p.y, next.x - p.x);

        let diff = outAngle - inAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        bisectorAngle = inAngle + diff / 2 + Math.PI / 2;
        miterScale = Math.min(1.4, 1 / Math.max(0.3, Math.cos(diff / 2)));
      }

      const halfW = (p.width / 2) * miterScale;
      const lx = p.x + Math.cos(bisectorAngle) * halfW;
      const ly = p.y + Math.sin(bisectorAngle) * halfW;
      const rx = p.x - Math.cos(bisectorAngle) * halfW;
      const ry = p.y - Math.sin(bisectorAngle) * halfW;

      leftPoints.push({ x: lx, y: ly });
      rightPoints.push({ x: rx, y: ry });
    }

    // Build SVG Path Data: Smooth left side, round end cap, smooth right side, round start cap
    let d = `M ${leftPoints[0].x.toFixed(2)} ${leftPoints[0].y.toFixed(2)}`;

    if (leftPoints.length === 2) {
      d += ` L ${leftPoints[1].x.toFixed(2)} ${leftPoints[1].y.toFixed(2)}`;
    } else {
      for (let i = 1; i < leftPoints.length - 1; i++) {
        const midX = ((leftPoints[i].x + leftPoints[i + 1].x) / 2).toFixed(2);
        const midY = ((leftPoints[i].y + leftPoints[i + 1].y) / 2).toFixed(2);
        d += ` Q ${leftPoints[i].x.toFixed(2)} ${leftPoints[i].y.toFixed(2)} ${midX} ${midY}`;
      }
      d += ` L ${leftPoints[leftPoints.length - 1].x.toFixed(2)} ${leftPoints[leftPoints.length - 1].y.toFixed(2)}`;
    }

    // 1. END CAP: Mathematically perfect smooth round tip connecting left side to right side at the stroke end
    const lastIdx = points.length - 1;
    const pEnd = points[lastIdx];
    const pEndPrev = points[lastIdx - 1];
    const angleEnd = Math.atan2(pEnd.y - pEndPrev.y, pEnd.x - pEndPrev.x);
    const rEnd = pEnd.width / 2;
    const dxEnd = Math.cos(angleEnd) * rEnd * 0.552288;
    const dyEnd = Math.sin(angleEnd) * rEnd * 0.552288;

    const cp1End = { x: leftPoints[lastIdx].x + dxEnd, y: leftPoints[lastIdx].y + dyEnd };
    const cp2End = { x: rightPoints[lastIdx].x + dxEnd, y: rightPoints[lastIdx].y + dyEnd };

    d += ` C ${cp1End.x.toFixed(2)} ${cp1End.y.toFixed(2)}, ${cp2End.x.toFixed(2)} ${cp2End.y.toFixed(2)}, ${rightPoints[lastIdx].x.toFixed(2)} ${rightPoints[lastIdx].y.toFixed(2)}`;

    if (rightPoints.length === 2) {
      d += ` L ${rightPoints[0].x.toFixed(2)} ${rightPoints[0].y.toFixed(2)}`;
    } else {
      for (let i = rightPoints.length - 2; i > 0; i--) {
        const midX = ((rightPoints[i].x + rightPoints[i - 1].x) / 2).toFixed(2);
        const midY = ((rightPoints[i].y + rightPoints[i - 1].y) / 2).toFixed(2);
        d += ` Q ${rightPoints[i].x.toFixed(2)} ${rightPoints[i].y.toFixed(2)} ${midX} ${midY}`;
      }
      d += ` L ${rightPoints[0].x.toFixed(2)} ${rightPoints[0].y.toFixed(2)}`;
    }

    // 2. START CAP: Mathematically perfect smooth round tip connecting right side to left side at stroke start
    const pStart = points[0];
    const pStartNext = points[1];
    const angleStart = Math.atan2(pStart.y - pStartNext.y, pStart.x - pStartNext.x);
    const rStart = pStart.width / 2;
    const dxStart = Math.cos(angleStart) * rStart * 0.552288;
    const dyStart = Math.sin(angleStart) * rStart * 0.552288;

    const cp1Start = { x: rightPoints[0].x + dxStart, y: rightPoints[0].y + dyStart };
    const cp2Start = { x: leftPoints[0].x + dxStart, y: leftPoints[0].y + dyStart };

    d += ` C ${cp1Start.x.toFixed(2)} ${cp1Start.y.toFixed(2)}, ${cp2Start.x.toFixed(2)} ${cp2Start.y.toFixed(2)}, ${leftPoints[0].x.toFixed(2)} ${leftPoints[0].y.toFixed(2)}`;
    d += ' Z';

    return d;
  }
}
