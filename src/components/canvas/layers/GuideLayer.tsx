import React, { useEffect, useRef } from 'react';

export interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

interface GuideLayerProps {
  guides: GuideLine[];
  width: number;
  height: number;
}

export const GuideLayer: React.FC<GuideLayerProps> = React.memo(({
  guides,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (guides.length === 0) return;

    ctx.save();
    ctx.strokeStyle = '#ef4444'; // Red snap indicator guide
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    guides.forEach((guide) => {
      ctx.beginPath();
      if (guide.type === 'horizontal') {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(width, guide.position);
      } else {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, height);
      }
      ctx.stroke();
    });

    ctx.restore();
  }, [guides, width, height]);

  if (guides.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
});
