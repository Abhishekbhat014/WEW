import React from 'react';
import type * as fabric from 'fabric';
import { LaserOverlay } from '../LaserOverlay';
import { RotationBadge } from '../RotationBadge';

import { Wand2 } from 'lucide-react';
import type { RecognitionResult } from '../../../utils/shapeRecognizer';

interface EffectsLayerProps {
  isLaserActive: boolean;
  rotationBadge: { angle: number | null; position: { x: number; y: number } | null };
  shapeSuggestion: { path: fabric.Path; recognition: RecognitionResult } | null;
  canvasSize: { width: number; height: number };
  onAcceptShapeSuggestion: () => void;
  onRejectShapeSuggestion: () => void;
}

export const EffectsLayer: React.FC<EffectsLayerProps> = React.memo(({
  isLaserActive,
  rotationBadge,
  shapeSuggestion,
  canvasSize,
  onAcceptShapeSuggestion,
  onRejectShapeSuggestion,
}) => {
  return (
    <>
      {/* Laser Trail Overlay */}
      <LaserOverlay
        active={isLaserActive}
        width={canvasSize.width}
        height={canvasSize.height}
      />

      {/* Floating Rotation Angle Badge */}
      <RotationBadge
        angle={rotationBadge.angle}
        position={rotationBadge.position}
      />

      {/* Draw-to-Shape Conversion Suggestion Popover */}
      {shapeSuggestion && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-2xl border border-neutral-200 text-xs font-semibold text-neutral-800 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 select-none">
          <Wand2 className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>Convert to {shapeSuggestion.recognition.shapeType}?</span>
          <button
            onClick={onAcceptShapeSuggestion}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
          >
            Apply
          </button>
          <button
            onClick={onRejectShapeSuggestion}
            className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
});

EffectsLayer.displayName = 'EffectsLayer';
