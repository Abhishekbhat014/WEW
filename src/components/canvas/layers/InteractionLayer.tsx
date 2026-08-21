import React from 'react';

export interface HoverRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface InteractionLayerProps {
  hoverRect: HoverRect | null;
  width: number;
  height: number;
}

export const InteractionLayer: React.FC<InteractionLayerProps> = React.memo(() => {
  return null;
});
