import * as fabric from 'fabric';

interface Point {
  x: number;
  y: number;
}

/**
 * High-Performance, Real-World Transparent Highlighter Brush for Fabric.js
 * Delivers continuous live alpha/multiply compositing during pointermove
 * with zero visual jump upon mouse release.
 */
export class HighlighterBrush extends fabric.BaseBrush {
  public color: string = '#F59E0B';
  public width: number = 24;
  public opacity: number = 0.4;
  public decimate: number = 1;
  public layerId?: string;

  private points: Point[] = [];
  private isDrawing: boolean = false;

  constructor(canvas: fabric.Canvas) {
    super(canvas);
  }

  onMouseDown(pointer: fabric.Point) {
    this.isDrawing = true;
    this.points = [{ x: pointer.x, y: pointer.y }];

    const upperCanvas = (this.canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
    if (upperCanvas) {
      upperCanvas.style.mixBlendMode = 'multiply';
    }

    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
      this._renderInitialPoint(ctx, pointer);
    }
  }

  onMouseMove(pointer: fabric.Point) {
    if (!this.isDrawing) return;

    const last = this.points[this.points.length - 1];
    if (last) {
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      if (Math.hypot(dx, dy) < this.decimate) return;
    }

    this.points.push({ x: pointer.x, y: pointer.y });
    this._renderIncrementalSegment();
  }

  onMouseUp(): boolean {
    if (!this.isDrawing) return false;
    this.isDrawing = false;

    const upperCanvas = (this.canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
    if (upperCanvas) {
      upperCanvas.style.mixBlendMode = '';
    }

    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
    }

    if (this.points.length === 0) return false;

    const pathData = this._createPathData(this.points);
    if (!pathData) {
      this.points = [];
      return false;
    }

    const path = new fabric.Path(pathData, {
      stroke: this.color,
      strokeWidth: this.width,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      opacity: this.opacity,
      selectable: true,
      evented: true,
      layerId: this.layerId,
      globalCompositeOperation: 'multiply',
    } as any);

    (path as any).isMarker = true;
    (path as any).shapeType = 'marker';

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
    const upperCanvas = (this.canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
    if (upperCanvas) {
      upperCanvas.style.mixBlendMode = '';
    }
    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
    }
  }

  abort() {
    this.reset();
  }

  /**
   * Abstract BaseBrush method implementation
   */
  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx || this.points.length === 0) return;
    if (this.points.length === 1) {
      this._renderInitialPoint(ctx, this.points[0]);
    } else {
      this._renderIncrementalSegment();
    }
  }

  private _renderInitialPoint(ctx: CanvasRenderingContext2D, pointer: Point) {
    ctx.save();
    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.width;

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private _renderIncrementalSegment() {
    const ctx = this.canvas.contextTop;
    if (!ctx || this.points.length < 2) return;

    ctx.save();
    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.width;

    const len = this.points.length;
    if (len === 2) {
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      ctx.lineTo(this.points[1].x, this.points[1].y);
      ctx.stroke();
    } else {
      const p0 = this.points[len - 3];
      const p1 = this.points[len - 2];
      const p2 = this.points[len - 1];

      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private _createPathData(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} l 0.01 0`;
    }
    if (points.length === 2) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
    }

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    let p1 = points[0];
    let p2 = points[1];

    for (let i = 1; i < points.length - 1; i++) {
      const midX = ((p1.x + p2.x) / 2).toFixed(2);
      const midY = ((p1.y + p2.y) / 2).toFixed(2);
      d += ` Q ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${midX} ${midY}`;
      p1 = points[i];
      p2 = points[i + 1];
    }

    d += ` L ${points[points.length - 1].x.toFixed(2)} ${points[points.length - 1].y.toFixed(2)}`;
    return d;
  }
}
