import React, { useEffect, useRef, useCallback } from 'react';

interface LaserPoint {
  x: number;
  y: number;
  time: number;
  isNewStroke?: boolean;
}

interface LaserOverlayProps {
  active: boolean;
  width: number;
  height: number;
}

export const LaserOverlay: React.FC<LaserOverlayProps> = ({ active, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<LaserPoint[]>([]);
  const isMouseDownRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  const FADE_DURATION = 1200; // 1.2 seconds smooth fade

  const renderLaser = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const now = Date.now();
    pointsRef.current = pointsRef.current.filter((p) => now - p.time < FADE_DURATION);
    const points = pointsRef.current;

    if (points.length > 1) {
      // Split points into continuous stroke segments
      const strokeSegments: LaserPoint[][] = [];
      let currentSeg: LaserPoint[] = [];

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.isNewStroke && currentSeg.length > 0) {
          strokeSegments.push(currentSeg);
          currentSeg = [pt];
        } else {
          currentSeg.push(pt);
        }
      }
      if (currentSeg.length > 0) {
        strokeSegments.push(currentSeg);
      }

      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';

      strokeSegments.forEach((segment) => {
        if (segment.length < 2) return;

        if (segment.length === 2) {
          const p1 = segment[0];
          const p2 = segment[1];
          const age = now - p2.time;
          const opacity = Math.max(0, 1 - age / FADE_DURATION);
          if (opacity <= 0) return;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineWidth = 4 * opacity;
          ctx.strokeStyle = `rgba(224, 49, 49, ${opacity})`;
          ctx.stroke();
        } else {
          for (let i = 0; i < segment.length - 1; i++) {
            const p1 = segment[i];
            const p2 = segment[i + 1];

            const age = now - p2.time;
            const progress = Math.max(0, 1 - age / FADE_DURATION);
            if (progress <= 0) continue;

            const opacity = Math.pow(progress, 0.85);
            const headFactor = (i + 1) / segment.length;
            const strokeWidth = (1.5 + 4.0 * headFactor) * progress;

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.beginPath();
            if (i === 0) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(midX, midY);
            } else {
              const prevP = segment[i - 1];
              const prevMidX = (prevP.x + p1.x) / 2;
              const prevMidY = (prevP.y + p1.y) / 2;
              ctx.moveTo(prevMidX, prevMidY);
              ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }

            ctx.lineWidth = Math.max(1, strokeWidth);
            ctx.strokeStyle = `rgba(224, 49, 49, ${opacity})`;
            ctx.stroke();
          }
        }
      });
    }

    // Draw crisp Excalidraw laser head dot
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const age = now - lastPoint.time;
      if (age < 400) {
        const opacity = Math.max(0, 1 - age / FADE_DURATION);
        // Bright red outer glow
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 49, 49, ${opacity})`;
        ctx.fill();

        // Crisp white core
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
        ctx.fill();
      }
    }

    ctx.restore();

    if (points.length > 0) {
      animFrameIdRef.current = requestAnimationFrame(renderLaser);
    } else {
      animFrameIdRef.current = null;
    }
  }, [width, height]);

  // Window pointer event handlers for smooth laser tracking
  useEffect(() => {
    if (!active) {
      pointsRef.current = [];
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const addPoint = (x: number, y: number, isNewStroke = false) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const ptX = x - rect.left;
      const ptY = y - rect.top;

      const lastPt = pointsRef.current[pointsRef.current.length - 1];
      if (!isNewStroke && lastPt && !lastPt.isNewStroke) {
        const dist = Math.hypot(ptX - lastPt.x, ptY - lastPt.y);
        if (dist < 2.5) return;
      }

      pointsRef.current.push({
        x: ptX,
        y: ptY,
        time: Date.now(),
        isNewStroke,
      });
      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(renderLaser);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      isMouseDownRef.current = true;
      addPoint(e.clientX, e.clientY, true);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isMouseDownRef.current || e.buttons === 1) {
        addPoint(e.clientX, e.clientY, false);
      }
    };

    const handlePointerUp = () => {
      isMouseDownRef.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [active, renderLaser, width, height]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 cursor-crosshair pointer-events-auto"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
