import React from 'react';
import type { GridConfig } from '../../../types/canvas';
import { GridOverlay } from '../GridOverlay';
import type { GridOverlayRef } from '../GridOverlay';

interface GridLayerProps {
  grid: GridConfig;
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
  gridOverlayRef?: React.RefObject<GridOverlayRef | null>;
}

export const GridLayer: React.FC<GridLayerProps> = React.memo(({
  grid,
  zoom,
  panX,
  panY,
  width,
  height,
  gridOverlayRef,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 bg-canvas-background">
      <GridOverlay
        ref={gridOverlayRef}
        grid={grid}
        zoom={zoom}
        panX={panX}
        panY={panY}
        width={width}
        height={height}
      />
    </div>
  );
});
