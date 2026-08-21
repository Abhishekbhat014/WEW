import React, { useEffect, useRef, useImperativeHandle } from 'react';
import type { GridConfig } from '../../types/canvas';
import { useTheme } from '../../hooks/useTheme';

interface GridOverlayProps {
  grid: GridConfig;
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

export interface GridOverlayRef {
  updateViewport: (zoom: number, panX: number, panY: number) => void;
}

export const GridOverlay = React.forwardRef<GridOverlayRef, GridOverlayProps>(({
  grid,
  zoom: initialZoom,
  panX: initialPanX,
  panY: initialPanY,
  width,
  height,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  const viewportRef = useRef({ zoom: initialZoom, panX: initialPanX, panY: initialPanY });

  const renderGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { zoom, panX, panY } = viewportRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Resize canvas buffer ONLY if dimensions actually change (prevents GPU texture reset on every pan frame)
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!grid.enabled) {
      ctx.restore();
      return;
    }

    const step = Math.max(4, (grid.size || 20) * zoom);

    const offsetX = ((panX % step) + step) % step;
    const offsetY = ((panY % step) + step) % step;

    const type = grid.type || 'graph';
    const isDark = resolvedTheme === 'dark';

    const computedColor = getComputedStyle(document.documentElement).getPropertyValue('--canvas-grid').trim();
    const defaultGridColor = computedColor || (isDark ? 'rgba(255, 255, 255, 0.14)' : '#e5e5e5');
    const color = grid.color || defaultGridColor;

    if (type === 'blank') {
      // Blank canvas style (no grid dots or lines drawn)
    } else if (type === 'lines') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = isDark ? 0.9 : 1;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, height);
      }
      for (let y = offsetY; y < height; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
      }
      ctx.stroke();
    } else if (type === 'graph') {
      // Graph paper: thin secondary grid + heavier primary lines every 5 cells
      const majorEvery = 5;

      // Secondary (thin) lines
      ctx.strokeStyle = color;
      ctx.globalAlpha = isDark ? 0.6 : 0.45;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, height);
      }
      for (let y = offsetY; y < height; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
      }
      ctx.stroke();

      // Primary (heavier) lines every majorEvery cells
      const majorStep = step * majorEvery;
      const majorOffsetX = ((panX % majorStep) + majorStep) % majorStep;
      const majorOffsetY = ((panY % majorStep) + majorStep) % majorStep;

      ctx.strokeStyle = color;
      ctx.globalAlpha = isDark ? 0.95 : 0.8;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = majorOffsetX; x < width; x += majorStep) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, height);
      }
      for (let y = majorOffsetY; y < height; y += majorStep) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
      }
      ctx.stroke();
    } else {
      // Default: 'dots'
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      const dotRadius = isDark
        ? Math.max(1.0, Math.min(1.8, 1.1 * zoom))
        : Math.max(1.0, Math.min(2.0, 1.2 * zoom));
      for (let x = offsetX; x < width; x += step) {
        for (let y = offsetY; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  useImperativeHandle(ref, () => ({
    updateViewport: (z: number, px: number, py: number) => {
      viewportRef.current = { zoom: z, panX: px, panY: py };
      renderGrid();
    }
  }));

  useEffect(() => {
    // Sync when grid settings, canvas dimensions, or theme mode changes
    renderGrid();
  }, [grid, width, height, resolvedTheme]);

  if (!grid.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 bg-canvas-background transition-colors"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
});

GridOverlay.displayName = 'GridOverlay';
